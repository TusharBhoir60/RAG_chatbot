'use client';

import { MessageSquare, Database, Plus, Trash2, Loader2, X } from 'lucide-react';
import { Conversation, Stats } from '@/types/rag';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarProps {
  onNewThread?: () => void;
  conversations?: Conversation[];
  isLoadingConversations?: boolean;
  activeConversationId?: string | null;
  onSelectConversation?: (id: string) => void;
  onDeleteConversation?: (id: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
  stats?: Stats;
}

export function Sidebar({ 
  onNewThread, 
  conversations = [], 
  isLoadingConversations = false,
  activeConversationId,
  onSelectConversation,
  onDeleteConversation,
  isOpen = false,
  onClose,
  stats
}: SidebarProps) {
  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      <aside 
        className={cn(
          "w-64 flex-shrink-0 flex flex-col h-full border-r border-white/5 bg-zinc-950/95 md:bg-zinc-950/80 backdrop-blur-xl z-50",
          "fixed md:relative top-0 left-0 transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex items-center justify-between p-4 md:hidden border-b border-white/5">
          <span className="font-semibold text-zinc-100">Menu</span>
          <button onClick={onClose} className="p-2 -mr-2 text-zinc-400 hover:text-zinc-100">
            <X className="w-5 h-5" />
          </button>
        </div>
      <div className="p-4">
        <button 
          onClick={onNewThread}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Thread
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6">
        <div className="space-y-1">
          <div className="px-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Conversations</span>
            {isLoadingConversations && <Loader2 className="w-3 h-3 animate-spin text-zinc-500" />}
          </div>
          
          {conversations.length === 0 && !isLoadingConversations ? (
            <div className="px-3 text-sm text-zinc-500 italic">No previous threads</div>
          ) : (
            conversations.map((conv) => (
              <div 
                key={conv.id}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors group",
                  String(activeConversationId) === String(conv.id) 
                    ? "bg-indigo-500/10 text-indigo-300" 
                    : "text-zinc-300 hover:bg-white/5 hover:text-zinc-100 cursor-pointer"
                )}
                onClick={() => onSelectConversation?.(String(conv.id))}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <MessageSquare className={cn(
                    "w-4 h-4 flex-shrink-0", 
                    String(activeConversationId) === String(conv.id) ? "text-indigo-400" : "text-zinc-500 group-hover:text-zinc-300"
                  )} />
                  <span className="truncate flex-1">
                    {conv.title?.trim() ? conv.title : `Thread ${String(conv.id).substring(0, 8)}`}
                  </span>
                </div>
                
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteConversation?.(String(conv.id));
                  }}
                  className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 rounded transition-all"
                  title="Delete conversation"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* API Usage / Storage Quota Dashboard */}
      <div className="p-4 border-t border-white/5">
        <div className="rounded-xl bg-zinc-900/50 border border-white/5 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-3">
            <Database className="w-4 h-4 text-indigo-400" />
            Knowledge Base
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-zinc-500">Storage Used</span>
                <span className="text-zinc-300">
                  {stats ? `${stats.storage_used_gb.toFixed(4)} GB` : '...'} / {stats ? `${stats.storage_total_gb} GB` : '...'}
                </span>
              </div>
              <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-500 transition-all duration-500" 
                  style={{ width: stats ? `${Math.min((stats.storage_used_gb / stats.storage_total_gb) * 100, 100)}%` : '0%' }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-zinc-500">API Tokens</span>
                <span className="text-zinc-300">
                  {stats ? `${(stats.tokens_used / 1000).toFixed(1)}k` : '...'} / {stats ? `${(stats.tokens_total / 1000).toFixed(0)}k` : '...'}
                </span>
              </div>
              <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-500" 
                  style={{ width: stats ? `${Math.min((stats.tokens_used / stats.tokens_total) * 100, 100)}%` : '0%' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
    </>
  );
}
