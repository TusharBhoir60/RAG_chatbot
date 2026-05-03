'use client';

import { useChatStream } from '@/hooks/useChatStream';
import { EmptyState } from './EmptyState';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { Header } from '../layout/Header';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';

export function ChatContainer() {
  const { 
    messages, 
    isGenerating, 
    currentModel, 
    sendMessage, 
    stopGeneration 
  } = useChatStream();

  // Add/remove fast aurora animation based on generation state
  useEffect(() => {
    if (isGenerating) {
      document.body.classList.add('aurora-fast');
    } else {
      document.body.classList.remove('aurora-fast');
    }
  }, [isGenerating]);

  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const currentLatency = lastMessage?.metadata?.latencyMs;

  return (
    <div className="flex flex-col h-full bg-zinc-950/40 relative">
      <Header currentModel={currentModel} latencyMs={currentLatency} />
      
      {messages.length === 0 ? (
        <EmptyState onSelectQuery={sendMessage} />
      ) : (
        <MessageList messages={messages} />
      )}

      <div className={cn(
        "absolute bottom-0 left-0 right-0 p-4",
        "bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent pt-10"
      )}>
        <ChatInput 
          onSendMessage={sendMessage} 
          isGenerating={isGenerating} 
          onStop={stopGeneration} 
        />
      </div>
    </div>
  );
}
