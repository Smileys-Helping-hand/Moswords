'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import UserAvatar from '@/components/user-avatar';

interface GroupChat {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  memberCount: number;
  userRole: string;
}

interface GroupChatRowItemProps {
  group: GroupChat;
  activePath: string;
  animationDelay: number;
}

const GroupChatRowItem = memo(function GroupChatRowItem({
  group,
  activePath,
  animationDelay,
}: GroupChatRowItemProps) {
  const router = useRouter();

  return (
    <motion.button
      key={group.id}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.15, delay: animationDelay }}
      onClick={() => router.push(`/group/${group.id}`)}
      className={`w-full text-left rounded-xl px-3 py-2.5 transition-all duration-150 flex items-center gap-3 ${
        activePath === `/group/${group.id}`
          ? 'bg-primary/15 border border-primary/30'
          : 'hover:bg-muted/60 active:bg-muted/80 border border-transparent'
      }`}
    >
      <UserAvatar
        src={group.imageUrl || ''}
        fallback={group.name.substring(0, 2).toUpperCase()}
      />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate text-foreground">{group.name}</p>
        <p className="text-xs text-muted-foreground">
          {group.memberCount} member{group.memberCount !== 1 ? 's' : ''}
          {group.description ? ` · ${group.description}` : ''}
        </p>
      </div>
    </motion.button>
  );
});

GroupChatRowItem.displayName = 'GroupChatRowItem';

export default GroupChatRowItem;
