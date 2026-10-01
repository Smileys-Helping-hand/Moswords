'use client';

/**
 * Client sync engine — the app's single realtime loop.
 *
 * One adaptive request to /api/sync replaces the per-screen polling loops the
 * app used to run (notifications every 3 s, each open chat every 4 s, typing
 * every 2 s, members every 5 s, call signals every 3 s …). Screens subscribe to
 * batches instead of fetching on their own timers.
 *
 * Cadence adapts to what the user is doing:
 *   call setup / "boost"      1.5 s
 *   active in the last minute 3 s
 *   idle < 5 min              7 s
 *   idle longer               15 s
 *   tab hidden                20 s
 *   offline                   paused until the browser reports online
 *   errors                    exponential backoff up to 60 s
 */

export interface SyncSender {
  id: string | null;
  name: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface MessageBase {
  id: string;
  content: string;
  contentNonce: string | null;
  isEncrypted: boolean;
  mediaUrl: string | null;
  mediaType: string | null;
  mediaEncrypted: boolean;
  mediaNonce: string | null;
  createdAt: string;
  sender: SyncSender | null;
}

export interface SyncDirectMessage extends MessageBase {
  senderId: string;
  receiverId: string;
  read: boolean;
}

export interface SyncGroupMessage extends MessageBase {
  groupChatId: string;
  userId: string;
}

export interface SyncChannelMessage extends MessageBase {
  channelId: string;
  userId: string;
}

export interface SyncSignal {
  id: string;
  fromUserId: string;
  toUserId: string;
  type: string;
  payload: string;
  callId: string;
  createdAt: string;
}

export interface SyncTyping {
  scope: 'dm' | 'group' | 'channel';
  scopeId: string;
  userId: string;
  userName: string | null;
}

export interface SyncBatch {
  cursor: string;
  serverTime: string;
  reset: boolean;
  dms: SyncDirectMessage[];
  groupMessages: SyncGroupMessage[];
  channelMessages: SyncChannelMessage[];
  signals: SyncSignal[];
  typing: SyncTyping[];
  reads: { id: string; receiverId: string; readAt: string }[];
  friendRequests: number;
  presence: Record<string, string | null>;
}

type Listener = (batch: SyncBatch) => void;

const REQUEST_TIMEOUT_MS = 15_000;
const SEEN_LIMIT = 3_000;

class SyncEngine {
  private listeners = new Set<Listener>();
  private cursor: string | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running = false;
  private inFlight = false;
  private pokePending = false;
  private failures = 0;
  private lastActivity = Date.now();
  private lastEventAt = 0;
  private fastUntil = 0;
  private seen = new Set<string>();
  private seenOrder: string[] = [];
  private presence = new Map<string, number>();
  latest: SyncBatch | null = null;

  start() {
    if (this.running || typeof window === 'undefined') return;
    this.running = true;
    document.addEventListener('visibilitychange', this.onVisibility);
    window.addEventListener('focus', this.onWake);
    window.addEventListener('online', this.onWake);
    window.addEventListener('pointerdown', this.onActivity, { passive: true });
    window.addEventListener('keydown', this.onActivity, { passive: true });
    this.schedule(0);
  }

  stop() {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    document.removeEventListener('visibilitychange', this.onVisibility);
    window.removeEventListener('focus', this.onWake);
    window.removeEventListener('online', this.onWake);
    window.removeEventListener('pointerdown', this.onActivity);
    window.removeEventListener('keydown', this.onActivity);
    this.cursor = null;
    this.latest = null;
    this.seen.clear();
    this.seenOrder = [];
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Sync soon — e.g. right after sending a message. */
  poke(delayMs = 250) {
    if (!this.running) return;
    this.lastActivity = Date.now();
    if (this.inFlight) {
      this.pokePending = true;
      return;
    }
    this.schedule(delayMs);
  }

  /** Poll fast for a while (call ringing / connecting). */
  boost(durationMs: number) {
    this.fastUntil = Math.max(this.fastUntil, Date.now() + durationMs);
    this.poke(0);
  }

  /** Include these users' last-seen in each batch while the returned function is not called. */
  watchPresence(userIds: string[]): () => void {
    for (const id of userIds) this.presence.set(id, (this.presence.get(id) || 0) + 1);
    this.poke(0);
    return () => {
      for (const id of userIds) {
        const n = (this.presence.get(id) || 1) - 1;
        if (n <= 0) this.presence.delete(id);
        else this.presence.set(id, n);
      }
    };
  }

  private onVisibility = () => {
    if (!document.hidden) this.onWake();
  };

  private onWake = () => {
    this.failures = 0;
    this.poke(0);
  };

  private lastActivityPoke = 0;
  private onActivity = () => {
    const now = Date.now();
    const wasIdle = now - this.lastActivity > 60_000;
    this.lastActivity = now;
    // Coming back from idle: catch up immediately rather than waiting out a long interval.
    if (wasIdle && now - this.lastActivityPoke > 5_000) {
      this.lastActivityPoke = now;
      this.poke(0);
    }
  };

  private interval(): number {
    if (this.failures > 0) return Math.min(60_000, 2_000 * 2 ** this.failures);
    if (document.hidden) return 20_000;
    const now = Date.now();
    if (now < this.fastUntil) return 1_500;
    const quietFor = now - Math.max(this.lastActivity, this.lastEventAt);
    if (quietFor < 60_000) return 3_000;
    if (quietFor < 5 * 60_000) return 7_000;
    return 15_000;
  }

  private schedule(ms: number) {
    if (!this.running) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.tick(), ms);
  }

  private remember(key: string): boolean {
    if (this.seen.has(key)) return false;
    this.seen.add(key);
    this.seenOrder.push(key);
    if (this.seenOrder.length > SEEN_LIMIT) {
      for (const old of this.seenOrder.splice(0, this.seenOrder.length - SEEN_LIMIT)) this.seen.delete(old);
    }
    return true;
  }

  private async tick() {
    if (!this.running) return;
    if (!navigator.onLine) {
      this.schedule(30_000); // the 'online' event wakes us sooner
      return;
    }

    this.inFlight = true;
    this.pokePending = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const params = new URLSearchParams();
      if (this.cursor) params.set('cursor', this.cursor);
      if (this.presence.size) params.set('presence', Array.from(this.presence.keys()).join(','));

      const res = await fetch(`/api/sync?${params.toString()}`, {
        cache: 'no-store',
        credentials: 'same-origin',
        signal: controller.signal,
      });
      if (res.status === 401) {
        // Let the auth layer confirm with the server before signing anyone out.
        window.dispatchEvent(new Event('moswords:auth-expired'));
      }
      if (!res.ok) throw new Error(`sync ${res.status}`);
      const raw = (await res.json()) as SyncBatch;

      this.cursor = raw.cursor;
      const batch: SyncBatch = {
        ...raw,
        dms: raw.dms.filter((m) => this.remember(`dm:${m.id}`)),
        groupMessages: raw.groupMessages.filter((m) => this.remember(`g:${m.id}`)),
        channelMessages: raw.channelMessages.filter((m) => this.remember(`c:${m.id}`)),
        signals: raw.signals.filter((s) => this.remember(`s:${s.id}`)),
      };

      if (batch.dms.length || batch.groupMessages.length || batch.channelMessages.length || batch.signals.length) {
        this.lastEventAt = Date.now();
      }

      this.latest = batch;
      this.failures = 0;
      for (const listener of Array.from(this.listeners)) {
        try {
          listener(batch);
        } catch (error) {
          console.error('sync listener failed', error);
        }
      }
    } catch {
      this.failures = Math.min(this.failures + 1, 5);
    } finally {
      clearTimeout(timeout);
      this.inFlight = false;
      this.schedule(this.pokePending ? 250 : this.interval());
    }
  }
}

export const syncEngine: SyncEngine | null = typeof window !== 'undefined' ? new SyncEngine() : null;
