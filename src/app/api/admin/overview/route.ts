import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db, runBatch } from '@/lib/db';
import { adminContext } from '@/lib/admin-context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/admin/overview — headline numbers and 14 days of sign-ups. Admins only. */
export async function GET() {
  const ctx = await adminContext();
  if (ctx.response) return ctx.response;

  const [stats, signups] = await runBatch([
    db.execute(sql`
      SELECT
        (SELECT count(*) FROM users)::int AS users,
        (SELECT count(*) FROM users WHERE created_at > now() - interval '1 day')::int AS new_today,
        (SELECT count(*) FROM users WHERE created_at > now() - interval '7 days')::int AS new_week,
        (SELECT count(*) FROM users WHERE last_seen > now() - interval '1 day')::int AS active_today,
        (SELECT count(*) FROM users WHERE last_seen > now() - interval '5 minutes')::int AS online_now,
        (SELECT count(*) FROM users WHERE suspended_at IS NOT NULL)::int AS suspended,
        (SELECT count(*) FROM direct_messages WHERE created_at > now() - interval '1 day')::int AS dms_today,
        (SELECT count(*) FROM group_chat_messages WHERE created_at > now() - interval '1 day')::int AS group_messages_today,
        (SELECT count(*) FROM group_chats)::int AS groups,
        (SELECT count(DISTINCT LEAST(user_id::text, friend_id::text) || GREATEST(user_id::text, friend_id::text)) FROM friends WHERE status = 'accepted')::int AS friendships,
        (SELECT count(*) FROM friends WHERE status = 'pending')::int AS pending_requests
    `),
    db.execute(sql`
      SELECT to_char(d, 'YYYY-MM-DD') AS day, count(u.id)::int AS signups
      FROM generate_series(date_trunc('day', now()) - interval '13 days', date_trunc('day', now()), interval '1 day') d
      LEFT JOIN users u ON date_trunc('day', u.created_at) = d
      GROUP BY d ORDER BY d
    `),
  ]);

  const rows = (r: unknown) => (r as { rows: Record<string, unknown>[] }).rows;
  return NextResponse.json(
    { stats: rows(stats)[0], signups: rows(signups), you: { email: ctx.admin.email, isSuperAdmin: ctx.admin.isSuperAdmin } },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
