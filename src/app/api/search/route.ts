import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/session';
import { rateLimit, tooManyRequests } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface SearchResult {
  kind: 'dm' | 'group' | 'channel';
  id: string;
  href: string;
  title: string;
  senderName: string;
  snippet: string;
  createdAt: string;
}

interface Row {
  id: string;
  content: string;
  created_at: string | Date;
  target_id: string;
  title: string | null;
  sender_name: string | null;
}

/**
 * GET /api/search?q=… — search the signed-in user's own conversations:
 * DMs (respecting "clear chat"), groups they belong to and channels in their
 * servers. Only plaintext messages are searchable; end-to-end encrypted ones
 * are opaque to the server by design.
 */
export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const me = auth.user.id;

  const limit = await rateLimit(`search-msg:${me}`, 30, 60);
  if (!limit.allowed) return tooManyRequests(60);

  const q = (request.nextUrl.searchParams.get('q') || '').trim().slice(0, 100);
  if (q.length < 2) return NextResponse.json({ results: [] });
  const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

  try {
    const [dms, groups, channels] = await Promise.all([
      db.execute(sql`
        SELECT dm.id, dm.content, dm.created_at,
               CASE WHEN dm.sender_id = ${me} THEN dm.receiver_id ELSE dm.sender_id END AS target_id,
               COALESCE(o.display_name, o.name) AS title,
               COALESCE(s.display_name, s.name) AS sender_name
        FROM direct_messages dm
        JOIN users o ON o.id = CASE WHEN dm.sender_id = ${me} THEN dm.receiver_id ELSE dm.sender_id END
        JOIN users s ON s.id = dm.sender_id
        LEFT JOIN conversation_clears cc
          ON cc.user_id = ${me}
         AND cc.other_user_id = CASE WHEN dm.sender_id = ${me} THEN dm.receiver_id ELSE dm.sender_id END
        WHERE (dm.sender_id = ${me} OR dm.receiver_id = ${me})
          AND dm.is_encrypted = false
          AND dm.content ILIKE ${pattern}
          AND (cc.cleared_at IS NULL OR dm.created_at > cc.cleared_at)
        ORDER BY dm.created_at DESC
        LIMIT 20`),
      db.execute(sql`
        SELECT m.id, m.content, m.created_at, m.group_chat_id AS target_id,
               g.name AS title, COALESCE(u.display_name, u.name) AS sender_name
        FROM group_chat_messages m
        JOIN group_chats g ON g.id = m.group_chat_id
        JOIN users u ON u.id = m.user_id
        WHERE m.group_chat_id IN (SELECT group_chat_id FROM group_chat_members WHERE user_id = ${me})
          AND m.deleted = false AND m.is_encrypted = false
          AND m.content ILIKE ${pattern}
        ORDER BY m.created_at DESC
        LIMIT 20`),
      db.execute(sql`
        SELECT m.id, m.content, m.created_at, m.channel_id AS target_id,
               '#' || c.name || ' · ' || s.name AS title, COALESCE(u.display_name, u.name) AS sender_name,
               c.server_id
        FROM messages m
        JOIN channels c ON c.id = m.channel_id
        JOIN servers s ON s.id = c.server_id
        JOIN users u ON u.id = m.user_id
        WHERE c.server_id IN (SELECT server_id FROM server_members WHERE user_id = ${me})
          AND m.deleted = false AND m.is_encrypted = false
          AND m.content ILIKE ${pattern}
        ORDER BY m.created_at DESC
        LIMIT 20`),
    ]);

    const rows = (r: unknown) => ((r as { rows?: (Row & { server_id?: string })[] }).rows ?? []);
    const results: SearchResult[] = [
      ...rows(dms).map((r) => shape('dm', r, `/dm/${r.target_id}`, q)),
      ...rows(groups).map((r) => shape('group', r, `/group/${r.target_id}`, q)),
      ...rows(channels).map((r) => shape('channel', r, `/servers/${r.server_id}/channels/${r.target_id}`, q)),
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return NextResponse.json({ results: results.slice(0, 40) });
  } catch (error) {
    console.error('search failed:', (error as Error).message);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}

function shape(kind: SearchResult['kind'], r: Row, href: string, q: string): SearchResult {
  return {
    kind,
    id: r.id,
    href,
    title: r.title || 'Conversation',
    senderName: r.sender_name || 'Someone',
    snippet: snippet(r.content, q),
    createdAt: toIso(r.created_at),
  };
}

/** ~120 characters around the first match. */
function snippet(content: string, q: string): string {
  const at = content.toLowerCase().indexOf(q.toLowerCase());
  if (at < 0 || content.length <= 120) return content.slice(0, 120);
  const start = Math.max(0, at - 40);
  return `${start > 0 ? '…' : ''}${content.slice(start, start + 120)}${start + 120 < content.length ? '…' : ''}`;
}

function toIso(value: string | Date): string {
  if (value instanceof Date) return value.toISOString();
  return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value.replace(' ', 'T')}Z`).toISOString();
}
