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
  confidenceScore: number;
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

export interface Conversation {
  id: string | number;
  message_count: number;
  title?: string;
}

export interface Stats {
  storage_used_gb: number;
  storage_total_gb: number;
  tokens_used: number;
  tokens_total: number;
}
