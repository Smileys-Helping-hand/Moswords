"use client";

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { soundEngine } from '@/lib/sound-engine';
import { useUnread } from '@/providers/unread-provider';
import { notificationService } from '@/lib/notification-service';
import { useSyncBatches } from '@/providers/sync-provider';
import type { SyncChannelMessage, SyncDirectMessage, SyncGroupMessage } from '@/lib/sync/engine';

/**
 * NotificationManager — turns sync batches into unread badges, sounds, toasts
 * and OS notifications. It does no fetching of its own; the shared sync loop
 * (SyncProvider) delivers only messages from conversations the user belongs to.
 *
 * - DMs and group messages: badge + sound + toast + OS notification
 * - Server channel messages: badge only (business channels are busy; like Slack,
 *   they shouldn't ping you for every message)
 * - Nothing fires for the conversation currently on screen, for your own
 *   messages, or for DMs you muted.
 */
interface NotifPrefs {
  messages: boolean;
  groups: boolean;
  calls: boolean;
  sounds: boolean;
  vibration: boolean;
  showPreview: boolean;
}

const defaultPrefs: NotifPrefs = {
  messages: true,
  groups: true,
  calls: true,
  sounds: true,
  vibration: true,
  showPreview: true,
};

function getNotificationPrefs(): NotifPrefs {
  if (typeof window === 'undefined') return defaultPrefs;
  try {
    const raw = localStorage.getItem('mw_notification_prefs');
    if (raw) return { ...defaultPrefs, ...JSON.parse(raw) };
  } catch {}
  return defaultPrefs;
}

export default function NotificationManager() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { toast } = useToast();
  const { addUnread } = useUnread();

  const myId = (session?.user as { id?: string } | undefined)?.id ?? null;
  const pathnameRef = useRef(pathname || '/');
  pathnameRef.current = pathname || '/';

  useEffect(() => {
    if (myId) notificationService.initialize().catch(() => {});
  }, [myId]);

  useSyncBatches((batch) => {
    if (!myId) return;
    const path = pathnameRef.current;
    const visible = typeof document !== 'undefined' && !document.hidden;
    const prefs = getNotificationPrefs();

    const incomingDms = batch.dms.filter((m) => m.receiverId === myId && m.senderId !== myId);
    const groupMsgs = batch.groupMessages.filter((m) => m.userId !== myId);
    const channelMsgs = batch.channelMessages.filter((m) => m.userId !== myId);

    for (const m of incomingDms) {
      const onScreen = visible && path.includes(`/dm/${m.senderId}`);
      if (onScreen) continue;
      addUnread('dm', m.senderId, 1);
      if (!prefs.messages) continue;
      if (isMuted(myId, m.senderId)) continue;
      alert(senderName(m), preview(m), `/dm/${m.senderId}`, `dm-${m.senderId}`);
    }

    for (const m of groupMsgs) {
      const onScreen = visible && path.includes(`/group/${m.groupChatId}`);
      if (onScreen) continue;
      addUnread('group', m.groupChatId, 1);
      if (!prefs.groups) continue;
      if (isMuted(myId, m.groupChatId)) continue;
      alert(`${senderName(m)} (group)`, preview(m), `/group/${m.groupChatId}`, `group-${m.groupChatId}`);
    }

    for (const m of channelMsgs) {
      const onScreen = visible && path.includes(`/channels/${m.channelId}`);
      if (!onScreen) addUnread('channel', m.channelId, 1);
    }
  });

  function alert(title: string, body: string, url: string, tag: string) {
    const prefs = getNotificationPrefs();
    if (prefs.sounds) {
      soundEngine.play();
    }
    const displayBody = prefs.showPreview ? body : 'New message';
    if (!document.hidden) {
      toast({ title, description: displayBody, duration: 6000 });
    }
    notificationService.showNotification(title, {
      body: displayBody,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag, // one notification per conversation, replaced as new messages arrive
      renotify: true,
      data: { url },
      requireInteraction: false,
      vibrate: prefs.vibration ? [200, 100, 200] : undefined,
    } as NotificationOptions);
  }

  return null;
}

function isMuted(myId: string, conversationId: string): boolean {
  try {
    return localStorage.getItem(`muted_${myId}_${conversationId}`) === '1';
  } catch {
    return false;
  }
}

function senderName(m: SyncDirectMessage | SyncGroupMessage | SyncChannelMessage): string {
  return m.sender?.displayName || m.sender?.name || 'Someone';
}

/** Never put ciphertext or raw media URLs in a notification. */
function preview(m: SyncDirectMessage | SyncGroupMessage | SyncChannelMessage): string {
  if (m.isEncrypted || m.contentNonce) return '🔒 New message';
  switch (m.mediaType) {
    case 'image': return '📷 Photo';
    case 'video': return '🎥 Video';
    case 'audio': return '🎤 Voice message';
    case 'gif': return '🎞️ GIF';
    case 'sticker': return '🎨 Sticker';
    case 'file': return '📎 File';
  }
  const text = (m.content || '').trim();
  return text.length > 100 ? `${text.slice(0, 100)}…` : text || 'New message';
}
