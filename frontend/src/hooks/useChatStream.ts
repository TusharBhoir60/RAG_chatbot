import { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';
import { ApiClient } from '@/lib/api/client';
import { ApiError, isAbortError } from '@/lib/api/errors';
import { Message, Source, Conversation } from '@/types/rag';

interface ChatResponse {
  answer: string;
  citations: Array<{ filename: string; page: number | null }>;
  contexts: unknown[];
  conversation_id: string;
}

interface BackendMessage {
  role: 'user' | 'assistant';
  content: string;
  id?: string;
  timestamp?: string;
}

export function useChatStream() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentModel, setCurrentModel] = useState('llama3');
  const [conversationId, setConversationId] = useState<string | null>(null);
  
  // State for the sidebar
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const data = await ApiClient.get<Stats>('/stats');
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  const fetchConversations = useCallback(async () => {
    setIsLoadingConversations(true);
    try {
      const data = await ApiClient.get<{ conversations: Conversation[] }>('/conversations');
      setConversations(data.conversations || []);
    } catch (error: unknown) {
      console.error('Failed to fetch conversations:', error);
      const msg =
        error instanceof ApiError
          ? error.message
          : 'Could not load conversations. Is the API running?';
      toast(msg, 'error');
    } finally {
      setIsLoadingConversations(false);
    }
  }, [toast]);

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations();
    fetchStats();
  }, [fetchConversations, fetchStats]);

  const loadConversation = useCallback(async (id: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);

    try {
      setConversationId(id);
      const data = await ApiClient.get<{ messages: BackendMessage[] }>(
        `/conversations/${id}/messages`
      );
      
      // Map backend messages to frontend messages
      const mappedMessages: Message[] = (data.messages || []).map((msg, idx) => ({
        id: msg.id || `${id}-${idx}`,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
        isStreaming: false,
      }));
      
      setMessages(mappedMessages);
    } catch (error: unknown) {
      console.error('Failed to load conversation history:', error);
      const msg =
        error instanceof ApiError
          ? error.message
          : `Failed to load conversation ${id}.`;
      toast(msg, 'error');
      setMessages([
        {
          id: Date.now().toString(),
          role: 'system',
          content: 'Could not load this conversation. Try again or pick another thread.',
          timestamp: new Date(),
        },
      ]);
    }
  }, [toast]);

  const clearChat = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setMessages([]);
    setIsGenerating(false);
    setConversationId(null);
  }, []);

  const deleteConversation = useCallback(
    async (id: string) => {
      try {
        await ApiClient.delete(`/conversations/${id}`);
        setConversations((prev) => prev.filter((c) => String(c.id) !== id));
        if (conversationId === id) {
          clearChat();
        }
      } catch (error: unknown) {
        console.error('Failed to delete conversation:', error);
        const msg =
          error instanceof ApiError
            ? error.message
            : 'Could not delete conversation.';
        toast(msg, 'error');
      }
    },
    [conversationId, toast, clearChat]
  );

  const clearAllConversations = useCallback(async () => {
    if (!confirm('Are you sure you want to delete all conversations?')) return;
    try {
      await ApiClient.delete('/conversations');
      setConversations([]);
      clearChat();
      toast('All conversations deleted', 'success');
    } catch (error: unknown) {
      console.error('Failed to clear conversations:', error);
      const msg = error instanceof ApiError ? error.message : 'Could not clear conversations.';
      toast(msg, 'error');
    }
  }, [clearChat, toast]);

  const renameConversation = useCallback(async (id: string, newTitle: string) => {
    try {
      await ApiClient.patch(`/conversations/${id}/title`, { title: newTitle });
      setConversations((prev) => prev.map(c => String(c.id) === id ? { ...c, title: newTitle } : c));
    } catch (error: unknown) {
      console.error('Failed to rename conversation:', error);
      const msg = error instanceof ApiError ? error.message : 'Could not rename conversation.';
      toast(msg, 'error');
    }
  }, [toast]);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsGenerating(false);
      
      setMessages(prev => {
        const newMessages = [...prev];
        if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'assistant') {
          newMessages[newMessages.length - 1].isStreaming = false;
        }
        return newMessages;
      });
    }
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsGenerating(true);
    
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    const startTime = Date.now();
    
    let isNewConversation = !conversationId;

    try {
      const payload: Record<string, unknown> = {
        query: content,
        provider: 'ollama',
        model: currentModel,
        top_k: 5,
        debug: false,
      };
      if (conversationId) {
        payload.conversation_id = conversationId;
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const backendUrl = `${baseUrl}/api/v1`;
      const authHeaders = await ApiClient.getAuthHeaders();
      const response = await fetch(`${backendUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeaders as Record<string, string>),
        },
        body: JSON.stringify(payload),
        signal,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Server returned ${response.status}: ${errText}`);
      }

      if (!response.body) {
        throw new Error("No response body returned for streaming.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let streamedAnswer = "";
      let buffer = "";
      
      const assistantMessageId = (Date.now() + 1).toString();

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          // Pop the last element because it might be an incomplete line.
          // It will be processed in the next chunk, or when the stream is done.
          buffer = lines.pop() || "";
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim();
              if (!dataStr) continue;

              try {
                const data = JSON.parse(dataStr);
                
                if (data.type === 'meta') {
                  const latencyMs = Date.now() - startTime;
                  const sources: Source[] = (data.citations || []).map((cit: any, idx: number) => ({
                    id: `cit-${idx}`,
                    title: cit.filename,
                    snippet: cit.page != null ? `Page: ${cit.page}` : 'Page: —',
                    confidenceScore: 0.95,
                  }));

                  if (data.conversation_id) {
                    setConversationId(data.conversation_id);
                    if (isNewConversation) {
                      fetchConversations();
                    }
                  }

                  const assistantMessage: Message = {
                    id: assistantMessageId,
                    role: 'assistant',
                    content: '',
                    timestamp: new Date(),
                    isStreaming: true,
                    sources,
                    metadata: {
                      latencyMs,
                      model: currentModel,
                    }
                  };
                  
                  setMessages(prev => [...prev, assistantMessage]);
                } else if (data.type === 'token') {
                  streamedAnswer += data.content;
                  setMessages(prev => 
                    prev.map(msg => 
                      msg.id === assistantMessageId 
                        ? { ...msg, content: streamedAnswer } 
                        : msg
                    )
                  );
                } else if (data.type === 'done') {
                  setMessages(prev => 
                    prev.map(msg => 
                      msg.id === assistantMessageId 
                        ? { ...msg, isStreaming: false } 
                        : msg
                    )
                  );
                } else if (data.type === 'error') {
                  throw new Error(data.content);
                }
              } catch (e) {
                console.error("Error parsing SSE data line", line, e);
              }
            }
          }
        }
      }

      fetchStats();

    } catch (error: unknown) {
      if (isAbortError(error)) {
        // Aborted
      } else {
        console.error('Chat API Error:', error);
        let toastMessage = 'Chat request failed. Check the API and Ollama.';
        if (error instanceof ApiError) {
          toastMessage =
            error.status === 503
              ? `Assistant unavailable: ${error.message}`
              : error.message || toastMessage;
        } else if (error instanceof Error && error.message) {
          toastMessage = error.message;
        }
        toast(toastMessage, 'error');
        setMessages(prev => [
          ...prev, 
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: 'Something went wrong while getting a reply. See the alert below or try again.',
            timestamp: new Date(),
            isStreaming: false,
          }
        ]);
      }
    } finally {
      setIsGenerating(false);
    }
  }, [currentModel, conversationId, fetchConversations, toast, isGenerating]);

  return {
    messages,
    isGenerating,
    currentModel,
    setCurrentModel,
    sendMessage,
    stopGeneration,
    clearChat,
    conversationId,
    // New exports for Sidebar
    conversations,
    isLoadingConversations,
    loadConversation,
    deleteConversation,
    clearAllConversations,
    renameConversation,
    stats,
    fetchStats
  };
}
