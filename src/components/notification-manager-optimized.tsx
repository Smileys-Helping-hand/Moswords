/**
 * Optimized Notification Manager with Smart Polling
 * Features:
 * - Batched API calls (single request instead of 3)
 * - Visibility API (pause when tab hidden)
 * - Exponential backoff when idle
 * - Better error handling with retry logic
 */

"use client";

import { useEffect, useRef, useCallback, useState } from 'react';
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
 * Smart polling configuration
 */
const POLLING_CONFIG = {
  MIN_INTERVAL: 5000,       // 5 seconds when active
  MAX_INTERVAL: 30000,      // 30 seconds when idle
  IDLE_TIMEOUT: 60000,      // Consider idle after 1 minute
  BACKOFF_MULTIPLIER: 1.5,  // Exponential backoff multiplier
  MAX_RETRIES: 3,           // Max retry attempts on error
};

export default function NotificationManagerOptimized() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { toast } = useToast();
  const { addUnread } = useUnread();
  
  const lastCheckedRef = useRef<Date>(new Date());
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const notifiedMessagesRef = useRef<Set<string>>(new Set());
  const lastActivityRef = useRef<Date>(new Date());
  const currentIntervalRef = useRef<number>(POLLING_CONFIG.MIN_INTERVAL);
  const retryCountRef = useRef<number>(0);
  const isVisibleRef = useRef<boolean>(true);

  const currentUserId = session?.user ? (session.user as any).id : null;

  /**
   * Track user activity to adjust polling frequency
   */
  const updateActivity = useCallback(() => {
    lastActivityRef.current = new Date();
    // Reset to minimum interval on activity
    if (currentIntervalRef.current > POLLING_CONFIG.MIN_INTERVAL) {
      currentIntervalRef.current = POLLING_CONFIG.MIN_INTERVAL;
      restartPolling();
    }
  }, []);

  /**
   * Check if user is idle
   */
  const isIdle = useCallback(() => {
    const now = new Date().getTime();
    const lastActivity = lastActivityRef.current.getTime();
    return (now - lastActivity) > POLLING_CONFIG.IDLE_TIMEOUT;
  }, []);

  /**
   * Adjust polling interval based on activity
   */
  const getNextInterval = useCallback(() => {
    if (isIdle()) {
      // Exponential backoff when idle
      const newInterval = Math.min(
        currentIntervalRef.current * POLLING_CONFIG.BACKOFF_MULTIPLIER,
        POLLING_CONFIG.MAX_INTERVAL
      );
      currentIntervalRef.current = newInterval;
      return newInterval;
    }
    return POLLING_CONFIG.MIN_INTERVAL;
  }, [isIdle]);

  const requestNotificationPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    
    try {
      const granted = await notificationService.initialize();
      if (granted) {
        console.log('Notifications enabled - Optimized polling active');
      }
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  }, []);

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

  const showNotification = useCallback((message: Message) => {
    if (message.userId === currentUserId || message.senderId === currentUserId) {
      return;
    }

    if (notifiedMessagesRef.current.has(message.id)) {
      return;
    }

    const isViewing = isViewingChannel(
      message.channelId,
      message.senderId || message.receiverId,
      message.groupChatId
    );

    if (isViewing) {
      return;
    }

    notifiedMessagesRef.current.add(message.id);

    if (notifiedMessagesRef.current.size > 100) {
      const arr = Array.from(notifiedMessagesRef.current);
      notifiedMessagesRef.current = new Set(arr.slice(-100));
    }

    const senderName = message.user?.displayName || message.user?.name || 'Someone';
    
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

    addUnread(notificationType, targetId, 1);
    soundEngine.play();

    toast({
      title: notificationTitle,
      description: message.content.length > 100 
        ? `${message.content.substring(0, 100)}...` 
        : message.content,
      duration: 5000,
    });

    notificationService.showNotification(notificationTitle, {
      body: message.content.length > 140
        ? `${message.content.substring(0, 140)}...`
        : message.content,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: `msg-${message.id}`,
      data: {
        url: message.channelId
          ? `/servers/${message.channelId.split('-')[0]}/channels/${message.channelId}`
          : message.groupChatId
            ? `/group/${message.groupChatId}`
            : message.senderId
              ? `/dm/${message.senderId}`
              : '/',
      },
      vibrate: [200, 100, 200],
      requireInteraction: false,
    });
  }, [currentUserId, isViewingChannel, toast, addUnread]);

  /**
   * Batched API call - single request for all message types
   */
  const checkForNewMessages = useCallback(async () => {
    if (!currentUserId || !isVisibleRef.current) return;

    try {
      const since = lastCheckedRef.current.toISOString();

      // Single batched API call instead of 3 separate calls
      const response = await fetch(`/api/notifications/messages?since=${since}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();
      
      // Process all messages
      data.messages?.forEach((msg: Message) => showNotification(msg));

      lastCheckedRef.current = new Date();
      retryCountRef.current = 0; // Reset retry count on success

      // Update activity on successful fetch
      updateActivity();
    } catch (error) {
      console.error('Error checking for new messages:', error);
      
      // Implement retry logic with exponential backoff
      retryCountRef.current++;
      if (retryCountRef.current < POLLING_CONFIG.MAX_RETRIES) {
        const retryDelay = Math.min(
          1000 * Math.pow(2, retryCountRef.current),
          10000
        );
        setTimeout(checkForNewMessages, retryDelay);
      } else {
        // Max retries reached, will retry on next interval
        retryCountRef.current = 0;
      }
    }
  }, [currentUserId, showNotification, updateActivity]);

  /**
   * Restart polling with new interval
   */
  const restartPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    const interval = getNextInterval();
    pollingIntervalRef.current = setInterval(checkForNewMessages, interval);
    
    console.log(`Polling interval: ${interval}ms (${isIdle() ? 'idle' : 'active'})`);
  }, [checkForNewMessages, getNextInterval, isIdle]);

  /**
   * Handle visibility changes - pause polling when tab hidden
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden;
      
      if (document.hidden) {
        // Tab hidden - clear polling
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        console.log('Tab hidden - polling paused');
      } else {
        // Tab visible - resume polling
        console.log('Tab visible - polling resumed');
        lastCheckedRef.current = new Date(); // Don't miss messages while hidden
        checkForNewMessages();
        restartPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [checkForNewMessages, restartPolling]);

  /**
   * Track user activity (mouse, keyboard, touch)
   */
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    
    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });
    };
  }, [updateActivity]);

  /**
   * Start optimized polling when user is authenticated
   */
  useEffect(() => {
    if (!currentUserId) return;

    requestNotificationPermission();
    checkForNewMessages();
    restartPolling();

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [currentUserId, checkForNewMessages, requestNotificationPermission, restartPolling]);

  /**
   * Update last checked time when pathname changes
   */
  useEffect(() => {
    lastCheckedRef.current = new Date();
    updateActivity(); // Navigation counts as activity
  }, [pathname, updateActivity]);

  return null;
}
