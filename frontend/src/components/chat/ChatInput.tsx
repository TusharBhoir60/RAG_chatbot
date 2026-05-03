'use client';

import { useState, useRef, useEffect } from 'react';
import { ArrowUp, Paperclip, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isGenerating: boolean;
  onStop: () => void;
}

export function ChatInput({ onSendMessage, isGenerating, onStop }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSubmit = () => {
    if (input.trim() && !isGenerating) {
      onSendMessage(input.trim());
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } else if (isGenerating) {
      onStop();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="p-4 mx-auto max-w-3xl w-full relative z-20">
      <motion.div
        animate={{ 
          scale: isFocused ? 1.01 : 1,
          y: isFocused ? -2 : 0,
        }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={cn(
          "relative rounded-2xl p-3 flex flex-col gap-2 transition-all duration-300",
          "bg-zinc-900 border",
          isFocused ? "border-indigo-500/50 shadow-[0_0_20px_rgba(79,70,229,0.15)]" : "border-white/10 shadow-lg hover:border-white/20"
        )}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Ask a question or request an analysis..."
          className="w-full bg-transparent text-zinc-100 placeholder:text-zinc-500 outline-none resize-none min-h-[24px] max-h-[200px] text-sm leading-relaxed"
          rows={1}
        />
        
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-1">
            <button className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors">
              <Paperclip className="w-4 h-4" />
            </button>
            <button className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors">
              <Mic className="w-4 h-4" />
            </button>
          </div>
          
          <button
            onClick={handleSubmit}
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-lg transition-all",
              isGenerating 
                ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                : input.trim() 
                  ? "bg-white text-zinc-950 hover:bg-zinc-200"
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
            )}
            disabled={!input.trim() && !isGenerating}
          >
            {isGenerating ? (
              <div className="w-3 h-3 rounded-sm bg-zinc-400 animate-pulse" />
            ) : (
              <ArrowUp className="w-4 h-4" />
            )}
          </button>
        </div>
      </motion.div>
      <div className="text-center mt-3 text-[10px] text-zinc-500">
        AI can make mistakes. Verify important information.
      </div>
    </div>
  );
}
