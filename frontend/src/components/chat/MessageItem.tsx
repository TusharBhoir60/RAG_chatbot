'use client';

import { Message } from '@/types/rag';
import { SourceChip } from './SourceChip';
import { Loader2, Sparkles, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

// Basic markdown rendering function for this example
function renderContent(content: string) {
  // A real implementation would use react-markdown
  const parts = content.split('\n');
  return parts.map((part, idx) => {
    if (part.startsWith('### ')) {
      return <h3 key={idx}>{part.replace('### ', '')}</h3>;
    }
    if (part.match(/\*\*(.*?)\*\*/)) {
      // simple bold replacement
      const elements = [];
      let lastIndex = 0;
      const regex = /\*\*(.*?)\*\*/g;
      let match;
      while ((match = regex.exec(part)) !== null) {
        if (match.index > lastIndex) {
          elements.push(part.substring(lastIndex, match.index));
        }
        elements.push(<strong key={match.index}>{match[1]}</strong>);
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < part.length) {
        elements.push(part.substring(lastIndex));
      }
      return <p key={idx}>{elements.length > 0 ? elements : part}</p>;
    }
    return part ? <p key={idx}>{part}</p> : <br key={idx} />;
  });
}

export function MessageItem({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn("py-6 w-full flex justify-center", isUser ? "" : "bg-zinc-900/20")}>
      <div className="max-w-3xl w-full px-4 flex gap-6">
        <div className="flex-shrink-0 mt-1">
          {isUser ? (
            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center">
              <User className="w-4 h-4 text-zinc-400" />
            </div>
          ) : (
            <div className={cn(
              "w-8 h-8 rounded-xl border flex items-center justify-center relative overflow-hidden",
              message.isStreaming 
                ? "border-indigo-500/50 bg-indigo-500/10" 
                : "border-emerald-500/30 bg-zinc-900"
            )}>
              {message.isStreaming && (
                <div className="absolute inset-0 bg-indigo-500/20 animate-pulse" />
              )}
              <Sparkles className={cn(
                "w-4 h-4 relative z-10", 
                message.isStreaming ? "text-indigo-400" : "text-emerald-400"
              )} />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-zinc-100 mb-1 flex items-center gap-2">
            {isUser ? 'You' : 'RAG Engine'}
            {message.metadata && (
              <span className="text-[10px] text-zinc-500 font-normal">
                {message.metadata.model}
              </span>
            )}
          </div>
          
          <div className="prose-readable text-[15px]">
            {message.content ? (
              renderContent(message.content)
            ) : message.isStreaming ? (
              <span className="inline-flex items-center gap-2 text-zinc-400 text-sm">
                <Loader2
                  className="w-4 h-4 animate-spin text-indigo-400 shrink-0"
                  aria-hidden
                />
                <span className="animate-pulse">Generating response…</span>
              </span>
            ) : null}
            
            {message.isStreaming && message.content && (
              <span className="inline-block w-2 h-4 bg-indigo-500 animate-pulse ml-1 align-middle" />
            )}
          </div>

          {/* Sources and Metadata displayed when done generating */}
          {!message.isStreaming && (message.sources?.length || message.metadata) && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 pt-4 border-t border-white/5 flex flex-wrap gap-4 items-center"
            >
              {message.sources && message.sources.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {message.sources.map((source, idx) => (
                    <SourceChip key={source.id} source={source} index={idx} />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
