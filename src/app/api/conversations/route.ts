import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Row {
  other_id: string;
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  created_at: string | Date;
  read: boolean;
  archived: boolean;
  is_encrypted: boolean | null;
  media_type: string | null;
  unread_count: number;
  email: string;
  name: string | null;
  display_name: string | null;
  photo_url: string | null;
  last_seen: string | Date | null;
}

/**
 * GET /api/conversations — every DM conversation with its latest message and
 * unread count, newest first. One query: DISTINCT ON picks the latest message
 * per partner, so conversations never fall off the list just because another
 * chat was busy. Honors per-user "clear chat".
 */
export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const me = auth.user.id;

  try {
    let rows: Row[];
    try {
      rows = await query(me, true);
    } catch (error) {
      // conversation_clears may not exist yet if a migration failed; degrade gracefully.
      console.warn('conversations: falling back without clears:', (error as Error).message);
      rows = await query(me, false);
    }

    const conversations = rows.map((r) => ({
      otherUserId: r.other_id,
      lastMessage: {
        id: r.id,
        content: r.content,
        senderId: r.sender_id,
        receiverId: r.receiver_id,
        createdAt: utc(r.created_at),
        read: r.read,
        archived: r.archived,
        isEncrypted: r.is_encrypted,
        mediaType: r.media_type,
      },
      otherUser: {
        id: r.other_id,
        email: r.email,
        name: r.name,
        displayName: r.display_name,
        photoURL: r.photo_url,
        lastSeen: r.last_seen ? utc(r.last_seen) : null,
      },
      unreadCount: Number(r.unread_count) || 0,
    }));

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('Error listing conversations:', error);
    return NextResponse.json({ error: 'Failed to list conversations' }, { status: 500 });
  }
}

async function query(me: string, withClears: boolean): Promise<Row[]> {
  const visible = withClears
    ? sql`
        SELECT m.* FROM mine m
        LEFT JOIN conversation_clears cc ON cc.user_id = ${me} AND cc.other_user_id = m.other_id
        WHERE cc.cleared_at IS NULL OR m.created_at > cc.cleared_at`
    : sql`SELECT * FROM mine`;

  const result = await db.execute(sql`
    WITH mine AS (
      SELECT dm.id, dm.content, dm.sender_id, dm.receiver_id, dm.created_at, dm.read,
             dm.archived, dm.is_encrypted, dm.media_type,
             CASE WHEN dm.sender_id = ${me} THEN dm.receiver_id ELSE dm.sender_id END AS other_id
      FROM direct_messages dm
      WHERE dm.sender_id = ${me} OR dm.receiver_id = ${me}
    ),
    visible AS (${visible}),
    latest AS (
      SELECT DISTINCT ON (other_id) *
      FROM visible
      ORDER BY other_id, created_at DESC
    ),
    unread AS (
      SELECT other_id, count(*)::int AS unread_count
      FROM visible
      WHERE receiver_id = ${me} AND read = false AND archived = false
      GROUP BY other_id
    )
    SELECT l.other_id, l.id, l.content, l.sender_id, l.receiver_id, l.created_at, l.read,
           l.archived, l.is_encrypted, l.media_type,
           COALESCE(u.unread_count, 0) AS unread_count,
           us.email, us.name, us.display_name, us.photo_url, us.last_seen
    FROM latest l
    JOIN users us ON us.id = l.other_id
    LEFT JOIN unread u ON u.other_id = l.other_id
    ORDER BY l.created_at DESC
    LIMIT 300
  `);
  return (result as unknown as { rows: Row[] }).rows;
}

/** Columns are `timestamp without time zone` holding UTC; parse them as UTC everywhere. */
function utc(value: string | Date): Date {
  if (value instanceof Date) return value;
  return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value.replace(' ', 'T')}Z`);
}
