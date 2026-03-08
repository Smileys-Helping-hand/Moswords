"use client";

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { soundEngine } from '@/lib/sound-engine';
import { useUnread } from '@/providers/unread-provider';
import { notificationService } from '@/lib/notification-service';

interface Message {
  id: string;
  content: string;
  userId: string;
  channelId?: string;
  senderId?: string;
  receiverId?: string;
  groupChatId?: string;
  createdAt: string;
  user?: {
    displayName: string | null;
    name: string | null;
  };
}

/**
 * NotificationManager - Global notification listener.
 *
 * Design principles that fix the old "messages sit in the bell unread" bug:
 *  1. All mutable values are accessed via refs so the polling interval is
 *     NEVER recreated on navigation – only on login/logout.
 *  2. lastCheckedRef is advanced only AFTER a successful fetch, never on
 *     pathname changes (which caused a timing gap that silently dropped
 *     messages arriving just before navigation).
 *  3. Single API call per poll (no type param → returns all types).
 *  4. Poll every 3 s instead of 5 s.
 */
export default function NotificationManager() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { toast } = useToast();
  const { addUnread } = useUnread();

  // ── stable refs so callbacks never go stale ──────────────────────────────
  const currentUserIdRef = useRef<string | null>(null);
  const pathnameRef      = useRef<string>(pathname || '/');
  const toastRef         = useRef(toast);
  const addUnreadRef     = useRef(addUnread);

  const lastCheckedRef       = useRef<Date>(new Date());
  const pollingIntervalRef   = useRef<NodeJS.Timeout | null>(null);
  const notifiedMessagesRef  = useRef<Set<string>>(new Set());
  const initializedRef       = useRef(false);

  // keep refs in sync with latest render values
  const currentUserId = session?.user ? (session.user as any).id : null;
  useEffect(() => { currentUserIdRef.current = currentUserId; }, [currentUserId]);
  useEffect(() => { pathnameRef.current = pathname || '/'; }, [pathname]);
  useEffect(() => { toastRef.current = toast; }, [toast]);
  useEffect(() => { addUnreadRef.current = addUnread; }, [addUnread]);

  // ── helpers (stable – no non-ref deps) ───────────────────────────────────
  function isViewingConversation(channelId?: string, dmUserId?: string, groupChatId?: string): boolean {
    const path = pathnameRef.current;
    if (channelId)    return path.includes(`/channels/${channelId}`);
    if (dmUserId)     return path.includes(`/dm/${dmUserId}`) || path.includes(`/conversations/${dmUserId}`);
    if (groupChatId)  return path.includes(`/group/${groupChatId}`);
    return false;
  }

  function fireNotification(message: Message): void {
    const uid = currentUserIdRef.current;

    // skip own messages
    if (message.userId === uid || message.senderId === uid) return;
    // skip already-notified
    if (notifiedMessagesRef.current.has(message.id)) return;
    // skip if user is looking at that conversation right now
    if (isViewingConversation(message.channelId, message.senderId || message.receiverId, message.groupChatId)) return;

    notifiedMessagesRef.current.add(message.id);
    if (notifiedMessagesRef.current.size > 200) {
      const arr = Array.from(notifiedMessagesRef.current);
      notifiedMessagesRef.current = new Set(arr.slice(-200));
    }

    const senderName = message.user?.displayName || message.user?.name || 'Someone';

    let title = `${senderName}`;
    let notificationType: 'channel' | 'dm' | 'group' = 'dm';
    let targetId = '';
    let targetUrl = '/';

    if (message.channelId) {
      title = `New message in #channel`;
      notificationType = 'channel';
      targetId = message.channelId;
      targetUrl = `/channels/${message.channelId}`;
    } else if (message.groupChatId) {
      title = `${senderName} (group)`;
      notificationType = 'group';
      targetId = message.groupChatId;
      targetUrl = `/group/${message.groupChatId}`;
    } else if (message.senderId) {
      title = senderName;
      notificationType = 'dm';
      targetId = message.senderId;
      targetUrl = `/dm/${message.senderId}`;
    }

    const body = message.content.length > 100
      ? `${message.content.substring(0, 100)}…`
      : message.content;

    // increment unread badge
    addUnreadRef.current(notificationType, targetId, 1);

    // play in-app sound
    soundEngine.play();

    // ── in-app toast popup (8 s, visible even when tab is in foreground) ──
    toastRef.current({
      title,
      description: body,
      duration: 8000,
    });

    // ── OS / native notification via notification service ─────────────────
    // renotify: true ensures a new OS ping even when re-using the same tag
    notificationService.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: `conv-${targetId || message.id}`,  // group by conversation
      renotify: true,
      data: { url: targetUrl },
      vibrate: [200, 100, 200],
      requireInteraction: false,
    } as NotificationOptions);
  }

  async function pollMessages(): Promise<void> {
    if (!currentUserIdRef.current) return;

    try {
      // Snapshot the timestamp BEFORE making the request so we never
      // have a gap between fetch-end and the next lastCheckedRef update.
      const nextChecked = new Date();
      const since = lastCheckedRef.current.toISOString();

      const response = await fetch(
        `/api/notifications/messages?since=${encodeURIComponent(since)}`
      );

      if (response.ok) {
        const data = await response.json();
        (data.messages as Message[] ?? []).forEach(fireNotification);
        // Only advance the timestamp after a successful fetch
        lastCheckedRef.current = nextChecked;
      }
    } catch {
      // network error – keep lastCheckedRef where it was so we retry
    }
  }

  // ── single stable effect: starts/stops the interval on login/logout ──────
  useEffect(() => {
    if (!currentUserId) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    // Request OS notification permission once per session
    if (!initializedRef.current) {
      initializedRef.current = true;
      notificationService.initialize().catch(() => {});
    }

    // Initial immediate poll
    pollMessages();

    // Poll every 3 s
    pollingIntervalRef.current = setInterval(pollMessages, 3000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]); // INTENTIONALLY only restarts on login/logout

  return null;
}
