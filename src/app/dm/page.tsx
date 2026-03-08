'use client';

import ConversationListPanel from '@/components/dm/ConversationListPanel';
import { MessageSquare } from 'lucide-react';

export default function DMInboxPage() {
  return (
    <>
      {/* Mobile: full-screen conversation list */}
      <div className="md:hidden h-screen overflow-hidden">
        <ConversationListPanel />
      </div>

      {/* Desktop: right-panel placeholder (list is in dm/layout.tsx) */}
      <div className="hidden md:flex flex-col items-center justify-center h-full text-center select-none">
        <div className="w-24 h-24 rounded-full bg-primary/8 flex items-center justify-center mb-5">
          <MessageSquare className="w-12 h-12 text-primary/30" />
        </div>
        <h2 className="text-xl font-semibold text-foreground/60 mb-2">Your Messages</h2>
        <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
          Select a conversation from the left panel to start chatting
        </p>
      </div>
    </>
  );
}
