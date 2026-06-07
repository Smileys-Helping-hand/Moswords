'use client';

import React, { useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatMessage from './chat-message';
import { messageAnimations } from '@/lib/animations';

interface Message {
  id: string;
  content: string;
  author: any;
  timestamp: string;
  status?: string;
  tempId?: string;
  [key: string]: any;
}

interface VirtualizedChatListProps {
  messages: Message[];
  currentUserId: string;
  height: number;
  width: string | number;
  onRetry?: (tempId: string) => void;
  onDelete?: (tempId: string) => void;
}

export function VirtualizedChatList({
  messages,
  currentUserId,
  height,
  width,
  onRetry,
  onDelete,
}: VirtualizedChatListProps) {
  // Calculate message grouping for UI consistency
  const messagesWithGrouping = useMemo(() => {
    return messages.map((msg, index) => {
      const prevMsg = index > 0 ? messages[index - 1] : null;
      const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;

      const shouldGroup =
        prevMsg &&
        prevMsg.author.uid === msg.author.uid &&
        Math.abs(
          new Date(msg.timestamp).getTime() - new Date(prevMsg.timestamp).getTime()
        ) < 60000;

      const isGroupedWithNext = !!(
        nextMsg &&
        nextMsg.author.uid === msg.author.uid &&
        Math.abs(
          new Date(nextMsg.timestamp).getTime() - new Date(msg.timestamp).getTime()
        ) < 60000
      );

      return {
        msg,
        showAvatar: !shouldGroup,
        isGrouped: !!shouldGroup,
        isLastInGroup: !isGroupedWithNext,
      };
    });
  }, [messages]);

  return (
    <div className="w-full h-full overflow-y-auto">
      {messagesWithGrouping.length > 0 ? (
        <div className="px-3 md:px-4 py-2 space-y-4 md:space-y-6">
          <AnimatePresence mode="popLayout">
            {messagesWithGrouping.map(({ msg, showAvatar, isGrouped, isLastInGroup }, index) => (
              <motion.div
                key={msg.id}
                initial={messageAnimations.initial}
                animate={messageAnimations.animate}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{
                  ...messageAnimations.transition,
                  delay: Math.min(index * 0.02, 0.1), // Stagger effect (max 100ms)
                }}
                layout
              >
                <ChatMessage
                  message={msg}
                  showAvatar={showAvatar}
                  isGrouped={isGrouped}
                  isLastInGroup={isLastInGroup}
                  isCurrentUser={msg.author.uid === currentUserId}
                  onRetry={
                    msg.status === 'error' && msg.tempId && onRetry
                      ? () => onRetry(msg.tempId!)
                      : undefined
                  }
                  onDelete={
                    msg.status === 'error' && msg.tempId && onDelete
                      ? () => onDelete(msg.tempId!)
                      : undefined
                  }
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          No messages yet. Start the conversation!
        </div>
      )}
    </div>
  );
}

export default VirtualizedChatList;
