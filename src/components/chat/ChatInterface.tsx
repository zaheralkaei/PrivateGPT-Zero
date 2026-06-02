import React, { useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Cpu, HardDrive, Clock, Zap, ArrowDown, ImagePlus, FileText, Info, X, AlertTriangle } from 'lucide-react';
import { MessageBubble, StreamingMessage } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { useChatStore } from '@/stores/chat-store';
import { useModelStore } from '@/stores/model-store';
import { AVAILABLE_MODELS } from '@/lib/llm-engine';
import { estimateTokens } from '@/lib/rag';
import { Badge, Button } from '@/components/common/ui';
import { useBenchmarkStore } from '@/stores/benchmark-store';
import type { Conversation, Message, UploadedFile } from '@/types';
import { llmEngine } from '@/lib/llm-engine';
import { parseFile, isImageFile, isVisionModel, chunkText, searchChunks, buildRAGPrompt, MAX_DOCUMENT_CHARS } from '@/lib/rag';
import { saveFile } from '@/lib/db';

interface ChatInterfaceProps {
  onNewChat: () => void;
  sidebarOpen: boolean;
  onOpenSettings: () => void;
}

export function ChatInterface({ onNewChat, sidebarOpen, onOpenSettings }: ChatInterfaceProps) {
  const {
    conversations,
    activeConversationId,
    addMessage,
    addDocumentContext,
    isGenerating,
    streamingContent,
    setGenerating,
    updateStreamingContent,
    createConversation,
    settings,
    importConversation,
  } = useChatStore();

  const { loadState, selectedModel } = useModelStore();
  const { stats, showPanel } = useBenchmarkStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = React.useState(false);
  const [contextWarning, setContextWarning] = React.useState<'none' | 'near' | 'full'>('none');
  const abortRef = useRef<boolean>(false);
  const [modelMismatchDismissed, setModelMismatchDismissed] = React.useState(false);

  // Reset context warning and model mismatch when switching conversations
  React.useEffect(() => {
    setContextWarning('none');
    setModelMismatchDismissed(false);
  }, [activeConversationId]);

  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const messages = activeConversation?.messages || [];

  // Check if the conversation's original model is different from the loaded model
  const convOriginalModel = activeConversation?.model;
  const convOriginalModelInfo = convOriginalModel ? AVAILABLE_MODELS.find((m) => m.id === convOriginalModel) : null;
  const hasMessages = activeConversation && activeConversation.messages.length > 0;
  const modelMismatch = !!(activeConversation && hasMessages && convOriginalModel && loadState.status === 'ready' &&
    selectedModel !== convOriginalModel && !modelMismatchDismissed);

  // Check if current model supports vision
  const currentModelInfo = AVAILABLE_MODELS.find((m) => m.id === selectedModel);
  const hasVisionSupport = currentModelInfo?.vision === true;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Track whether user is near the bottom — only auto-scroll if they are
  const isNearBottomRef = useRef(true);

  useEffect(() => {
    // Only auto-scroll when new content arrives if user is near the bottom
    if (isNearBottomRef.current) {
      scrollToBottom();
    }
  }, [streamingContent, messages.length]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const nearBottom = scrollHeight - scrollTop - clientHeight <= 80;
      setShowScrollButton(!nearBottom);
      isNearBottomRef.current = nearBottom;
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSend = useCallback(async (content: string, imageData?: { dataUrl: string; mimeType: string }) => {
    let convId = activeConversationId;
    if (!convId) {
      convId = createConversation();
    }

    // Build user message content
    let messageContent = content;
    let msgImageData: string | undefined;
    if (imageData && hasVisionSupport) {
      msgImageData = imageData.dataUrl;
    } else if (imageData && !hasVisionSupport) {
      messageContent = content + '\n\n[Image attached — switch to a vision model to analyze images]';
    }

    await addMessage(messageContent, 'user', selectedModel, msgImageData);

    // When user sends a message, snap to bottom and enable auto-scroll
    isNearBottomRef.current = true;
    scrollToBottom();

    // Generate response
    setGenerating(true);
    abortRef.current = false;
    updateStreamingContent('');

    const startTime = performance.now();
    let fullResponse = '';
    let tokenCount = 0;

    try {
      const conv = useChatStore.getState().conversations.find((c) => c.id === convId);

      // Build document context block from all uploaded documents in this conversation
      const docContexts = conv?.documentContexts || [];
      let documentContextBlock = '';
      if (docContexts.length > 0) {
        const docParts = docContexts.map((doc) =>
          `--- BEGIN DOCUMENT: ${doc.fileName} ---\n${doc.content}\n--- END DOCUMENT: ${doc.fileName} ---`
        );
        documentContextBlock =
          `The user has uploaded the following document(s). Use them as context to answer their questions. If the answer is not found in the documents, say so honestly.\n\n${docParts.join('\n\n')}`;
      }

      // Build the single system message — WebLLM requires exactly ONE system message at the start
      const systemParts: string[] = [];
      if (settings.systemPrompt) systemParts.push(settings.systemPrompt);
      if (documentContextBlock) systemParts.push(documentContextBlock);
      const systemContent = systemParts.join('\n\n');

      const chatMessages = [
        // Single merged system message (required: must be the first message)
        ...(systemContent ? [{ role: 'system' as const, content: systemContent }] : []),
        ...(conv?.messages || []).filter((m) => m.role !== 'system').map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
          ...(m.imageData && hasVisionSupport ? { imageUrl: m.imageData } : {}),
        })),
      ];

      // Estimate token usage and warn if context window is filling up
      const currentModelInfo = AVAILABLE_MODELS.find((m) => m.id === selectedModel);
      const contextWindow = currentModelInfo?.contextWindow || 4096;
      const totalText = chatMessages.map((m) => m.content).join('');
      const estimatedTokens = estimateTokens(totalText);
      const usagePercent = estimatedTokens / contextWindow;

      if (usagePercent >= 1.0) {
        setContextWarning('full');
        setGenerating(false);
        await addMessage(
          `⚠️ **Context window full!** This conversation has reached the ${contextWindow}-token limit (${Math.round(usagePercent * 100)}% used). The model cannot process more messages.\n\nPlease **start a new chat** to continue. You can export this conversation first if you want to keep it.`,
          'assistant',
          selectedModel,
        );
        return;
      } else if (usagePercent >= 0.8) {
        setContextWarning('near');
      } else {
        setContextWarning('none');
      }

      if (settings.streamOutput) {
        const benchmarkStore = useBenchmarkStore.getState();
        benchmarkStore.startGeneration();

        for await (const token of llmEngine.generateStream(chatMessages, {
          temperature: settings.temperature,
          max_tokens: settings.maxTokens,
          top_p: settings.topP,
        })) {
          if (abortRef.current) break;
          fullResponse += token;
          tokenCount++;
          updateStreamingContent(fullResponse);
          benchmarkStore.recordToken();
        }
      } else {
        fullResponse = await llmEngine.generate(chatMessages, {
          temperature: settings.temperature,
          max_tokens: settings.maxTokens,
          top_p: settings.topP,
        });
        tokenCount = fullResponse.split(/\s+/).length;
        updateStreamingContent('');
      }

      const endTime = performance.now();
      const durationMs = endTime - startTime;

      await addMessage(fullResponse, 'assistant', selectedModel);
      useBenchmarkStore.getState().endGeneration(tokenCount, durationMs);
    } catch (err) {
      if (!abortRef.current) {
        const errorMsg = err instanceof Error ? err.message : 'Generation failed';
        await addMessage(`⚠️ Error: ${errorMsg}`, 'assistant', selectedModel);
      }
    } finally {
      setGenerating(false);
      updateStreamingContent('');
    }
  }, [activeConversationId, selectedModel, settings, hasVisionSupport, addMessage, setGenerating, updateStreamingContent, createConversation]);

  const handleStop = () => {
    abortRef.current = true;
    llmEngine.abort();
    setGenerating(false);
  };

  /** Helper: describe text size in words or lines */
  const charOrWordCount = (text: string) => {
    const words = text.split(/\s+/).filter(Boolean).length;
    if (words > 1000) return words.toLocaleString() + ' words';
    return words + ' words';
  };

  const handleFileUpload = async (files: FileList) => {
    let convId = activeConversationId;
    if (!convId) {
      convId = createConversation();
    }

    for (const file of Array.from(files)) {
      try {
        const { text, imageData } = await parseFile(file);

        // If it's an image and we have vision support, attach the image to the message
        if (imageData && hasVisionSupport) {
          await addMessage(
            '📎 Uploaded image: **' + file.name + '** (' + (file.size / 1024).toFixed(1) + ' KB)\n\nWhat do you see in this image?',
            'user',
            selectedModel,
            imageData.dataUrl,
          );
        } else if (isImageFile(file) && !hasVisionSupport) {
          await addMessage(
            '📎 Uploaded image: **' + file.name + '** — switch to a vision model to analyze images.',
            'user',
            selectedModel,
          );
        } else {
          // Text document — validate size
          if (text.length > MAX_DOCUMENT_CHARS) {
            const charCount = text.length;
            const tokenEst = estimateTokens(text);
            await addMessage(
              '⚠️ **Document too large: ' + file.name + '**\n\n' +
              'Extracted text: **' + charCount.toLocaleString() + ' characters** (~' + tokenEst.toLocaleString() + ' tokens)\n\n' +
              'Browser LLMs have small context windows (~4K–8K tokens). This document exceeds the **' +
              MAX_DOCUMENT_CHARS.toLocaleString() + ' character** limit (~' + estimateTokens('x'.repeat(MAX_DOCUMENT_CHARS)).toLocaleString() + ' tokens).\n\n' +
              '**Suggestions:**\n' +
              '- Upload a shorter document or extract specific pages\n' +
              '- Split the document into smaller parts\n' +
              '- Copy and paste only the relevant section directly into the chat',
              'assistant',
              selectedModel,
            );
            continue;
          }

          // Store the FULL document text in the conversation's documentContexts
          // so the model can access it when answering questions
          addDocumentContext(file.name, text);

          // Also save to IndexedDB for RAG / persistence
          const uploadedFile: UploadedFile = {
            id: crypto.randomUUID(),
            name: file.name,
            type: file.type,
            size: file.size,
            content: text,
            uploadedAt: Date.now(),
            imagePreview: imageData?.dataUrl,
          };
          await saveFile(uploadedFile);

          // Show a user message confirming the upload and a summary
          const tokenEst = estimateTokens(text);
          await addMessage(
            '📎 Uploaded: **' + file.name + '** (' + (file.size / 1024).toFixed(1) + ' KB, ' +
            charOrWordCount(text) + ', ~' + tokenEst.toLocaleString() + ' tokens)\n\n' +
            'The full document has been loaded as context. Ask me anything about it!',
            'user',
            selectedModel,
          );
        }
      } catch (err) {
        await addMessage(
          '⚠️ Failed to process file **' + file.name + '**: ' + (err instanceof Error ? err.message : 'Unknown error'),
          'user',
          selectedModel,
        );
      }
    }
  };

  const handleRegenerate = async () => {
    if (!activeConversation || messages.length < 2) return;
    // Remove the last assistant message before regenerating
    const lastAssistantIdx = [...messages].reverse().findIndex((m) => m.role === 'assistant');
    if (lastAssistantIdx !== -1) {
      const msgToRemove = messages[messages.length - 1 - lastAssistantIdx];
      if (msgToRemove) {
        useChatStore.getState().removeMessage(msgToRemove.id);
      }
    }
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUserMsg) {
      await handleSend(lastUserMsg.content);
    }
  };

  const handleSuggestionClick = (prompt: string) => {
    if (loadState.status === 'ready') {
      handleSend(prompt);
    }
  };

  return (
    <div className="flex flex-col min-h-0 flex-1">
      {/* Benchmark bar */}
      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-border bg-muted/50 px-4 py-2 flex flex-wrap items-center gap-2 sm:gap-4 text-xs"
          >
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-yellow-500" />
              {stats.tokensPerSecond.toFixed(1)} tok/s
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-blue-500" />
              TTFT: {stats.timeToFirstToken}ms
            </span>
            <span className="flex items-center gap-1">
              <Cpu className="h-3 w-3 text-green-500" />
              {stats.totalTokens} tokens
            </span>
            <span className="flex items-center gap-1">
              <HardDrive className="h-3 w-3 text-purple-500" />
              {(stats.totalTimeMs / 1000).toFixed(1)}s total
            </span>
            {currentModelInfo?.vision && (
              <Badge variant="success" className="text-[10px] py-0">
                🔍 Vision model
              </Badge>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Context window usage indicator */}
      {loadState.status === 'ready' && activeConversation && (() => {
        const ctxWindow = (AVAILABLE_MODELS.find(m => m.id === selectedModel)?.contextWindow) || 4096;
        const totalText = [
          settings.systemPrompt || '',
          ...(activeConversation.documentContexts || []).map(d => d.content),
          ...activeConversation.messages.map(m => m.content),
        ].join('\n');
        const usedTokens = estimateTokens(totalText);
        const pct = Math.min(100, Math.round((usedTokens / ctxWindow) * 100));
        const pctColor = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-green-500';
        const pctLabel = pct >= 100 ? 'full' : pct >= 80 ? 'near limit' : 'ok';
        return (
          <div className="border-b border-border bg-muted/30 px-4 py-1.5 flex items-center gap-2 text-[10px] text-muted-foreground">
            <Cpu className="h-3 w-3 shrink-0" />
            <span className="whitespace-nowrap">Context: {usedTokens.toLocaleString()} / {ctxWindow.toLocaleString()} tokens</span>
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden min-w-[60px]">
              <div className={`h-full rounded-full transition-all duration-300 ${pctColor}`} style={{ width: `${pct}%` }} />
            </div>
            <span className={`font-medium ${pct >= 80 ? (pct >= 100 ? 'text-red-500' : 'text-amber-500') : 'text-green-600 dark:text-green-400'}`}>{pct}% {pctLabel}</span>
          </div>
        );
      })()}

      {/* Model mismatch banner */}
      <AnimatePresence>
        {modelMismatch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-border bg-blue-500/10 px-4 py-2 flex items-center gap-2 text-xs"
          >
            <Info className="h-3.5 w-3.5 text-blue-500 shrink-0" />
            <span className="flex-1">
              This chat originally used <strong>{convOriginalModelInfo?.name || convOriginalModel}</strong>.
              Continuing with <strong>{currentModelInfo?.name || selectedModel}</strong> — 
              the full conversation history is still available as context.
            </span>
            <button 
              onClick={() => setModelMismatchDismissed(true)}
              className="shrink-0 h-11 w-11 sm:h-7 sm:w-7 flex items-center justify-center rounded hover:bg-blue-500/20 active:bg-blue-500/20"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Context window warning */}
      <AnimatePresence>
        {contextWarning === 'near' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-start gap-2 px-3 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="font-semibold">Context window filling up</span> — This conversation is approaching the model's token limit. Consider starting a new chat for better responses.
              </div>
              <button onClick={() => setContextWarning('none')} className="shrink-0 p-2 sm:p-0.5 hover:bg-amber-500/20 active:bg-amber-500/20 rounded min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        {!activeConversation || messages.length === 0 ? (
          <EmptyState
            modelReady={loadState.status === 'ready'}
            onNewChat={onNewChat}
            onSuggestion={handleSuggestionClick}
            loadState={loadState}
            hasVisionSupport={hasVisionSupport}
            onOpenSettings={onOpenSettings}
          />
        ) : (
          <div className="max-w-3xl mx-auto py-4 px-2 sm:px-4">
            {messages.map((msg, i) => (
              <div key={msg.id} className="group">
                <MessageBubble
                  message={msg}
                  onRegenerate={
                    msg.role === 'assistant' && i === messages.length - 1 ? handleRegenerate : undefined
                  }
                />
              </div>
            ))}

            {isGenerating && streamingContent && (
              <StreamingMessage content={streamingContent} />
            )}

            {isGenerating && !streamingContent && (
              <div className="flex gap-3 px-4 py-3 bg-muted/30">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse-dot" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse-dot" style={{ animationDelay: '200ms' }} />
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse-dot" style={{ animationDelay: '400ms' }} />
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}

        {showScrollButton && (
          <button
            onClick={() => { isNearBottomRef.current = true; scrollToBottom(); }}
            className="fixed bottom-28 sm:bottom-24 right-3 sm:right-8 z-10 rounded-full bg-primary text-primary-foreground shadow-lg p-3.5 sm:p-2 hover:bg-primary/90 active:bg-primary/80 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <ArrowDown className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Input area */}
      <ChatInput
        onSend={handleSend}
        onStop={handleStop}
        onFileUpload={handleFileUpload}
        isGenerating={isGenerating}
        hasVisionSupport={hasVisionSupport}
      />
    </div>
  );
}

function EmptyState({
  modelReady,
  onNewChat,
  onSuggestion,
  loadState,
  hasVisionSupport,
  onOpenSettings,
}: {
  modelReady: boolean;
  onNewChat: () => void;
  onSuggestion: (p: string) => void;
  loadState: { status: string; progress: number; progressText: string; error?: string };
  hasVisionSupport: boolean;
  onOpenSettings: () => void;
}) {
  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
      <div className="text-center max-w-lg">
        <div className="text-6xl mb-6">🛡️</div>
        <h2 className="text-2xl font-bold mb-2">Welcome to PrivateGPT Zero</h2>
        <p className="text-muted-foreground mb-6">
          A private ChatGPT alternative that runs entirely in your browser.
          Your conversations never leave your device.
        </p>

        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {[
            { icon: '✅', text: 'Model runs locally', ok: true },
            { icon: '🌐', text: 'Internet for download only', ok: true },
            { icon: '🔒', text: 'No data sent to servers', ok: true },
            { icon: '👤', text: 'No account required', ok: true },
          ].map((item, i) => (
            <Badge
              key={i}
              variant="success"
              className="text-xs py-1 px-2"
            >
              {item.icon} {item.text}
            </Badge>
          ))}
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-4 text-xs text-amber-600 dark:text-amber-400">
          ⚠️ AI can make mistakes. Verify important information independently. Use AI responsibly.
        </div>

        <div className="bg-muted/50 border border-border rounded-lg p-3 mb-4 text-xs text-muted-foreground">
          📌 Bookmark this website! After your first visit and model download, the app works offline — no server needed.
        </div>

        {hasVisionSupport && (
          <Badge variant="secondary" className="mb-4 text-xs py-1 px-3">
            <ImagePlus className="h-3 w-3 mr-1" /> Vision model active — upload images for analysis
          </Badge>
        )}

        {loadState.status === 'loading' && (
          <div className="mb-4">
            <div className="w-full bg-muted rounded-full h-2 mb-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${loadState.progress * 100}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">{loadState.progressText}</p>
          </div>
        )}

        {loadState.status === 'error' && (
          <div className="mb-4 text-sm text-destructive bg-destructive/10 rounded-md p-3">
            {loadState.error}
          </div>
        )}

        {!modelReady && loadState.status !== 'loading' && (
          <button
            onClick={onOpenSettings}
            className="w-full bg-muted/50 border border-border rounded-lg p-4 text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors cursor-pointer text-left"
          >
            Open Settings <strong>(Ctrl+,)</strong> to select and load a model. The model will be downloaded and cached in your browser.
          </button>
        )}

        {modelReady && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Model ready! Try asking:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                'Explain quantum computing in simple terms',
                'Write a Python function to sort a list',
                'What are the benefits of running AI locally?',
                'Help me brainstorm startup ideas',
                hasVisionSupport ? '🔍 Upload an image for analysis' : 'Summarize any uploaded document',
              ].map((prompt) => (
                <button
                  key={prompt}
                  className="text-left text-sm p-3 min-h-[44px] rounded-lg border border-border hover:bg-accent/50 transition-colors"
                  onClick={() => onSuggestion(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}