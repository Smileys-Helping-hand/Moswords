/**
 * IndexedDB-based local cache for messages, conversations, and statuses.
 * Stores much more data than localStorage (~unlimited vs ~5MB).
 * Falls back to localStorage transparently.
 */

const DB_NAME = 'moswords_cache';
const DB_VERSION = 1;
const STORES = {
  messages: 'messages',
  conversations: 'conversations',
  statuses: 'statuses',
} as const;

const MAX_MESSAGES_PER_CONVO = 500;
const MESSAGE_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
const CONVO_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORES.messages)) {
        db.createObjectStore(STORES.messages, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORES.conversations)) {
        db.createObjectStore(STORES.conversations, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORES.statuses)) {
        db.createObjectStore(STORES.statuses, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet<T>(store: string, key: string): Promise<T | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(store, 'readonly');
      const req = tx.objectStore(store).get(key);
      req.onsuccess = () => resolve(req.result?.value ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function idbSet(store: string, key: string, value: unknown): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).put({ key, value, updatedAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {}
}

async function idbDelete(store: string, key: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {}
}

// ── Message cache ─────────────────────────────────────────────────────────────

export interface CachedMessage {
  id: string;
  content: string;
  contentNonce?: string | null;
  isEncrypted?: boolean | null;
  senderId: string;
  receiverId: string;
  createdAt: string;
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

interface MessageCacheEntry {
  messages: CachedMessage[];
  updatedAt: number;
}

function msgKey(userA: string, userB: string) {
  return `msgs_${[userA, userB].sort().join('_')}`;
}

export async function loadCachedMessagesIDB(
  userId: string,
  currentUserId: string
): Promise<CachedMessage[] | null> {
  if (typeof window === 'undefined' || !window.indexedDB) return null;
  const key = msgKey(userId, currentUserId);
  const entry = await idbGet<MessageCacheEntry>(STORES.messages, key);
  if (!entry) return null;
  if (Date.now() - entry.updatedAt > MESSAGE_TTL_MS) {
    await idbDelete(STORES.messages, key);
    return null;
  }
  return entry.messages;
}

export async function saveMessagesToCacheIDB(
  userId: string,
  currentUserId: string,
  messages: CachedMessage[]
): Promise<void> {
  if (typeof window === 'undefined' || !window.indexedDB) return;
  const key = msgKey(userId, currentUserId);
  const trimmed = messages.slice(-MAX_MESSAGES_PER_CONVO);
  await idbSet(STORES.messages, key, { messages: trimmed, updatedAt: Date.now() });
}

// ── Conversation list cache ───────────────────────────────────────────────────

export interface CachedConversation {
  otherUserId: string;
  otherUser?: {
    id: string;
    email: string;
    name: string | null;
    displayName: string | null;
    photoURL: string | null;
    lastSeen: string | null;
  };
  lastMessage: {
    id: string;
    content: string;
    senderId: string;
    receiverId: string;
    createdAt: string;
    read: boolean;
    archived: boolean;
    isEncrypted?: boolean | null;
  };
  unreadCount: number;
}

interface ConvoCacheEntry {
  conversations: CachedConversation[];
  updatedAt: number;
}

export async function loadConversationListIDB(
  userId: string
): Promise<CachedConversation[] | null> {
  if (typeof window === 'undefined' || !window.indexedDB) return null;
  const entry = await idbGet<ConvoCacheEntry>(STORES.conversations, `convos_${userId}`);
  if (!entry) return null;
  if (Date.now() - entry.updatedAt > CONVO_TTL_MS) {
    await idbDelete(STORES.conversations, `convos_${userId}`);
    return null;
  }
  return entry.conversations;
}

export async function saveConversationListIDB(
  userId: string,
  conversations: CachedConversation[]
): Promise<void> {
  if (typeof window === 'undefined' || !window.indexedDB) return;
  await idbSet(STORES.conversations, `convos_${userId}`, {
    conversations,
    updatedAt: Date.now(),
  });
}

// ── Status cache (12h TTL — statuses expire in 24h so this is fine) ──────────

export async function loadStatusesIDB(userId: string): Promise<unknown[] | null> {
  if (typeof window === 'undefined' || !window.indexedDB) return null;
  const entry = await idbGet<{ statuses: unknown[]; updatedAt: number }>(
    STORES.statuses,
    `statuses_${userId}`
  );
  if (!entry) return null;
  if (Date.now() - entry.updatedAt > 12 * 60 * 60 * 1000) {
    await idbDelete(STORES.statuses, `statuses_${userId}`);
    return null;
  }
  return entry.statuses;
}

export async function saveStatusesIDB(userId: string, statuses: unknown[]): Promise<void> {
  if (typeof window === 'undefined' || !window.indexedDB) return;
  await idbSet(STORES.statuses, `statuses_${userId}`, { statuses, updatedAt: Date.now() });
}
