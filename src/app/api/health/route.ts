import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { storageBackend } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/health — deploy smoke test. Reports whether the runtime has its
 * configuration, can reach the database, and which migrations have applied.
 * Only booleans and counts: no values, no error details.
 */
export async function GET() {
  const started = Date.now();
  const env = {
    hasDatabase: !!process.env.DATABASE_URL,
    hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
    storage: storageBackend(),
  };

  let database: 'connected' | 'error' = 'error';
  let latencyMs: number | null = null;
  let migrations: { applied: number; withFailures: number } | null = null;

  try {
    await db.execute(sql`SELECT 1`);
    database = 'connected';
    latencyMs = Date.now() - started;
    const result = await db
      .execute(sql`SELECT count(*)::int AS applied, count(*) FILTER (WHERE failed_statements > 0)::int AS failed FROM app_migrations`)
      .catch(() => null);
    const row = (result as { rows?: { applied: number; failed: number }[] } | null)?.rows?.[0];
    if (row) migrations = { applied: row.applied, withFailures: row.failed };
  } catch (error) {
    console.error('health: database check failed:', (error as Error).message);
  }

  const ok = database === 'connected' && env.hasNextAuthSecret && env.hasNextAuthUrl;
  return NextResponse.json(
    { status: ok ? 'ok' : 'degraded', timestamp: new Date().toISOString(), env, database, latencyMs, migrations },
    { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
