'use client';

import { useState } from 'react';
import { Source } from '@/types/rag';
import { FileText, ExternalLink, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SourceChipProps {
  source: Source;
  index: number;
}

export function SourceChip({ source, index }: SourceChipProps) {
  const [isHovered, setIsHovered] = useState(false);
  const confidencePercent = Math.round(source.confidenceScore * 100);

  return (
    <div 
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-800/50 hover:bg-zinc-700/50 border border-white/5 transition-colors text-xs text-zinc-300">
        <FileText className="w-3 h-3 text-indigo-400" />
        <span className="truncate max-w-[120px]">{source.title}</span>
        <span className="text-zinc-500 text-[10px] ml-1">[{index + 1}]</span>
      </button>

      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-0 mb-2 w-72 p-3 rounded-xl bg-zinc-900 border border-white/10 shadow-2xl z-50 glass-panel"
          >
            <div className="flex items-start justify-between mb-2">
              <h4 className="text-sm font-medium text-zinc-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                {source.title}
              </h4>
              <div className="flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">
                <CheckCircle2 className="w-3 h-3" />
                {confidencePercent}% Match
              </div>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed mb-3 line-clamp-3">
              "{source.snippet}"
            </p>
            {source.url && (
              <a 
                href={source.url} 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                View Source <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
