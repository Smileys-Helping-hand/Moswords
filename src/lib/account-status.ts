import { eq } from 'drizzle-orm';
import { db } from './db';
import { users } from './schema';

/**
 * Is this account suspended (or deleted)? Checked on every authenticated
 * request, so answers are cached per server instance for 60 s: a suspension
 * takes effect within a minute without adding a query to every call.
 */
const TTL_MS = 60_000;
const cache = new Map<string, { blocked: boolean; at: number }>();

export async function isAccountBlocked(userId: string): Promise<boolean> {
  const hit = cache.get(userId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.blocked;
  try {
    const [row] = await db
      .select({ suspendedAt: users.suspendedAt })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    const blocked = !row || !!row.suspendedAt; // deleted accounts count as blocked
    cache.set(userId, { blocked, at: Date.now() });
    if (cache.size > 5000) cache.clear();
    return blocked;
  } catch {
    return false; // never lock everyone out because of a DB hiccup
  }
}

/** Call after an admin changes an account so this instance reacts immediately. */
export function forgetAccountStatus(userId: string) {
  cache.delete(userId);
}
