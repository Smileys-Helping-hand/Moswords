'use client';

import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter, usePathname } from 'next/navigation';
import UserAvatar from '@/components/user-avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, BellOff, Bell, Archive, Trash2 } from 'lucide-react';
import { Check, CheckCheck } from 'lucide-react';

interface Conversation {
  otherUserId: string;
  otherUser?: {
    id: string;
    email: string;
    name: string | null;
    displayName: string | null;
    photoURL: string | null;
    lastSeen: string | null;
  };
  lastMessage: {
    id: string;
    content: string;
    senderId: string;
    receiverId: string;
    createdAt: string;
    read: boolean;
    archived: boolean;
    isEncrypted?: boolean | null;
  };
  unreadCount: number;
}

interface ChatRowItemProps {
  conversation: Conversation;
  currentUserId: string;
  mutedIds: Set<string>;
  activePath: string;
  onMute: (userId: string) => void;
  onArchive: (userId: string) => void;
  onDelete: (userId: string) => void;
  timeFormatter: (iso: string) => string;
  previewFormatter: (content: string, isEncrypted?: boolean | null) => string;
  animationDelay: number;
}

function getPreviewText(content: string, isEncrypted?: boolean | null): string {
  if (isEncrypted) return '🔒 Encrypted message';
  if (
    content.length > 20 &&
    /^[A-Za-z0-9+/=_-]+$/.test(content) &&
    !/\s/.test(content)
  ) {
    return '🔒 Encrypted message';
  }
  return content;
}

const ChatRowItem = memo(function ChatRowItem({
  conversation,
  currentUserId,
  mutedIds,
  activePath,
  onMute,
  onArchive,
  onDelete,
  timeFormatter,
  previewFormatter,
  animationDelay,
}: ChatRowItemProps) {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const isSentByMe = conversation.lastMessage.senderId === currentUserId;
  const isUnread = conversation.unreadCount > 0 && !isSentByMe;
  const isMuted = mutedIds.has(conversation.otherUserId);
  const preview = getPreviewText(conversation.lastMessage.content, conversation.lastMessage.isEncrypted);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.15, delay: animationDelay }}
      className="relative group/row"
    >
      <button
        onClick={() => router.push(`/dm/${conversation.otherUserId}`)}
        className={`w-full text-left rounded-xl px-3 py-2.5 transition-all duration-150 flex items-center gap-3 ${
          activePath === `/dm/${conversation.otherUserId}`
            ? 'bg-primary/15 border border-primary/30'
            : 'hover:bg-muted/60 active:bg-muted/80 border border-transparent'
        }`}
      >
        {/* Avatar with online indicator */}
        <div className="relative shrink-0">
          <UserAvatar
            src={conversation.otherUser?.photoURL || ''}
            fallback={(
              conversation.otherUser?.displayName ||
              conversation.otherUser?.name ||
              conversation.otherUser?.email ||
              'U'
            ).substring(0, 2).toUpperCase()}
          />
          {conversation.otherUser?.lastSeen && (
            <div
              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-background ${
                new Date().getTime() - new Date(conversation.otherUser.lastSeen).getTime() < 300000
                  ? 'bg-green-500'
                  : 'bg-gray-500'
              }`}
            />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <p
              className={`truncate ${
                isUnread ? 'font-semibold text-foreground' : 'font-medium text-foreground/80'
              }`}
            >
              {conversation.otherUser?.displayName || conversation.otherUser?.name || 'Unknown'}
            </p>
            <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
              {timeFormatter(conversation.lastMessage.createdAt)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {isSentByMe && (
              <>
                {conversation.lastMessage.read ? (
                  <CheckCheck className="w-3 h-3 text-primary" />
                ) : (
                  <Check className="w-3 h-3 text-muted-foreground" />
                )}
              </>
            )}
            <p
              className={`text-xs truncate flex-1 ${
                isUnread
                  ? 'text-foreground/70 font-medium'
                  : 'text-muted-foreground'
              }`}
            >
              {isSentByMe ? 'You: ' : ''}{preview}
            </p>
            {isMuted && <span className="text-[10px] text-muted-foreground">🔇</span>}
            {isUnread && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="ml-1 flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center"
              >
                {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
              </motion.span>
            )}
          </div>
        </div>

        {/* Dropdown menu */}
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <button className="opacity-0 group-hover/row:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded-lg">
              <MoreVertical className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass-card border-white/20 w-44">
            <DropdownMenuItem onClick={() => onMute(conversation.otherUserId)}>
              {isMuted ? (
                <><Bell className="w-4 h-4 mr-2" />Unmute</>
              ) : (
                <><BellOff className="w-4 h-4 mr-2" />Mute</>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onArchive(conversation.otherUserId)}>
              <Archive className="w-4 h-4 mr-2" />
              Archive
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(conversation.otherUserId)}
              className="text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete chat
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </button>
    </motion.div>
  );
});

ChatRowItem.displayName = 'ChatRowItem';

export default ChatRowItem;
