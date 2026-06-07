'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './use-auth';

/**
 * Hook to automatically mark messages as read when they become visible
 * Uses Intersection Observer to detect when messages enter the viewport
 */
export function useMarkMessagesAsRead(messages: any[]) {
  const { session } = useAuth();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const observedRef = useRef<Set<string>>(new Set());
  const markAsReadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const batchRef = useRef<Set<string>>(new Set());

  const markMessagesAsRead = useCallback(async (messageIds: string[]) => {
    if (!messageIds.length) return;

    try {
      await Promise.all(
        messageIds.map((messageId) =>
          fetch(`/api/direct-messages/${messageId}/read`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
          }).catch((err) => {
            console.error(`Failed to mark message ${messageId} as read:`, err);
          })
        )
      );
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, []);

  const flushBatch = useCallback(() => {
    if (batchRef.current.size > 0) {
      markMessagesAsRead(Array.from(batchRef.current));
      batchRef.current.clear();
    }
  }, [markMessagesAsRead]);

  useEffect(() => {
    // Only observe direct messages (not channel messages)
    // Direct messages have both senderId and receiverId
    const messageElements = document.querySelectorAll('[data-message-id][data-is-direct="true"]');
    if (messageElements.length === 0) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const messageId = entry.target.getAttribute('data-message-id');
          if (!messageId) return;

          // Only mark messages as read if they're visible
          if (entry.isIntersecting && !observedRef.current.has(messageId)) {
            observedRef.current.add(messageId);
            batchRef.current.add(messageId);

            // Batch read marks to reduce API calls (debounce 500ms)
            if (markAsReadTimeoutRef.current) {
              clearTimeout(markAsReadTimeoutRef.current);
            }
            markAsReadTimeoutRef.current = setTimeout(flushBatch, 500);
          }
        });
      },
      {
        root: null, // Viewport
        rootMargin: '100px', // Start loading 100px before message enters viewport
        threshold: 0.1, // 10% of message needs to be visible
      }
    );

    messageElements.forEach((el) => observerRef.current?.observe(el));

    return () => {
      observerRef.current?.disconnect();
      if (markAsReadTimeoutRef.current) {
        clearTimeout(markAsReadTimeoutRef.current);
      }
      flushBatch(); // Flush any remaining batched messages
    };
  }, [messages, flushBatch]);
}
