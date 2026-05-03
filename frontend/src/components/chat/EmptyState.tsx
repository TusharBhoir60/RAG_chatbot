'use client';

import { motion } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';

interface EmptyStateProps {
  onSelectQuery: (query: string) => void;
}

const SUGGESTED_QUERIES = [
  "Explain the architecture of our current RAG implementation.",
  "What is the difference between similarity search and MMR?",
  "How can we optimize vector embeddings for latency?",
  "Summarize the recent changes to the ML microservices."
];

export function EmptyState({ onSelectQuery }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 text-center max-w-2xl mx-auto w-full">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mb-8 relative"
      >
        <div className="absolute inset-0 blur-2xl bg-indigo-500/20 rounded-full" />
        <div className="relative w-16 h-16 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center mb-6 mx-auto shadow-2xl">
          <Sparkles className="w-8 h-8 text-indigo-400" />
        </div>
        <h1 className="text-3xl font-semibold text-zinc-100 tracking-tight mb-3">
          How can I help you today?
        </h1>
        <p className="text-zinc-400 text-sm max-w-md mx-auto">
          Access the enterprise knowledge base. Ask questions, analyze documents, or explore the codebase.
        </p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full"
      >
        {SUGGESTED_QUERIES.map((query, index) => (
          <button
            key={index}
            onClick={() => onSelectQuery(query)}
            className="flex items-center justify-between text-left p-4 rounded-xl bg-zinc-900/50 border border-white/5 hover:bg-white/5 hover:border-white/10 transition-all group"
          >
            <span className="text-sm text-zinc-300 pr-4">{query}</span>
            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-500/20 transition-colors">
              <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-indigo-400" />
            </div>
          </button>
        ))}
      </motion.div>
    </div>
  );
}
