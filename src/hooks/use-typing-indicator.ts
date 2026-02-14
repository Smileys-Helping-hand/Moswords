/**
 * Typing Indicator Hook
 * Shows when other users are typing in real-time
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';

interface TypingUser {
  userId: string;
  userName: string;
  timestamp: number;
}

const TYPING_TIMEOUT = 3000; // Consider user stopped typing after 3 seconds
const THROTTLE_INTERVAL = 1000; // Send typing indicator max once per second

export function useTypingIndicator(channelId: string | null) {
  const { data: session } = useSession();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const lastSentRef = useRef<number>(0);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentUserId = session?.user ? (session.user as any).id : null;

  /**
   * Broadcast that current user is typing
   */
  const broadcastTyping = useCallback(async () => {
    if (!channelId || !currentUserId) return;

    const now = Date.now();
    if (now - lastSentRef.current < THROTTLE_INTERVAL) {
      return; // Throttle - don't send too frequently
    }

    lastSentRef.current = now;

    try {
      await fetch(`/api/channels/${channelId}/typing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          userName: (session?.user as any)?.displayName || (session?.user as any)?.name || 'User',
        }),
      });
    } catch (error) {
      console.error('Failed to broadcast typing:', error);
    }
  }, [channelId, currentUserId, session]);

  /**
   * Fetch current typing users
   */
  const fetchTypingUsers = useCallback(async () => {
    if (!channelId || !currentUserId) return;

    try {
      const response = await fetch(`/api/channels/${channelId}/typing`);
      if (!response.ok) return;

      const data = await response.json();
      const now = Date.now();

      // Filter out current user and expired typing indicators
      const activeTypers = (data.typingUsers || [])
        .filter((user: TypingUser) => 
          user.userId !== currentUserId && 
          (now - user.timestamp) < TYPING_TIMEOUT
        );

      setTypingUsers(activeTypers);
    } catch (error) {
      console.error('Failed to fetch typing users:', error);
    }
  }, [channelId, currentUserId]);

  /**
   * User started typing
   */
  const onTypingStart = useCallback(() => {
    broadcastTyping();

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop broadcasting
    typingTimeoutRef.current = setTimeout(() => {
      // User stopped typing
    }, TYPING_TIMEOUT);
  }, [broadcastTyping]);

  /**
   * User stopped typing
   */
  const onTypingStop = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, []);

  /**
   * Poll for typing users
   */
  useEffect(() => {
    if (!channelId) return;

    fetchTypingUsers();
    const interval = setInterval(fetchTypingUsers, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [channelId, fetchTypingUsers]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Format typing indicator text
   */
  const typingText = (): string | null => {
    if (typingUsers.length === 0) return null;
    if (typingUsers.length === 1) {
      return `${typingUsers[0].userName} is typing...`;
    }
    if (typingUsers.length === 2) {
      return `${typingUsers[0].userName} and ${typingUsers[1].userName} are typing...`;
    }
    return `${typingUsers[0].userName} and ${typingUsers.length - 1} others are typing...`;
  };

  return {
    typingUsers,
    typingText: typingText(),
    onTypingStart,
    onTypingStop,
    isAnyoneTyping: typingUsers.length > 0,
  };
}
