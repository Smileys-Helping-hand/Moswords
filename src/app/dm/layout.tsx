import ConversationListPanel from '@/components/dm/ConversationListPanel';

export default function DmLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Desktop left panel — WhatsApp-style conversation list */}
      <div className="hidden md:flex w-[340px] lg:w-[380px] xl:w-[420px] flex-col border-r border-border/30 shrink-0 bg-background/98 overflow-hidden">
        <ConversationListPanel compact />
      </div>

      {/* Right panel: chat content or "select a chat" placeholder */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
