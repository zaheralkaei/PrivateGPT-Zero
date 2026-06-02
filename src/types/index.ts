export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  model?: string;
  tokens?: number;
  durationMs?: number;
  /** Base64-encoded image data for vision messages */
  imageData?: string;
  /** MIME type of attached image */
  imageMimeType?: string;
  /** Attached file references */
  attachedFileIds?: string[];
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  model: string;
  systemPrompt: string;
  /** Full text of uploaded documents, stored so the model can access them as context */
  documentContexts?: { fileName: string; content: string; uploadedAt: number }[];
}

export interface ModelInfo {
  id: string;
  name: string;
  size: string;
  description: string;
  quantization: string;
  estimatedRAM: string;
  contextWindow?: number;
  webGPUOnly: boolean;
  vision?: boolean;
}

export interface ModelLoadState {
  status: 'idle' | 'loading' | 'ready' | 'error' | 'generating';
  progress: number;
  progressText: string;
  error?: string;
}

export interface BenchmarkStats {
  tokensPerSecond: number;
  timeToFirstToken: number;
  totalTokens: number;
  totalTimeMs: number;
  memoryUsage: number;
  modelSize: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  content: string;
  uploadedAt: number;
  /** For images: base64 data URL preview */
  imagePreview?: string;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  defaultModel: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  streamOutput: boolean;
  persistChat: boolean;
  showBenchmark: boolean;
}

/** Document chunk for RAG */
export interface DocumentChunk {
  id: string;
  content: string;
  source: string;
  metadata: Record<string, string>;
}

/** Prompt template presets */
export interface PromptTemplate {
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  prompt: string;
}