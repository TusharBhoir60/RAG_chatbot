import { useState, useCallback, useRef } from 'react';
import { Message, Source } from '@/types/rag';

// Mock data for sources
const MOCK_SOURCES: Source[] = [
  {
    id: 'src-1',
    title: 'Enterprise RAG Architecture',
    snippet: 'Retrieval-Augmented Generation (RAG) integrates search mechanisms with LLMs to provide context-aware responses.',
    confidenceScore: 0.98,
  },
  {
    id: 'src-2',
    title: 'Frontend UI/UX Guidelines',
    snippet: 'Streaming text interfaces require layout animations to prevent visual jitter when new tokens are appended to the DOM.',
    confidenceScore: 0.85,
  }
];

const MOCK_RESPONSE = `Here is a comprehensive overview of building an enterprise-grade RAG interface:

RAG interfaces demand a high level of polish. We must ensure that **streaming text** doesn't cause layout jitter. Framer Motion's \`layout\` prop is perfect for this.

### Key Considerations:
1. **Latency Metrics**: Displaying inference speed builds trust.
2. **Confidence Scores**: Showing how confident the retrieval system is.
3. **Animations**: Smooth scaling and layout shifting.

Would you like to explore the backend implementation next?`;

export function useChatStream() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentModel, setCurrentModel] = useState('Gemini 3.1 Pro');
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const clearChat = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setMessages([]);
    setIsGenerating(false);
  }, []);

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
    
    /* 
    ========================================================================
    HOW IT WILL WORK WITH A REAL BACKEND (SSE / JSON LINES STREAMING)
    ========================================================================
    try {
      const response = await fetch('http://localhost:8000/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content, model: currentModel }),
        signal,
      });

      if (!response.body) throw new Error('No readable stream available');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let assistantContent = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        
        // Example: Parsing SSE formats like: data: {"type": "token", "content": "hello"}
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            
            if (data.type === 'token') {
              assistantContent += data.content;
              setMessages(prev => prev.map(msg => 
                msg.id === assistantMessageId ? { ...msg, content: assistantContent } : msg
              ));
            } else if (data.type === 'sources') {
              setMessages(prev => prev.map(msg => 
                msg.id === assistantMessageId ? { ...msg, sources: data.sources } : msg
              ));
            } else if (data.type === 'metadata') {
              setMessages(prev => prev.map(msg => 
                msg.id === assistantMessageId ? { ...msg, metadata: data.metadata } : msg
              ));
            }
          }
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') console.log('Generation aborted');
      else console.error('Streaming error:', error);
    } finally {
      setIsGenerating(false);
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId ? { ...msg, isStreaming: false } : msg
      ));
    }
    ========================================================================
    */

    // --- MOCK IMPLEMENTATION BELOW ---
    await new Promise(resolve => setTimeout(resolve, 600)); // fake retrieval latency
    
    const tokens = MOCK_RESPONSE.split(' ');
    let currentContent = '';
    
    for (let i = 0; i < tokens.length; i++) {
      if (signal.aborted) break;
      
      currentContent += (i === 0 ? '' : ' ') + tokens[i];
      
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId ? { ...msg, content: currentContent } : msg
      ));
      
      await new Promise(resolve => setTimeout(resolve, 20 + Math.random() * 60));
    }
    
    if (!signal.aborted) {
      setIsGenerating(false);
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId ? {
          ...msg,
          isStreaming: false,
          sources: MOCK_SOURCES,
          metadata: {
            latencyMs: 600 + tokens.length * 50,
            tokensUsed: tokens.length * 1.5,
            model: currentModel,
          }
        } : msg
      ));
    }
  }, [currentModel]);

  return {
    messages,
    isGenerating,
    currentModel,
    setCurrentModel,
    sendMessage,
    stopGeneration,
    clearChat
  };
}
