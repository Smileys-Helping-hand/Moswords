import ServerSidebar from './server-sidebar';
import ChannelSidebar from './channel-sidebar';
import ChatHeader from './chat-header';
import ChatMessages from './chat-messages';
import ChatInput from './chat-input';
import MemberSidebar from './member-sidebar';

export default function MainLayout() {
  return (
    <div className="h-screen w-full flex bg-background text-foreground">
      <ServerSidebar />
      <ChannelSidebar />
      <main className="flex-1 flex flex-col bg-neutral-900/30">
        <ChatHeader />
        <div className="flex-1 flex min-h-0">
          <div className="flex-1 flex flex-col bg-background">
            <ChatMessages />
            <ChatInput />
          </div>
          <MemberSidebar />
        </div>
      </main>
    </div>
  );
}
