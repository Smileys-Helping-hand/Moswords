import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { directMessages, users } from '@/lib/schema';
import { eq, or, and, gt, desc, asc } from 'drizzle-orm';

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

    const afterId = searchParams.get('after'); // incremental polling
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

    const messagesBetween = or(
      and(
        eq(directMessages.senderId, currentUserId),
        eq(directMessages.receiverId, otherUserId),
      ),
      and(
        eq(directMessages.senderId, otherUserId),
        eq(directMessages.receiverId, currentUserId),
      ),
    );

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

    // Mark received unread messages as read (fire-and-forget, non-blocking)
    db.update(directMessages)
      .set({ read: true })
      .where(
        and(
          eq(directMessages.receiverId, currentUserId),
          eq(directMessages.senderId, otherUserId),
          eq(directMessages.read, false),
        ),
      )
      .catch(() => {}); // ignore read-receipt errors to not block the response

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

// DELETE /api/conversations/[userId] - Delete all messages in a conversation
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

    // Delete messages sent by the current user only (soft-delete from their view)
    // To fully delete the conversation the other user's messages are also removed
    await db
      .delete(directMessages)
      .where(
        or(
          and(eq(directMessages.senderId, currentUserId), eq(directMessages.receiverId, otherUserId)),
          and(eq(directMessages.senderId, otherUserId), eq(directMessages.receiverId, currentUserId))
        )
      );

    return NextResponse.json({ message: 'Conversation deleted' });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    );
  }
}
