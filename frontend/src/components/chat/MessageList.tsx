'use client';

import { useEffect, useRef } from 'react';
import { Message } from '@/types/rag';
import { MessageItem } from './MessageItem';
import { motion, AnimatePresence } from 'framer-motion';

interface MessageListProps {
  messages: Message[];
  isGenerating?: boolean;
}

export function MessageList({ messages, isGenerating }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages stream in or generating starts
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  return (
    <div className="flex-1 overflow-y-auto pb-32 pt-8">
      <div className="flex flex-col">
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              layout="position"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                type: 'spring',
                stiffness: 400,
                damping: 30,
                opacity: { duration: 0.2 }
              }}
            >
              <MessageItem message={message} />
            </motion.div>
          ))}
          
          {/* Skeleton Loader / Thinking State */}
          {isGenerating && (
            <motion.div
              key="thinking-skeleton"
              layout="position"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="px-4 py-6 w-full group"
            >
              <div className="max-w-3xl mx-auto flex gap-4 w-full">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mt-1">
                  <div className="w-4 h-4 rounded-sm bg-gradient-to-br from-indigo-400 to-emerald-400 opacity-80" />
                </div>
                
                <div className="flex-1 min-w-0 space-y-4 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-zinc-100">RAG Engine</span>
                    <span className="text-xs text-zinc-500">Thinking</span>
                  </div>
                  
                  {/* Pulsing Skeleton Lines */}
                  <div className="space-y-3">
                    <div className="h-3.5 bg-zinc-800/60 rounded animate-pulse w-3/4" />
                    <div className="h-3.5 bg-zinc-800/60 rounded animate-pulse w-5/6" />
                    <div className="h-3.5 bg-zinc-800/60 rounded animate-pulse w-1/2" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={bottomRef} className="h-4" />
      </div>
    </div>
  );
}
