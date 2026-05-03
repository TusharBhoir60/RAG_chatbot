'use client';

import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { Search, Settings, FileText, Database, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function CommandPalette() {
  const [open, setOpen] = useState(false);

  // Toggle the menu when ⌘K is pressed
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <Command.Dialog 
          open={open} 
          onOpenChange={setOpen}
          label="Global Command Menu"
          className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-zinc-950/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="w-full max-w-lg"
          >
            <div className={cn(
              "w-full rounded-2xl overflow-hidden",
              "bg-zinc-900 border border-white/10 shadow-2xl",
              "flex flex-col"
            )}>
              <div className="flex items-center border-b border-white/5 px-4">
                <Search className="w-5 h-5 text-zinc-400 mr-3" />
                <Command.Input 
                  placeholder="Type a command or search..." 
                  className="flex-1 bg-transparent border-none outline-none py-4 text-zinc-100 placeholder:text-zinc-500"
                  autoFocus
                />
                <button 
                  onClick={() => setOpen(false)}
                  className="p-1 rounded-md text-zinc-400 hover:bg-white/5 hover:text-zinc-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <Command.List className="max-h-[300px] overflow-y-auto p-2">
                <Command.Empty className="py-6 text-center text-zinc-500 text-sm">
                  No results found.
                </Command.Empty>

                <Command.Group heading="Suggestions" className="text-xs text-zinc-500 font-medium px-2 py-1 mb-1">
                  <Command.Item className="flex items-center px-2 py-2.5 rounded-lg text-sm text-zinc-300 hover:bg-white/5 hover:text-zinc-100 cursor-pointer data-[selected=true]:bg-indigo-500/20 data-[selected=true]:text-indigo-300">
                    <FileText className="w-4 h-4 mr-3 text-zinc-400" />
                    Search Chat History
                  </Command.Item>
                  <Command.Item className="flex items-center px-2 py-2.5 rounded-lg text-sm text-zinc-300 hover:bg-white/5 hover:text-zinc-100 cursor-pointer data-[selected=true]:bg-indigo-500/20 data-[selected=true]:text-indigo-300">
                    <Database className="w-4 h-4 mr-3 text-zinc-400" />
                    Manage Knowledge Base
                  </Command.Item>
                  <Command.Item className="flex items-center px-2 py-2.5 rounded-lg text-sm text-zinc-300 hover:bg-white/5 hover:text-zinc-100 cursor-pointer data-[selected=true]:bg-indigo-500/20 data-[selected=true]:text-indigo-300">
                    <Settings className="w-4 h-4 mr-3 text-zinc-400" />
                    Settings
                  </Command.Item>
                </Command.Group>
              </Command.List>
            </div>
          </motion.div>
        </Command.Dialog>
      )}
    </AnimatePresence>
  );
}
