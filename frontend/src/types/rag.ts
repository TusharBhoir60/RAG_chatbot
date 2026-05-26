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

/** Ollama model id sent to POST /api/v1/chat */
export interface ChatModelOption {
  label: string;
  value: string;
}

export const CHAT_MODELS: ChatModelOption[] = [
  { label: 'Llama 3', value: 'llama3:latest' },
  { label: 'Llama 3 (tag: llama3)', value: 'llama3' },
  { label: 'Mistral', value: 'mistral:latest' },
];

export interface SseCitation {
  filename: string;
  page: number | null;
}

export type SseMetaEvent = {
  type: 'meta';
  conversation_id: string;
  citations: SseCitation[];
  contexts: unknown[];
};

export type SseTokenEvent = {
  type: 'token';
  content: string;
};

export type SseDoneEvent = {
  type: 'done';
};

export type SseErrorEvent = {
  type: 'error';
  content: string;
};

export type SseEvent = SseMetaEvent | SseTokenEvent | SseDoneEvent | SseErrorEvent;
