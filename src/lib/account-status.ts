import { eq } from 'drizzle-orm';
import { db } from './db';
import { users } from './schema';

/**
 * Should this session end? True when the account is suspended or deleted, or
 * when the session signed in before the account's last password change.
 * Checked on every authenticated request, so lookups are cached per server
 * instance for 60 s: changes take effect within a minute without adding a
 * query to every call.
 */
const TTL_MS = 60_000;
// One cache per process, not per module copy: route bundles can each load their
// own copy of this file, and forgetAccountStatus() must reach all of them.
type Entry = { blocked: boolean; passwordChangedAt: number; at: number };
const cache: Map<string, Entry> = ((globalThis as { __accountStatusCache?: Map<string, Entry> }).__accountStatusCache ??= new Map());

export async function isAccountBlocked(userId: string, signedInAt = 0): Promise<boolean> {
  let entry = cache.get(userId);
  if (!entry || Date.now() - entry.at >= TTL_MS) {
    try {
      const [row] = await db
        .select({ suspendedAt: users.suspendedAt, passwordChangedAt: users.passwordChangedAt })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      entry = {
        blocked: !row || !!row.suspendedAt, // deleted accounts count as blocked
        passwordChangedAt: row?.passwordChangedAt ? row.passwordChangedAt.getTime() : 0,
        at: Date.now(),
      };
      cache.set(userId, entry);
      if (cache.size > 5000) cache.clear();
    } catch {
      return false; // never lock everyone out because of a DB hiccup
    }
  }
  return entry.blocked || (entry.passwordChangedAt > 0 && signedInAt < entry.passwordChangedAt);
}

/** Call after an account changes so this instance reacts immediately. */
export function forgetAccountStatus(userId: string) {
  cache.delete(userId);
}
