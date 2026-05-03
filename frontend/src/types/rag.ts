export interface RetrievalMetadata {
  latencyMs: number;
  tokensUsed?: number;
  model: string;
}

export interface Source {
  id: string;
  title: string;
  snippet: string;
  url?: string;
  confidenceScore: number; // e.g., 0.98 for "98% Match"
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  sources?: Source[];
  metadata?: RetrievalMetadata;
}

export interface ChatState {
  messages: Message[];
  isGenerating: boolean;
  currentModel: string;
  error: string | null;
}
