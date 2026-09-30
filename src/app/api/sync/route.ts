import { NextRequest, NextResponse } from 'next/server';
import { and, asc, eq, gt, inArray, ne, or, sql, count } from 'drizzle-orm';
import { db, runBatch } from '@/lib/db';
import {
  channels,
  directMessages,
  friends,
  groupChatMembers,
  groupChatMessages,
  messages,
  rtcSignals,
  serverMembers,
  typingStates,
  users,
} from '@/lib/schema';
import { requireUser } from '@/lib/session';
import { isUuid } from '@/lib/validate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/sync?cursor=<ISO>&presence=<id,id>
 *
 * One request that returns everything new for the signed-in user since
 * `cursor`: direct messages, messages in their groups and servers, call
 * signals, typing indicators, read receipts and the pending friend-request
 * count. It replaces the half-dozen independent polling loops the client used
 * to run, so an open app costs one small request every few seconds instead of
 * several per second.
 *
 * Only conversations the user belongs to are ever returned.
 */

// Re-read a few seconds before the cursor so a row committed just after the
// previous response is never skipped. The client de-duplicates by id.
const OVERLAP_MS = 3_000;
// A client that slept longer than this gets `reset: true` and reloads its lists
// instead of receiving an unbounded backlog here.
const MAX_GAP_MS = 10 * 60_000;
const TYPING_TTL_SECONDS = 6;

const sender = {
  id: users.id,
  name: users.name,
  displayName: users.displayName,
  photoURL: users.photoURL,
};

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const me = auth.user.id;

  const now = new Date();
  const params = request.nextUrl.searchParams;
  const cursorParam = params.get('cursor');
  const cursor = cursorParam ? new Date(cursorParam) : null;

  const base = { cursor: now.toISOString(), serverTime: now.toISOString() };

  const friendRequestsQuery = db
    .select({ n: count() })
    .from(friends)
    .where(and(eq(friends.friendId, me), eq(friends.status, 'pending')));

  // Presence is cheap to piggy-back and saves the chat header its own poll.
  const presenceIds = (params.get('presence') || '').split(',').filter(isUuid).slice(0, 50);
  const presenceQuery = db
    .select({ id: users.id, lastSeen: users.lastSeen, privacy: users.privacySettings })
    .from(users)
    .where(presenceIds.length ? inArray(users.id, presenceIds) : sql`false`);

  // Throttled heartbeat: at most one write per user per minute.
  const heartbeat = db
    .update(users)
    .set({ lastSeen: now })
    .where(and(eq(users.id, me), sql`${users.lastSeen} < now() - interval '60 seconds'`));

  // Occasional housekeeping so the short-lived tables never grow unbounded.
  if (Math.random() < 0.02) {
    Promise.all([
      db.execute(sql`DELETE FROM rtc_signals WHERE created_at < now() - interval '1 day'`),
      db.execute(sql`DELETE FROM typing_states WHERE updated_at < now() - interval '1 hour'`),
      db.execute(sql`DELETE FROM rate_limits WHERE window_start < now() - interval '1 day'`),
    ]).catch(() => {});
  }

  try {
    if (!cursor || isNaN(cursor.getTime()) || now.getTime() - cursor.getTime() > MAX_GAP_MS) {
      const [[requests], presence] = await runBatch([friendRequestsQuery, presenceQuery, heartbeat]);
      return json({
        ...base,
        reset: !!cursorParam,
        dms: [],
        groupMessages: [],
        channelMessages: [],
        signals: [],
        typing: [],
        reads: [],
        friendRequests: Number(requests?.n ?? 0),
        presence: formatPresence(presence),
      });
    }

    const since = new Date(cursor.getTime() - OVERLAP_MS);

    const myGroupIds = db
      .select({ id: groupChatMembers.groupChatId })
      .from(groupChatMembers)
      .where(eq(groupChatMembers.userId, me));

    const myChannelIds = db
      .select({ id: channels.id })
      .from(channels)
      .innerJoin(serverMembers, eq(serverMembers.serverId, channels.serverId))
      .where(eq(serverMembers.userId, me));

    // All eight reads plus the heartbeat go to Neon in a single HTTP round trip.
    const [dms, groupMsgs, channelMsgs, signals, typing, reads, [requests], presence] = await runBatch([
      db
        .select({
          id: directMessages.id,
          content: directMessages.content,
          contentNonce: directMessages.contentNonce,
          isEncrypted: directMessages.isEncrypted,
          senderId: directMessages.senderId,
          receiverId: directMessages.receiverId,
          mediaUrl: directMessages.mediaUrl,
          mediaType: directMessages.mediaType,
          mediaEncrypted: directMessages.mediaEncrypted,
          mediaNonce: directMessages.mediaNonce,
          createdAt: directMessages.createdAt,
          read: directMessages.read,
          sender,
        })
        .from(directMessages)
        .leftJoin(users, eq(users.id, directMessages.senderId))
        .where(
          and(
            or(eq(directMessages.receiverId, me), eq(directMessages.senderId, me)),
            gt(directMessages.createdAt, since),
          ),
        )
        .orderBy(asc(directMessages.createdAt))
        .limit(200),

      db
        .select({
          id: groupChatMessages.id,
          content: groupChatMessages.content,
          contentNonce: groupChatMessages.contentNonce,
          isEncrypted: groupChatMessages.isEncrypted,
          groupChatId: groupChatMessages.groupChatId,
          userId: groupChatMessages.userId,
          mediaUrl: groupChatMessages.mediaUrl,
          mediaType: groupChatMessages.mediaType,
          mediaEncrypted: groupChatMessages.mediaEncrypted,
          mediaNonce: groupChatMessages.mediaNonce,
          createdAt: groupChatMessages.createdAt,
          sender,
        })
        .from(groupChatMessages)
        .leftJoin(users, eq(users.id, groupChatMessages.userId))
        .where(
          and(
            inArray(groupChatMessages.groupChatId, myGroupIds),
            gt(groupChatMessages.createdAt, since),
            eq(groupChatMessages.deleted, false),
          ),
        )
        .orderBy(asc(groupChatMessages.createdAt))
        .limit(200),

      db
        .select({
          id: messages.id,
          content: messages.content,
          contentNonce: messages.contentNonce,
          isEncrypted: messages.isEncrypted,
          channelId: messages.channelId,
          userId: messages.userId,
          mediaUrl: messages.mediaUrl,
          mediaType: messages.mediaType,
          mediaEncrypted: messages.mediaEncrypted,
          mediaNonce: messages.mediaNonce,
          createdAt: messages.createdAt,
          sender,
        })
        .from(messages)
        .leftJoin(users, eq(users.id, messages.userId))
        .where(
          and(
            inArray(messages.channelId, myChannelIds),
            gt(messages.createdAt, since),
            eq(messages.deleted, false),
          ),
        )
        .orderBy(asc(messages.createdAt))
        .limit(100),

      db
        .select()
        .from(rtcSignals)
        .where(and(eq(rtcSignals.toUserId, me), gt(rtcSignals.createdAt, since)))
        .orderBy(asc(rtcSignals.createdAt))
        .limit(50),

      db
        .select({
          scope: typingStates.scope,
          scopeId: typingStates.scopeId,
          userId: typingStates.userId,
          userName: typingStates.userName,
        })
        .from(typingStates)
        .where(
          and(
            ne(typingStates.userId, me),
            sql`${typingStates.updatedAt} > now() - make_interval(secs => ${TYPING_TTL_SECONDS})`,
            or(
              and(eq(typingStates.scope, 'dm'), eq(typingStates.scopeId, me)),
              and(
                eq(typingStates.scope, 'group'),
                sql`${typingStates.scopeId} IN (SELECT group_chat_id::text FROM group_chat_members WHERE user_id = ${me})`,
              ),
              and(
                eq(typingStates.scope, 'channel'),
                sql`${typingStates.scopeId} IN (SELECT c.id::text FROM channels c JOIN server_members sm ON sm.server_id = c.server_id WHERE sm.user_id = ${me})`,
              ),
            ),
          ),
        )
        .limit(50),

      db
        .select({ id: directMessages.id, receiverId: directMessages.receiverId, readAt: directMessages.readAt })
        .from(directMessages)
        .where(and(eq(directMessages.senderId, me), gt(directMessages.readAt, since)))
        .limit(500),

      friendRequestsQuery,
      presenceQuery,
      heartbeat,
    ]);

    return json({
      ...base,
      reset: false,
      dms,
      groupMessages: groupMsgs,
      channelMessages: channelMsgs,
      signals,
      typing,
      reads,
      friendRequests: Number(requests?.n ?? 0),
      presence: formatPresence(presence),
    });
  } catch (error) {
    console.error('sync failed:', (error as Error).message);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}

function formatPresence(
  rows: { id: string; lastSeen: Date; privacy: { lastSeenVisibility?: string } | null }[],
) {
  const out: Record<string, string | null> = {};
  for (const row of rows) {
    // 'contacts' visibility is treated as hidden here; the precise check lives on the profile route.
    const hidden = row.privacy?.lastSeenVisibility && row.privacy.lastSeenVisibility !== 'everyone';
    out[row.id] = hidden ? null : row.lastSeen.toISOString();
  }
  return out;
}

function json(body: unknown) {
  return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } });
}
