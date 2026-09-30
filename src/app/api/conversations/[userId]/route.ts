import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db, runBatch } from '@/lib/db';
import { chatPreferences, conversationClears, directMessages, users } from '@/lib/schema';
import { eq, or, and, gt, desc, asc, sql } from 'drizzle-orm';
import { isUuid } from '@/lib/validate';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MESSAGE_SELECT = {
  id: directMessages.id,
  content: directMessages.content,
  contentNonce: directMessages.contentNonce,
  isEncrypted: directMessages.isEncrypted,
  senderId: directMessages.senderId,
  receiverId: directMessages.receiverId,
  createdAt: directMessages.createdAt,
  read: directMessages.read,
  archived: directMessages.archived,
  mediaUrl: directMessages.mediaUrl,
  mediaType: directMessages.mediaType,
  mediaEncrypted: directMessages.mediaEncrypted,
  mediaNonce: directMessages.mediaNonce,
  sender: {
    id: users.id,
    email: users.email,
    name: users.name,
    displayName: users.displayName,
    photoURL: users.photoURL,
  },
} as const;

// GET /api/conversations/[userId]
// ?limit=N     — how many recent messages to return on initial load (default 50, max 100)
// ?after=<id>  — incremental polling: only return messages newer than this message ID
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUserId = (session.user as any).id;
    const { userId: otherUserId } = await context.params;
    const { searchParams } = new URL(request.url);

    if (!isUuid(otherUserId)) {
      return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
    }

    const afterId = searchParams.get('after'); // incremental fetch (older clients)
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10) || 50, 1), 100);

    if (afterId && !isUuid(afterId)) {
      return NextResponse.json({ error: 'Invalid cursor' }, { status: 400 });
    }

    const pair = or(
      and(
        eq(directMessages.senderId, currentUserId),
        eq(directMessages.receiverId, otherUserId),
      ),
      and(
        eq(directMessages.senderId, otherUserId),
        eq(directMessages.receiverId, currentUserId),
      ),
    );
    // "Clear chat" hides everything before the clear point for this user only.
    const afterClear = gt(
      directMessages.createdAt,
      sql`COALESCE((SELECT cleared_at FROM conversation_clears WHERE user_id = ${currentUserId} AND other_user_id = ${otherUserId}), '-infinity'::timestamp)`,
    );

    // Messages + mark-as-read in a single round trip.
    const query = afterId
      ? db
          .select(MESSAGE_SELECT)
          .from(directMessages)
          .leftJoin(users, eq(directMessages.senderId, users.id))
          .where(
            and(
              pair,
              afterClear,
              gt(directMessages.createdAt, sql`(SELECT created_at FROM direct_messages WHERE id = ${afterId})`),
            ),
          )
          .orderBy(asc(directMessages.createdAt))
          .limit(200)
      : db
          .select(MESSAGE_SELECT)
          .from(directMessages)
          .leftJoin(users, eq(directMessages.senderId, users.id))
          .where(and(pair, afterClear))
          .orderBy(desc(directMessages.createdAt))
          .limit(limit);

    const [rows] = await runBatch([query, markReadQuery(currentUserId, otherUserId)]);
    // Initial loads come newest-first from the index; show oldest→newest.
    const messages = afterId ? rows : [...rows].reverse();

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversation' },
      { status: 500 }
    );
  }
}

// PATCH /api/conversations/[userId] - Archive/unarchive conversation
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUserId = (session.user as any).id;
    const { userId: otherUserId } = await context.params;
    const body = await request.json();

    if (!isUuid(otherUserId)) {
      return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
    }

    if (body.read === true) {
      await markRead(currentUserId, otherUserId);
      if (typeof body.archived !== 'boolean') return NextResponse.json({ ok: true });
    }

    if (typeof body.archived !== 'boolean') {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    // Archiving is per user: it only hides the chat from *my* list.
    await db
      .insert(chatPreferences)
      .values({ userId: currentUserId, chatType: 'dm', chatId: otherUserId, archived: body.archived })
      .onConflictDoUpdate({
        target: [chatPreferences.userId, chatPreferences.chatType, chatPreferences.chatId],
        set: { archived: body.archived, updatedAt: new Date() },
      });

    return NextResponse.json({ message: 'Conversation updated' });
  } catch (error) {
    console.error('Error updating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to update conversation' },
      { status: 500 }
    );
  }
}

// DELETE /api/conversations/[userId] - Clear the chat for the current user only.
// The other participant keeps their history (WhatsApp "Clear chat" semantics).
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUserId = (session.user as any).id;
    const { userId: otherUserId } = await context.params;
    if (!isUuid(otherUserId)) {
      return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
    }

    await db
      .insert(conversationClears)
      .values({ userId: currentUserId, otherUserId, clearedAt: new Date() })
      .onConflictDoUpdate({
        target: [conversationClears.userId, conversationClears.otherUserId],
        set: { clearedAt: new Date() },
      });

    return NextResponse.json({ message: 'Chat cleared' });
  } catch (error) {
    console.error('Error clearing conversation:', error);
    return NextResponse.json(
      { error: 'Failed to clear conversation' },
      { status: 500 }
    );
  }
}

/**
 * Mark the other user's messages to me as read — unless I turned read receipts
 * off (checked inside the same statement, so it costs no extra round trip).
 */
function markReadQuery(currentUserId: string, otherUserId: string) {
  return db
    .update(directMessages)
    .set({ read: true, readAt: sql`now()` })
    .where(
      and(
        eq(directMessages.receiverId, currentUserId),
        eq(directMessages.senderId, otherUserId),
        eq(directMessages.read, false),
        sql`COALESCE((SELECT (privacy_settings->>'readReceipts')::boolean FROM users WHERE id = ${currentUserId}), true)`,
      ),
    );
}

async function markRead(currentUserId: string, otherUserId: string) {
  try {
    await markReadQuery(currentUserId, otherUserId);
  } catch (error) {
    console.warn('markRead failed:', (error as Error).message);
  }
}
