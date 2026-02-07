import ServerSidebar from './server-sidebar';
import ChannelSidebar from './channel-sidebar';
import ChatHeader from './chat-header';
import ChatMessages from './chat-messages';
import ChatInput from './chat-input';
import MemberSidebar from './member-sidebar';
import MobileServerPicker from './mobile-server-picker';

export default function MainLayout() {
  return (
    <div className="h-screen w-full flex bg-gradient-to-br from-background via-background to-primary/5 text-foreground relative overflow-hidden overflow-x-hidden">
      {/* Animated background elements - smaller on mobile */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-48 md:w-96 h-48 md:h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-48 md:w-96 h-48 md:h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-48 md:w-96 h-48 md:h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>
      
      <div className="relative z-10 flex w-full overflow-x-hidden">
        {/* Mobile Server Picker - Only on mobile */}
        <MobileServerPicker />
        
        {/* Server Sidebar - Hidden on mobile */}
        <div className="hidden md:flex">
          <ServerSidebar />
        </div>
        {/* Channel Sidebar - Hidden on mobile */}
        <div className="hidden md:flex">
          <ChannelSidebar />
        </div>
        {/* Main Content - Full width on mobile */}
        <main className="flex-1 flex flex-col w-full min-w-0 pb-20 md:pb-0">
          <ChatHeader />
          <div className="flex-1 flex min-h-0">
            <div className="flex-1 flex flex-col min-w-0">
              <ChatMessages />
              <ChatInput />
            </div>
            {/* Member Sidebar - Hidden on mobile */}
            <div className="hidden lg:flex">
              <MemberSidebar />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
