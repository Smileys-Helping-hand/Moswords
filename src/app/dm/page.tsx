'use client';

import ConversationListPanel from '@/components/dm/ConversationListPanel';
import { MobileOnly } from '@/components/responsive-slot';
import EmptyState from '@/components/empty-state';
import { MessageSquare } from 'lucide-react';

export default function DMInboxPage() {
  return (
    <>
      {/* Mobile: full-screen conversation list */}
      <div className="md:hidden h-[100dvh] overflow-hidden">
        <MobileOnly>
          <ConversationListPanel />
        </MobileOnly>
      </div>

      {/* Desktop: right-panel placeholder (list is in dm/layout.tsx) */}
      <div className="hidden md:flex flex-1 items-center justify-center h-full">
        <EmptyState
          icon={<MessageSquare />}
          title="Your Messages"
          description="Select a conversation from the left panel to start chatting"
          variant="primary"
        />
      </div>
    </>
  );
}
