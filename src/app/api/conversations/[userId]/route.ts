import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { conversationClears, directMessages, users } from '@/lib/schema';
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

    // "Clear chat" hides everything before the clear point for this user only.
    const [cleared] = await db
      .select({ at: conversationClears.clearedAt })
      .from(conversationClears)
      .where(and(eq(conversationClears.userId, currentUserId), eq(conversationClears.otherUserId, otherUserId)))
      .limit(1)
      .catch(() => [] as { at: Date }[]);

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
    const messagesBetween = cleared?.at ? and(pair, gt(directMessages.createdAt, cleared.at)) : pair;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let messages: any[] = [];

    if (afterId) {
      // ── Incremental fetch: only messages newer than afterId ──────────────
      // First look up the createdAt timestamp of the anchor message so we can
      // use a range query (avoids a full table scan).
      const [anchor] = await db
        .select({ createdAt: directMessages.createdAt })
        .from(directMessages)
        .where(eq(directMessages.id, afterId))
        .limit(1);

      if (anchor) {
        messages = await db
          .select(MESSAGE_SELECT)
          .from(directMessages)
          .leftJoin(users, eq(directMessages.senderId, users.id))
          .where(and(messagesBetween!, gt(directMessages.createdAt, anchor.createdAt)))
          .orderBy(asc(directMessages.createdAt))
          .limit(200); // Allow up to 200 new messages per poll burst
      } else {
        messages = [];
      }
    } else {
      // ── Initial load: most recent N messages ─────────────────────────────
      const rows = await db
        .select(MESSAGE_SELECT)
        .from(directMessages)
        .leftJoin(users, eq(directMessages.senderId, users.id))
        .where(messagesBetween!)
        .orderBy(desc(directMessages.createdAt))
        .limit(limit);
      // Reverse so they display oldest→newest in the UI
      messages = rows.reverse();
    }

    await markRead(currentUserId, otherUserId);

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

    const updatePayload: Record<string, unknown> = {};
    if (typeof body.archived === 'boolean') updatePayload.archived = body.archived;

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    // Apply update to all messages in this conversation
    await db
      .update(directMessages)
      .set(updatePayload as any)
      .where(
        or(
          and(eq(directMessages.senderId, currentUserId), eq(directMessages.receiverId, otherUserId)),
          and(eq(directMessages.senderId, otherUserId), eq(directMessages.receiverId, currentUserId))
        )
      );

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

/** Mark the other user's messages to me as read, unless I turned read receipts off. */
async function markRead(currentUserId: string, otherUserId: string) {
  try {
    const [me] = await db
      .select({ privacySettings: users.privacySettings })
      .from(users)
      .where(eq(users.id, currentUserId))
      .limit(1);
    if (me?.privacySettings?.readReceipts === false) return;

    await db
      .update(directMessages)
      .set({ read: true, readAt: sql`now()` })
      .where(
        and(
          eq(directMessages.receiverId, currentUserId),
          eq(directMessages.senderId, otherUserId),
          eq(directMessages.read, false),
        ),
      );
  } catch (error) {
    console.warn('markRead failed:', (error as Error).message);
  }
}
