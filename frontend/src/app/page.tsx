import { Sidebar } from "@/components/layout/Sidebar";
import { ChatContainer } from "@/components/chat/ChatContainer";

export default function Home() {
  return (
    <main className="flex h-full w-full overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 relative">
        <ChatContainer />
      </div>
    </main>
  );
}
