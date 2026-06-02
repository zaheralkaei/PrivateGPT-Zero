import { create } from 'zustand';
import type { Conversation, Message, AppSettings } from '@/types';
import { generateId, getConversationTitle } from '@/lib/utils';
import { saveConversation, deleteConversation as dbDeleteConv, getAllConversations, clearAllConversations as dbClearAll, saveSettings, getSettings } from '@/lib/db';

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  defaultModel: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
  systemPrompt: 'You are PrivateGPT Zero, a helpful AI assistant that runs entirely in the user\'s browser. No data is sent to any server. Be concise, accurate, and helpful.',
  temperature: 0.7,
  maxTokens: 2048,
  topP: 0.95,
  streamOutput: true,
  persistChat: true,
  showBenchmark: false,
};

interface ChatStore {
  conversations: Conversation[];
  activeConversationId: string | null;
  settings: AppSettings;
  isGenerating: boolean;
  streamingContent: string;

  // Conversation actions
  createConversation: () => string;
  deleteConversation: (id: string) => Promise<void>;
  clearAllConversations: () => Promise<void>;
  setActiveConversation: (id: string | null) => void;
  addMessage: (content: string, role: 'user' | 'assistant', model?: string, imageData?: string) => Promise<void>;
  removeMessage: (messageId: string) => void;
  updateStreamingContent: (content: string) => void;
  setGenerating: (generating: boolean) => void;
  loadConversations: () => Promise<void>;
  importConversation: (data: any) => Promise<void>;
  addDocumentContext: (fileName: string, content: string) => void;

  // Settings
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;
  loadSettings: () => Promise<void>;

  // Computed
  getActiveConversation: () => Conversation | undefined;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  settings: DEFAULT_SETTINGS,
  isGenerating: false,
  streamingContent: '',

  createConversation: () => {
    const id = generateId();
    const conversation: Conversation = {
      id,
      title: 'New Chat',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      model: get().settings.defaultModel,
      systemPrompt: get().settings.systemPrompt,
    };
    set((state) => ({
      conversations: [conversation, ...state.conversations],
      activeConversationId: id,
    }));
    // Persist outside the set callback
    saveConversation(conversation).catch((err) =>
      console.error('Failed to save conversation:', err),
    );
    return id;
  },

  deleteConversation: async (id) => {
    await dbDeleteConv(id);
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      activeConversationId: state.activeConversationId === id ? null : state.activeConversationId,
    }));
  },

  clearAllConversations: async () => {
    await dbClearAll();
    set({ conversations: [], activeConversationId: null });
  },

  setActiveConversation: (id) => set({ activeConversationId: id }),

  addMessage: async (content, role, model, imageData) => {
    const { activeConversationId, conversations } = get();
    if (!activeConversationId) return;

    const message: Message = {
      id: generateId(),
      role,
      content,
      timestamp: Date.now(),
      model,
      ...(imageData ? { imageData } : {}),
    };

    let updatedConv: Conversation | null = null;
    set((state) => ({
      conversations: state.conversations.map((conv) => {
        if (conv.id !== activeConversationId) return conv;
        updatedConv = {
          ...conv,
          messages: [...conv.messages, message],
          // Update conversation model when user sends a message with a different model loaded
          model: role === 'user' && model ? model : conv.model,
          title: conv.messages.length === 0 ? getConversationTitle([{ role, content }]) : conv.title,
          updatedAt: Date.now(),
        };
        return updatedConv;
      }),
    }));
    // Persist outside the set callback
    if (updatedConv) {
      try {
        await saveConversation(updatedConv);
      } catch (err) {
        console.error('Failed to save conversation:', err);
      }
    }
  },

  removeMessage: (messageId) => {
    const { activeConversationId } = get();
    if (!activeConversationId) return;

    let updatedConv: Conversation | null = null;
    set((state) => ({
      conversations: state.conversations.map((conv) => {
        if (conv.id !== activeConversationId) return conv;
        const filtered = conv.messages.filter((m) => m.id !== messageId);
        if (filtered.length === conv.messages.length) return conv; // not found
        updatedConv = {
          ...conv,
          messages: filtered,
          updatedAt: Date.now(),
        };
        return updatedConv;
      }),
    }));
    if (updatedConv) {
      saveConversation(updatedConv).catch((err) =>
        console.error('Failed to save conversation:', err),
      );
    }
  },

  addDocumentContext: (fileName: string, content: string) => {
    const { activeConversationId } = get();
    if (!activeConversationId) return;

    let updatedConv: Conversation | null = null;
    set((state) => ({
      conversations: state.conversations.map((conv) => {
        if (conv.id !== activeConversationId) return conv;
        const existing = conv.documentContexts || [];
        updatedConv = {
          ...conv,
          documentContexts: [...existing, { fileName, content, uploadedAt: Date.now() }],
          updatedAt: Date.now(),
        };
        return updatedConv;
      }),
    }));
    if (updatedConv) {
      saveConversation(updatedConv).catch((err) =>
        console.error('Failed to save conversation:', err),
      );
    }
  },

  updateStreamingContent: (content) => set({ streamingContent: content }),

  setGenerating: (generating) => {
    if (!generating) {
      set({ streamingContent: '' });
    }
    set({ isGenerating: generating });
  },

  loadConversations: async () => {
    const conversations = await getAllConversations();
    set({ conversations });
  },

  importConversation: async (data) => {
    const conversation: Conversation = {
      id: data.id || generateId(),
      title: data.title || 'Imported Chat',
      messages: (data.messages || [])
        .filter((m: any) => m.role !== 'system')
        .map((m: any) => ({
        id: m.id || generateId(),
        role: m.role || 'user',
        content: m.content || '',
        timestamp: m.timestamp || Date.now(),
        model: m.model,
        imageData: m.imageData,
      })),
      createdAt: data.createdAt || Date.now(),
      updatedAt: Date.now(),
      model: data.model || '',
      systemPrompt: data.systemPrompt || '',
    };
    await saveConversation(conversation);
    set((state) => ({
      conversations: [conversation, ...state.conversations],
      activeConversationId: conversation.id,
    }));
  },

  updateSettings: async (partial) => {
    const newSettings = { ...get().settings, ...partial };
    set({ settings: newSettings });
    // Persist outside the set callback so it doesn't run twice under StrictMode
    try {
      await saveSettings(newSettings);
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  },

  loadSettings: async () => {
    const settings = await getSettings();
    if (settings) {
      set({ settings: { ...DEFAULT_SETTINGS, ...settings } });
    }
  },

  getActiveConversation: () => {
    const { conversations, activeConversationId } = get();
    return conversations.find((c) => c.id === activeConversationId);
  },
}));