/**
 * Typing indicator for a server channel.
 * Thin wrapper over the shared sync-driven useTyping hook — no polling of its own.
 */
import { useSession } from 'next-auth/react';
import { formatTyping, useTyping } from '@/providers/sync-provider';

export function useTypingIndicator(channelId: string | null) {
  const { data: session } = useSession();
  const myId = (session?.user as { id?: string } | undefined)?.id;
  const { typingNames, notifyTyping, stopTyping } = useTyping('channel', channelId, myId);

  return {
    typingUsers: typingNames.map((userName) => ({ userName })),
    typingText: formatTyping(typingNames),
    onTypingStart: notifyTyping,
    onTypingStop: stopTyping,
    isAnyoneTyping: typingNames.length > 0,
  };
}
