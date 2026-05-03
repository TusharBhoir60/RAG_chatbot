'use client';

import { Sidebar } from "@/components/layout/Sidebar";
import { ChatContainer } from "@/components/chat/ChatContainer";
import { useChatStream } from "@/hooks/useChatStream";
import { useEffect } from "react";

export default function Home() {
  const chatState = useChatStream();

  useEffect(() => {
    if (chatState.isGenerating) {
      document.body.classList.add('aurora-fast');
    } else {
      document.body.classList.remove('aurora-fast');
    }
  }, [chatState.isGenerating]);

  return (
    <main className="flex h-full w-full overflow-hidden">
      <Sidebar 
        onNewThread={chatState.clearChat} 
        conversations={chatState.conversations}
        isLoadingConversations={chatState.isLoadingConversations}
        activeConversationId={chatState.conversationId}
        onSelectConversation={chatState.loadConversation}
        onDeleteConversation={chatState.deleteConversation}
      />
      <div className="flex-1 flex flex-col min-w-0 relative">
        <ChatContainer state={chatState} />
      </div>
    </main>
  );
}
