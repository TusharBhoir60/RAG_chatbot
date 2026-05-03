'use client';

import { useState, useRef, useEffect } from 'react';
import { Zap, ChevronDown, Check, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const MODELS = [
  "Gemini 3.1 Pro",
  "Gemini 3.1 Flash",
  "GPT-4o",
  "Claude 3.5 Sonnet",
  "Local Llama 3 8B"
];

interface HeaderProps {
  currentModel: string;
  onModelSelect?: (model: string) => void;
  latencyMs?: number;
  onGoHome?: () => void;
  onOpenSidebar?: () => void;
}

export function Header({ currentModel, onModelSelect, latencyMs, onGoHome, onOpenSidebar }: HeaderProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="flex-shrink-0 h-16 px-4 md:px-6 flex items-center justify-between border-b border-white/5 bg-zinc-950/50 backdrop-blur-md z-30">
      <div className="flex items-center gap-3 md:gap-4">
        {onOpenSidebar && (
          <button 
            onClick={onOpenSidebar}
            className="md:hidden p-2 -ml-2 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-white/5 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <button 
          onClick={onGoHome}
          className="flex items-center gap-2 md:gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
            <div className="w-3.5 h-3.5 md:w-4 md:h-4 rounded-sm bg-gradient-to-br from-indigo-400 to-emerald-400" />
          </div>
          <span className="font-semibold text-zinc-100 tracking-tight text-base md:text-lg">RAG Engine</span>
        </button>
      </div>

      <div className="flex items-center gap-4">
        {/* Interactive Model Selector Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-white/5 border border-transparent hover:border-white/10 transition-colors text-sm text-zinc-300 font-medium"
          >
            {currentModel}
            <ChevronDown className={cn("w-4 h-4 text-zinc-500 transition-transform duration-200", isDropdownOpen && "rotate-180")} />
          </button>

          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-56 rounded-xl bg-zinc-900 border border-white/10 shadow-2xl glass-panel overflow-hidden py-1 z-50"
              >
                {MODELS.map((model) => (
                  <button
                    key={model}
                    onClick={() => {
                      if (onModelSelect) onModelSelect(model);
                      setIsDropdownOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 text-sm text-left transition-colors",
                      currentModel === model 
                        ? "bg-indigo-500/10 text-indigo-300" 
                        : "text-zinc-300 hover:bg-white/5 hover:text-zinc-100"
                    )}
                  >
                    {model}
                    {currentModel === model && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Latency / Inference Speed Indicator */}
        {latencyMs ? (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            key={latencyMs}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-medium"
          >
            <Zap className="w-3.5 h-3.5" />
            {latencyMs}ms
          </motion.div>
        ) : null}
      </div>
    </header>
  );
}
