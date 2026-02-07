"use client";

import { useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { soundEngine } from '@/lib/sound-engine';
import { useUnread } from '@/providers/unread-provider';

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
 * NotificationManager - Global notification listener
 * Polls for new messages and triggers notifications
 */
export default function NotificationManager() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { toast } = useToast();
  const { addUnread } = useUnread();
  
  const lastCheckedRef = useRef<Date>(new Date());
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const notifiedMessagesRef = useRef<Set<string>>(new Set());

  const currentUserId = session?.user ? (session.user as any).id : null;

  const requestNotificationPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch (e) {
        // ignore permission errors
      }
    }
  }, []);

  /**
   * Check if user is currently viewing a specific channel/conversation
   */
  const isViewingChannel = useCallback((channelId?: string, dmUserId?: string, groupChatId?: string): boolean => {
    if (channelId) {
      return pathname?.includes(`/channels/${channelId}`) || false;
    }
    if (dmUserId) {
      return pathname?.includes(`/dm/${dmUserId}`) || pathname?.includes(`/conversations/${dmUserId}`) || false;
    }
    if (groupChatId) {
      return pathname?.includes(`/group/${groupChatId}`) || false;
    }
    return false;
  }, [pathname]);

  /**
   * Show notification and play sound
   */
  const showNotification = useCallback((message: Message) => {
    // Don't notify if message is from current user
    if (message.userId === currentUserId || message.senderId === currentUserId) {
      return;
    }

    // Don't notify if already notified for this message
    if (notifiedMessagesRef.current.has(message.id)) {
      return;
    }

    // Check if user is viewing this specific chat
    const isViewing = isViewingChannel(
      message.channelId,
      message.senderId || message.receiverId,
      message.groupChatId
    );

    if (isViewing) {
      return; // Don't notify if user is currently in this conversation
    }

    // Mark as notified
    notifiedMessagesRef.current.add(message.id);

    // Clean up old notified messages (keep only last 100)
    if (notifiedMessagesRef.current.size > 100) {
      const arr = Array.from(notifiedMessagesRef.current);
      notifiedMessagesRef.current = new Set(arr.slice(-100));
    }

    // Get sender name
    const senderName = message.user?.displayName || message.user?.name || 'Someone';
    
    // Determine notification type
    let notificationTitle = 'New message';
    let notificationType: 'channel' | 'dm' | 'group' = 'dm';
    let targetId = '';

    if (message.channelId) {
      notificationTitle = `New message in channel`;
      notificationType = 'channel';
      targetId = message.channelId;
    } else if (message.groupChatId) {
      notificationTitle = `New message in group chat`;
      notificationType = 'group';
      targetId = message.groupChatId;
    } else if (message.senderId) {
      notificationTitle = `New message from ${senderName}`;
      notificationType = 'dm';
      targetId = message.senderId;
    }

    // Add to unread count
    addUnread(notificationType, targetId, 1);

    // Play notification sound
    soundEngine.play();

    // Show toast notification
    toast({
      title: notificationTitle,
      description: message.content.length > 100 
        ? `${message.content.substring(0, 100)}...` 
        : message.content,
      duration: 5000,
    });

    // Show system notification when possible (helps on mobile)
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        const body = message.content.length > 140
          ? `${message.content.substring(0, 140)}...`
          : message.content;
        const tag = `msg-${message.id}`;
        const payload = {
          body,
          icon: '/icon-192.png',
          tag,
          data: {
            url: message.channelId
              ? `/channels/${message.channelId}`
              : message.groupChatId
                ? `/group/${message.groupChatId}`
                : message.senderId
                  ? `/dm/${message.senderId}`
                  : '/',
          },
        } as NotificationOptions;

        // Prefer service worker notification if available
        if (navigator.serviceWorker?.ready) {
          navigator.serviceWorker.ready.then((reg) => {
            reg.showNotification(notificationTitle, payload);
          }).catch(() => {
            new Notification(notificationTitle, payload);
          });
        } else {
          new Notification(notificationTitle, payload);
        }
      }
    }
  }, [currentUserId, isViewingChannel, toast, addUnread]);

  /**
   * Poll for new messages
   */
  const checkForNewMessages = useCallback(async () => {
    if (!currentUserId) return;

    try {
      const since = lastCheckedRef.current.toISOString();

      // Check for new channel messages
      const channelResponse = await fetch(`/api/notifications/messages?since=${since}&type=channel`);
      if (channelResponse.ok) {
        const channelData = await channelResponse.json();
        channelData.messages?.forEach((msg: Message) => showNotification(msg));
      }

      // Check for new DMs
      const dmResponse = await fetch(`/api/notifications/messages?since=${since}&type=dm`);
      if (dmResponse.ok) {
        const dmData = await dmResponse.json();
        dmData.messages?.forEach((msg: Message) => showNotification(msg));
      }

      // Check for new group chat messages
      const groupResponse = await fetch(`/api/notifications/messages?since=${since}&type=group`);
      if (groupResponse.ok) {
        const groupData = await groupResponse.json();
        groupData.messages?.forEach((msg: Message) => showNotification(msg));
      }

      lastCheckedRef.current = new Date();
    } catch (error) {
      console.error('Error checking for new messages:', error);
    }
  }, [currentUserId, showNotification]);

  /**
   * Start polling when user is authenticated
   */
  useEffect(() => {
    if (!currentUserId) return;

    requestNotificationPermission();

    // Initial check
    checkForNewMessages();

    // Poll every 5 seconds
    pollingIntervalRef.current = setInterval(checkForNewMessages, 5000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [currentUserId, checkForNewMessages, requestNotificationPermission]);

  /**
   * Update last checked time when pathname changes (user navigates)
   */
  useEffect(() => {
    lastCheckedRef.current = new Date();
  }, [pathname]);

  return null; // This component doesn't render anything
}
