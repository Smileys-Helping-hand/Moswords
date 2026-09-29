/** Someone is "online" if their last heartbeat was within 90 s (the sync loop beats at most once a minute). */
export const ONLINE_WINDOW_MS = 90_000;

export function isOnline(lastSeen: string | Date | null | undefined): boolean {
  if (!lastSeen) return false;
  if (lastSeen === 'online') return true;
  const t = new Date(lastSeen).getTime();
  return !Number.isNaN(t) && Date.now() - t < ONLINE_WINDOW_MS;
}
