'use client';

import { useState } from 'react';
import { Message } from '@/types/rag';
import { SourceChip } from './SourceChip';
import { Sparkles, User, Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';

function CodeBlock({ node, inline, className, children, ...props }: any) {
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!inline && match) {
    return (
      <div className="relative group rounded-md overflow-hidden bg-[#1e1e1e] my-4 border border-zinc-800">
        <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800 text-xs text-zinc-400">
          <span>{language}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 p-1 rounded-md hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
            title="Copy code"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <SyntaxHighlighter
          style={vscDarkPlus as any}
          language={language}
          PreTag="div"
          customStyle={{ margin: 0, borderRadius: 0, background: 'transparent' }}
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      </div>
    );
  }
  return (
    <code className={cn("bg-zinc-800/50 text-zinc-300 rounded px-1.5 py-0.5 text-sm border border-zinc-700/50 mt-1 inline-block", className)} {...props}>
      {children}
    </code>
  );
}

function renderContent(content: string) {
  return (
    <div className="prose prose-invert prose-zinc max-w-none prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent prose-pre:m-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code: CodeBlock as any,
          a: ({ node, ...props }) => <a className="text-indigo-400 hover:text-indigo-300 transition-colors" target="_blank" rel="noopener noreferrer" {...props} />
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export function MessageItem({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn("py-6 w-full flex justify-center transition-colors", isUser ? "" : "bg-zinc-900/40 border-y border-white/[0.02]")}>
      <div className="max-w-3xl w-full px-4 flex gap-6">
        <div className="flex-shrink-0 mt-1">
          {isUser ? (
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-zinc-700 to-zinc-600 border border-white/10 flex items-center justify-center shadow-md">
              <User className="w-4 h-4 text-white/90" />
            </div>
          ) : (
            <div className={cn(
              "w-8 h-8 rounded-xl shadow-md border flex items-center justify-center relative overflow-hidden transition-all duration-300",
              message.isStreaming 
                ? "border-indigo-500/50 bg-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]" 
                : "border-indigo-500/30 bg-zinc-800"
            )}>
              {message.isStreaming && (
                <motion.div 
                  initial={{ opacity: 0.5 }}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute inset-0 bg-indigo-500/20" 
                />
              )}
              <Sparkles className={cn(
                "w-4 h-4 relative z-10 transition-colors", 
                message.isStreaming ? "text-indigo-300" : "text-indigo-400"
              )} />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-zinc-100 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-2">
              {isUser ? 'You' : 'RAG Engine'}
              {message.metadata && (
                <span className="px-2 py-0.5 rounded-full bg-zinc-800 border border-white/5 text-[10px] text-zinc-400 font-normal">
                  {message.metadata.model}
                </span>
              )}
            </span>
          </div>
          
          <div className="text-[15px] tracking-wide text-zinc-200">
            {message.isStreaming && !message.content ? (
              <div className="flex items-center gap-3 py-1">
                <div className="flex gap-1.5">
                  <motion.div className="w-1.5 h-1.5 rounded-full bg-indigo-400/80" animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 1, repeat: Infinity, delay: 0 }} />
                  <motion.div className="w-1.5 h-1.5 rounded-full bg-indigo-400/80" animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 1, repeat: Infinity, delay: 0.2 }} />
                  <motion.div className="w-1.5 h-1.5 rounded-full bg-indigo-400/80" animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 1, repeat: Infinity, delay: 0.4 }} />
                </div>
                <span className="text-zinc-400 text-sm font-medium">Thinking...</span>
              </div>
            ) : (
              <div className="prose-container">
                {renderContent(message.content || '')}
              </div>
            )}
          </div>

          <AnimatePresence>
            {!message.isStreaming && (message.sources?.length || message.metadata) && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-5 pt-4 border-t border-white/[0.04] flex flex-wrap gap-4 items-center"
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
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
