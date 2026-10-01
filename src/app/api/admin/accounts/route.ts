import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db, runBatch } from '@/lib/db';
import { adminContext } from '@/lib/admin-context';
import { isSuperAdmin } from '@/lib/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PAGE = 50;

/**
 * GET /api/admin/accounts?q=&filter=all|active|suspended|admins|new&page=0
 * Every account with activity counts. Admins only.
 */
export async function GET(request: NextRequest) {
  const ctx = await adminContext();
  if (ctx.response) return ctx.response;

  const params = request.nextUrl.searchParams;
  const q = (params.get('q') || '').trim().slice(0, 100);
  const filter = params.get('filter') || 'all';
  const page = Math.max(0, Math.min(1000, parseInt(params.get('page') || '0', 10) || 0));
  const like = `%${q.replace(/[\\%_]/g, (c) => '\\' + c)}%`;

  const where = sql.join(
    [
      sql`true`,
      q ? sql`(u.email ILIKE ${like} OR u.display_name ILIKE ${like} OR u.name ILIKE ${like} OR u.username ILIKE ${like})` : sql`true`,
      filter === 'suspended' ? sql`u.suspended_at IS NOT NULL` : sql`true`,
      filter === 'admins' ? sql`au.id IS NOT NULL` : sql`true`,
      filter === 'new' ? sql`u.created_at > now() - interval '7 days'` : sql`true`,
      filter === 'active' ? sql`u.last_seen > now() - interval '1 day'` : sql`true`,
    ],
    sql` AND `,
  );

  const [list, total] = await runBatch([
    db.execute(sql`
      SELECT u.id, u.email, u.username, u.display_name, u.name, u.photo_url, u.created_at, u.last_seen,
             u.suspended_at, u.suspended_reason, (au.id IS NOT NULL) AS is_admin,
             (SELECT count(DISTINCT CASE WHEN f.user_id = u.id THEN f.friend_id ELSE f.user_id END)
                FROM friends f WHERE (f.user_id = u.id OR f.friend_id = u.id) AND f.status = 'accepted')::int AS friends,
             ((SELECT count(*) FROM direct_messages d WHERE d.sender_id = u.id)
              + (SELECT count(*) FROM group_chat_messages g WHERE g.user_id = u.id))::int AS messages
      FROM users u
      LEFT JOIN admin_users au ON au.user_id = u.id
      WHERE ${where}
      ORDER BY u.created_at DESC
      LIMIT ${PAGE} OFFSET ${page * PAGE}
    `),
    db.execute(sql`SELECT count(*)::int AS n FROM users u LEFT JOIN admin_users au ON au.user_id = u.id WHERE ${where}`),
  ]);

  const rows = (list as unknown as { rows: Record<string, any>[] }).rows;
  const n = (total as unknown as { rows: { n: number }[] }).rows[0]?.n ?? 0;
  const iso = (v: unknown) => (v ? new Date(typeof v === 'string' && !/[zZ]|[+-]\d\d:?\d\d$/.test(v) ? `${v.replace(' ', 'T')}Z` : (v as string)).toISOString() : null);

  return NextResponse.json({
    accounts: rows.map((r) => ({
      id: r.id,
      email: r.email,
      username: r.username,
      name: r.display_name || r.name || r.email.split('@')[0],
      photoURL: r.photo_url,
      createdAt: iso(r.created_at),
      lastSeen: iso(r.last_seen),
      suspendedAt: iso(r.suspended_at),
      suspendedReason: r.suspended_reason,
      isAdmin: !!r.is_admin || isSuperAdmin(r.email),
      isSuperAdmin: isSuperAdmin(r.email),
      friends: r.friends,
      messages: r.messages,
    })),
    total: n,
    page,
    pageSize: PAGE,
  }, { headers: { 'Cache-Control': 'no-store' } });
}
