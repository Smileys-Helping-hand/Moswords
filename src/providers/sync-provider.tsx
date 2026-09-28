'use client';

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { syncEngine, type SyncBatch, type SyncTyping } from '@/lib/sync/engine';

interface SyncContextValue {
  friendRequests: number;
}

const SyncContext = createContext<SyncContextValue>({ friendRequests: 0 });

/** Runs the single sync loop for the signed-in user. Mount once, near the root. */
export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const [friendRequests, setFriendRequests] = useState(0);

  useEffect(() => {
    if (!userId || !syncEngine) return;
    const unsubscribe = syncEngine.subscribe((batch) => setFriendRequests(batch.friendRequests));
    syncEngine.start();
    return () => {
      unsubscribe();
      syncEngine.stop();
    };
  }, [userId]);

  return <SyncContext.Provider value={{ friendRequests }}>{children}</SyncContext.Provider>;
}

export function useSyncState() {
  return useContext(SyncContext);
}

/**
 * Receive every sync batch. The handler may change between renders; only the
 * latest one is called, and the subscription itself is created once.
 */
export function useSyncBatches(handler: (batch: SyncBatch) => void) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  useEffect(() => {
    if (!syncEngine) return;
    return syncEngine.subscribe((batch) => handlerRef.current(batch));
  }, []);
}

export function pokeSync(delayMs?: number) {
  syncEngine?.poke(delayMs);
}

export function boostSync(durationMs: number) {
  syncEngine?.boost(durationMs);
}

/** Last-seen for one user, kept fresh by the sync loop. undefined = not loaded yet, null = hidden. */
export function usePresence(userId: string | null | undefined): string | null | undefined {
  const [lastSeen, setLastSeen] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    if (!userId || !syncEngine) return;
    return syncEngine.watchPresence([userId]);
  }, [userId]);
  useSyncBatches((batch) => {
    if (userId && userId in batch.presence) setLastSeen(batch.presence[userId]);
  });
  return lastSeen;
}

const TYPING_SEND_EVERY_MS = 3_000;
const TYPING_SHOW_FOR_MS = 6_000;

/**
 * Typing indicator for one conversation.
 * - `notifyTyping()` on each keystroke (throttled to one request per 3 s)
 * - `stopTyping()` after sending
 * - `typingNames` lists the other people currently typing here
 *
 * For DMs pass the other person's user id as scopeId.
 */
export function useTyping(scope: SyncTyping['scope'], scopeId: string | null | undefined, myUserId?: string) {
  const [typers, setTypers] = useState<Map<string, { name: string; at: number }>>(new Map());
  const lastSentRef = useRef(0);

  useSyncBatches((batch) => {
    if (!scopeId) return;
    const now = Date.now();
    const relevant = batch.typing.filter((t) =>
      scope === 'dm'
        ? t.scope === 'dm' && t.userId === scopeId && t.scopeId === myUserId
        : t.scope === scope && t.scopeId === scopeId,
    );
    setTypers((prev) => {
      const next = new Map<string, { name: string; at: number }>();
      prev.forEach((v, k) => {
        if (now - v.at < TYPING_SHOW_FOR_MS) next.set(k, v);
      });
      for (const t of relevant) next.set(t.userId, { name: t.userName || 'Someone', at: now });
      // A message from someone means they stopped typing.
      const senders = new Set<string>([
        ...batch.dms.map((m) => m.senderId),
        ...batch.groupMessages.map((m) => m.userId),
        ...batch.channelMessages.map((m) => m.userId),
      ]);
      senders.forEach((id) => next.delete(id));
      return next.size === prev.size && Array.from(next.keys()).every((k) => prev.has(k)) ? prev : next;
    });
  });

  // Expire indicators even if no further batch arrives.
  useEffect(() => {
    if (typers.size === 0) return;
    const t = setTimeout(() => {
      const now = Date.now();
      setTypers((prev) => {
        const next = new Map(prev);
        next.forEach((v, k) => {
          if (now - v.at >= TYPING_SHOW_FOR_MS) next.delete(k);
        });
        return next;
      });
    }, TYPING_SHOW_FOR_MS);
    return () => clearTimeout(t);
  }, [typers]);

  const send = useCallback(
    (method: 'POST' | 'DELETE') => {
      if (!scopeId) return;
      fetch('/api/typing', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope, scopeId }),
        keepalive: true,
      }).catch(() => {});
    },
    [scope, scopeId],
  );

  const notifyTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastSentRef.current < TYPING_SEND_EVERY_MS) return;
    lastSentRef.current = now;
    send('POST');
  }, [send]);

  const stopTyping = useCallback(() => {
    if (!lastSentRef.current) return;
    lastSentRef.current = 0;
    send('DELETE');
  }, [send]);

  const typingNames = Array.from(typers.values()).map((t) => t.name);
  return { typingNames, notifyTyping, stopTyping };
}

export function formatTyping(names: string[]): string | null {
  if (names.length === 0) return null;
  if (names.length === 1) return `${names[0]} is typing…`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing…`;
  return `${names[0]} and ${names.length - 1} others are typing…`;
}
