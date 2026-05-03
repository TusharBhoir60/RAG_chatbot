'use client';

import { useState, useRef, useEffect } from 'react';
import { ArrowUp, Paperclip, Mic, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { ApiClient } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { useToast } from '@/context/ToastContext';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isGenerating: boolean;
  onStop: () => void;
}

interface UploadResponse {
  message: string;
  filename: string;
  saved_to: string;
}

export function ChatInput({ onSendMessage, isGenerating, onStop }: ChatInputProps) {
  const { toast } = useToast();
  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const inputLocked = isGenerating || isUploading;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSubmit = () => {
    if (inputLocked) {
      if (isGenerating) onStop();
      return;
    }
    if (input.trim()) {
      onSendMessage(input.trim());
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await ApiClient.post<UploadResponse>(
        '/documents/upload',
        formData
      );

      const encodedName = encodeURIComponent(uploadRes.filename);
      await ApiClient.post<Record<string, unknown>>(
        `/documents/${encodedName}/ingest`,
        {}
      );

      const okMsg = `Ingested “${uploadRes.filename}”`;
      setUploadSuccess(okMsg);
      toast(okMsg, 'success');
      window.setTimeout(() => setUploadSuccess(null), 5000);
    } catch (error: unknown) {
      console.error('Failed to upload and ingest:', error);
      const msg =
        error instanceof ApiError
          ? error.message
          : 'Upload or ingest failed. Check the API, PDF, and Qdrant.';
      toast(msg, 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="p-4 mx-auto max-w-3xl w-full relative z-20">
      <AnimatePresence>
        {uploadSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium shadow-lg backdrop-blur-md"
          >
            <CheckCircle2 className="w-4 h-4" />
            {uploadSuccess}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        animate={{
          scale: isFocused ? 1.01 : 1,
          y: isFocused ? -2 : 0,
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={cn(
          'relative rounded-2xl p-3 flex flex-col gap-2 transition-all duration-300',
          'bg-zinc-900 border',
          isFocused
            ? 'border-indigo-500/50 shadow-[0_0_20px_rgba(79,70,229,0.15)]'
            : 'border-white/10 shadow-lg hover:border-white/20',
          inputLocked && 'opacity-95'
        )}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={
            isUploading
              ? 'Uploading document…'
              : isGenerating
                ? 'Waiting for response…'
                : 'Ask a question or request an analysis…'
          }
          disabled={inputLocked}
          aria-busy={inputLocked}
          className={cn(
            'w-full bg-transparent text-zinc-100 placeholder:text-zinc-500 outline-none resize-none min-h-[24px] max-h-[200px] text-sm leading-relaxed',
            inputLocked && 'cursor-not-allowed opacity-80'
          )}
          rows={1}
        />

        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-1">
            <input
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileUpload}
              disabled={isUploading}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isGenerating}
              title={isUploading ? 'Uploading…' : 'Attach PDF'}
              className={cn(
                'p-2 rounded-lg transition-colors',
                isUploading || isGenerating
                  ? 'text-zinc-600 cursor-not-allowed'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
              )}
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              ) : (
                <Paperclip className="w-4 h-4" />
              )}
            </button>
            <button
              type="button"
              disabled={inputLocked}
              className={cn(
                'p-2 rounded-lg transition-colors',
                inputLocked
                  ? 'text-zinc-600 cursor-not-allowed'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
              )}
            >
              <Mic className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            title={isGenerating ? 'Stop generation' : 'Send'}
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-lg transition-all',
              isGenerating
                ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                : input.trim() && !inputLocked
                  ? 'bg-white text-zinc-950 hover:bg-zinc-200'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            )}
            disabled={(!input.trim() && !isGenerating) || isUploading}
          >
            {isGenerating ? (
              <span className="flex items-center justify-center" aria-hidden>
                <Loader2 className="w-4 h-4 animate-spin text-zinc-300" />
              </span>
            ) : (
              <ArrowUp className="w-4 h-4" />
            )}
          </button>
        </div>
      </motion.div>
      {isGenerating && (
        <p className="text-center mt-2 text-[11px] text-indigo-400/90 flex items-center justify-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          Generating response…
        </p>
      )}
      <div className="text-center mt-3 text-[10px] text-zinc-500">
        AI can make mistakes. Verify important information.
      </div>
    </div>
  );
}
