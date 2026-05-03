'use client';

import { MessageSquare, Clock, HardDrive, Database, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Sidebar() {
  return (
    <aside className="w-64 flex-shrink-0 flex flex-col h-full border-r border-white/5 bg-zinc-950/80 backdrop-blur-xl">
      <div className="p-4">
        <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-medium transition-colors shadow-sm">
          <Plus className="w-4 h-4" />
          New Thread
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6">
        <div className="space-y-1">
          <div className="px-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Today</div>
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-zinc-300 hover:bg-white/5 hover:text-zinc-100 transition-colors group">
            <MessageSquare className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300" />
            <span className="truncate">Enterprise RAG Architecture</span>
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-zinc-300 hover:bg-white/5 hover:text-zinc-100 transition-colors group">
            <MessageSquare className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300" />
            <span className="truncate">Vector DB Comparison</span>
          </button>
        </div>

        <div className="space-y-1">
          <div className="px-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" />
            Previous 7 Days
          </div>
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-zinc-300 hover:bg-white/5 hover:text-zinc-100 transition-colors group">
            <MessageSquare className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300" />
            <span className="truncate">Evaluating LLM Context Windows</span>
          </button>
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
                <span className="text-zinc-300">4.2 GB / 10 GB</span>
              </div>
              <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 w-[42%]" />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-zinc-500">API Tokens</span>
                <span className="text-zinc-300">82k / 100k</span>
              </div>
              <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-[82%]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
