"use client";

import { useEffect, useRef, useCallback } from 'react';

interface UseSoundEffectOptions {
  src: string;
  volume?: number;
  enabled?: boolean;
}

export function useSoundEffect({ src, volume = 0.5, enabled = true }: UseSoundEffectOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastPlayTimeRef = useRef<number>(0);
  const debounceMs = 100; // Minimum time between plays

  // Initialize audio element
  useEffect(() => {
    if (typeof window === 'undefined' || !enabled) return;

    const audio = new Audio(src);
    audio.volume = volume;
    audio.preload = 'auto';
    audioRef.current = audio;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [src, volume, enabled]);

  // Play sound with debounce
  const play = useCallback(() => {
    if (!enabled || !audioRef.current) return;

    const now = Date.now();
    const timeSinceLastPlay = now - lastPlayTimeRef.current;

    // Debounce: don't play if last sound was less than 100ms ago
    if (timeSinceLastPlay < debounceMs) {
      return;
    }

    lastPlayTimeRef.current = now;

    // Reset and play
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch((error) => {
      // Silently fail if autoplay is blocked or file not found
      if (error.name === 'NotFoundError' || error.name === 'NotSupportedError') {
        console.debug('Sound file not found, using fallback beep');
        // Import and play fallback beep
        import('@/lib/sound-generator').then(({ playBeep }) => playBeep());
      } else {
        console.debug('Sound play failed:', error);
      }
    });
  }, [enabled, debounceMs]);

  return { play };
}

/**
 * Hook to play sound when new messages arrive from other users
 */
export function useMessageSound(
  messages: any[],
  currentUserId: string | undefined,
  enabled: boolean = true
) {
  const { play } = useSoundEffect({
    src: '/sounds/message-pop.mp3',
    volume: 0.3,
    enabled,
  });

  const prevMessageCountRef = useRef(messages.length);
  const previousMessagesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!currentUserId || messages.length === 0) {
      prevMessageCountRef.current = messages.length;
      return;
    }

    // Check for new messages
    if (messages.length > prevMessageCountRef.current) {
      // Get messages that weren't in the previous render
      const newMessages = messages.filter(
        (msg) => !previousMessagesRef.current.has(msg.id)
      );

      // Play sound if any new message is from another user
      const hasNewMessageFromOthers = newMessages.some(
        (msg) => 
          msg.author?.uid !== currentUserId && 
          msg.status === 'sent' // Only play for successfully sent messages
      );

      if (hasNewMessageFromOthers) {
        play();
      }
    }

    // Update refs
    prevMessageCountRef.current = messages.length;
    previousMessagesRef.current = new Set(messages.map((m) => m.id));
  }, [messages, currentUserId, play]);
}
