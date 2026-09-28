import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from './db';

/**
 * Fixed-window rate limiter backed by Postgres.
 *
 * Serverless instances share no memory, so an in-process Map would give every
 * Lambda its own budget. One upsert per check keeps it cheap. Fails open: if the
 * table is missing or the DB hiccups, the request is allowed rather than locking
 * everyone out.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const result = await db.execute(sql`
      INSERT INTO rate_limits (key, window_start, count)
      VALUES (${key}, now(), 1)
      ON CONFLICT (key) DO UPDATE SET
        count = CASE
          WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSeconds})
          THEN 1 ELSE rate_limits.count + 1 END,
        window_start = CASE
          WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSeconds})
          THEN now() ELSE rate_limits.window_start END
      RETURNING count
    `);
    const count = Number((result as any).rows?.[0]?.count ?? 0);
    return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
  } catch (error) {
    console.warn('rateLimit: failing open', (error as Error).message);
    return { allowed: true, remaining: limit };
  }
}

export function clientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    'unknown'
  );
}

export function tooManyRequests(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: 'Too many requests. Please slow down.' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
  );
}
