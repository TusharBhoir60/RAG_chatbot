'use client';

import { Sidebar } from "@/components/layout/Sidebar";
import { ChatContainer } from "@/components/chat/ChatContainer";
import { useChatStream } from "@/hooks/useChatStream";
import { useEffect, useState } from "react";

export default function Home() {
  const chatState = useChatStream();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (chatState.isGenerating) {
      document.body.classList.add('aurora-fast');
    } else {
      document.body.classList.remove('aurora-fast');
    }
  }, [chatState.isGenerating]);

  return (
    <main className="flex h-full w-full overflow-hidden relative">
      <Sidebar 
        onNewThread={() => {
          chatState.clearChat();
          setIsSidebarOpen(false);
        }} 
        conversations={chatState.conversations}
        isLoadingConversations={chatState.isLoadingConversations}
        activeConversationId={chatState.conversationId}
        onSelectConversation={(id) => {
          chatState.loadConversation(id);
          setIsSidebarOpen(false);
        }}
        onDeleteConversation={chatState.deleteConversation}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        stats={chatState.stats}
      />
      <div className="flex-1 flex flex-col min-w-0 relative">
        <ChatContainer 
          state={chatState} 
          onOpenSidebar={() => setIsSidebarOpen(true)}
        />
      </div>
    </main>
  );
}
