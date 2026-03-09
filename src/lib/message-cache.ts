/**
 * WhatsApp-style local message cache using localStorage.
 * Stores the most recent 100 messages per DM conversation so that
 * the chat loads instantly from cache while the network fetch runs
 * in the background — exactly how WhatsApp works.
 */

const MAX_CACHED = 100;
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getCacheKey(userA: string, userB: string): string {
  // Sort so A↔B and B↔A use the same key
  return `mw_msgs_${[userA, userB].sort().join('_')}`;
}

export interface CachedMessage {
  id: string;
  content: string;
  contentNonce?: string | null;
  isEncrypted?: boolean | null;
  senderId: string;
  receiverId: string;
  createdAt: string; // ISO string in cache
  read: boolean;
  archived: boolean;
  mediaUrl?: string | null;
  mediaType?: string | null;
  mediaEncrypted?: boolean | null;
  mediaNonce?: string | null;
  sender?: {
    id: string;
    email: string;
    name: string | null;
    displayName: string | null;
    photoURL: string | null;
  };
}

interface CacheEntry {
  messages: CachedMessage[];
  updatedAt: number;
}

/** Load cached messages. Returns null if nothing cached or cache is stale. */
export function loadCachedMessages(
  userId: string,
  currentUserId: string,
): CachedMessage[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const key = getCacheKey(userId, currentUserId);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.updatedAt > TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return entry.messages;
  } catch {
    return null;
  }
}

/** Save messages to cache. Automatically trims to MAX_CACHED most recent. */
export function saveMessagesToCache(
  userId: string,
  currentUserId: string,
  messages: CachedMessage[],
): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getCacheKey(userId, currentUserId);
    const entry: CacheEntry = {
      messages: messages.slice(-MAX_CACHED),
      updatedAt: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

/** Clear all message caches (e.g. on sign-out). */
export function clearAllMessageCaches(): void {
  if (typeof window === 'undefined') return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('mw_msgs_')) keysToRemove.push(key);
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}
