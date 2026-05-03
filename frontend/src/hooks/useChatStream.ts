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
  
  const abortControllerRef = useRef<AbortController | null>(null);

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
  }, [fetchConversations]);

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
        setConversations((prev) => prev.filter((c) => c.id !== id));
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
    
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '', 
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
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

      const response = await ApiClient.post<ChatResponse>('/chat', payload, {
        signal,
      });

      const latencyMs = Date.now() - startTime;

      if (response.conversation_id) {
        setConversationId(response.conversation_id);
        if (isNewConversation) {
          // If this was a new conversation, refresh the sidebar list after it's created
          fetchConversations();
        }
      }

      const sources: Source[] = (response.citations || []).map((cit, idx) => ({
        id: `cit-${idx}`,
        title: cit.filename,
        snippet:
          cit.page != null ? `Page: ${cit.page}` : 'Page: —',
        confidenceScore: 0.95,
      }));

      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId ? { 
          ...msg, 
          content: response.answer,
          isStreaming: false,
          sources,
          metadata: {
            latencyMs,
            model: currentModel,
          }
        } : msg
      ));

    } catch (error: unknown) {
      if (isAbortError(error)) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, isStreaming: false, content: msg.content || 'Stopped.' }
              : msg
          )
        );
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
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  content:
                    'Something went wrong while getting a reply. See the alert below or try again.',
                  isStreaming: false,
                }
              : msg
          )
        );
      }
    } finally {
      setIsGenerating(false);
    }
  }, [currentModel, conversationId, fetchConversations, toast]);

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
    deleteConversation
  };
}
