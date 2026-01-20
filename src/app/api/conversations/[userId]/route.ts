import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { directMessages, users } from '@/lib/schema';
import { eq, or, and } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/conversations/[userId] - Get conversation with a specific user
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

    // Get all messages between these two users
    const messages = await db
      .select({
        id: directMessages.id,
        content: directMessages.content,
        senderId: directMessages.senderId,
        receiverId: directMessages.receiverId,
        createdAt: directMessages.createdAt,
        read: directMessages.read,
        archived: directMessages.archived,
        sender: {
          id: users.id,
          email: users.email,
          name: users.name,
          displayName: users.displayName,
          photoURL: users.photoURL,
        },
      })
      .from(directMessages)
      .leftJoin(users, eq(directMessages.senderId, users.id))
      .where(
        or(
          and(eq(directMessages.senderId, currentUserId), eq(directMessages.receiverId, otherUserId)),
          and(eq(directMessages.senderId, otherUserId), eq(directMessages.receiverId, currentUserId))
        )
      )
      .orderBy(directMessages.createdAt);

    // Mark messages as read
    await db
      .update(directMessages)
      .set({ read: true })
      .where(
        and(
          eq(directMessages.receiverId, currentUserId),
          eq(directMessages.senderId, otherUserId),
          eq(directMessages.read, false)
        )
      );

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
    const { archived } = await request.json();

    // Archive all messages in this conversation
    await db
      .update(directMessages)
      .set({ archived })
      .where(
        or(
          and(eq(directMessages.senderId, currentUserId), eq(directMessages.receiverId, otherUserId)),
          and(eq(directMessages.senderId, otherUserId), eq(directMessages.receiverId, currentUserId))
        )
      );

    return NextResponse.json({ 
      message: archived ? 'Conversation archived' : 'Conversation unarchived'
    });
  } catch (error) {
    console.error('Error archiving conversation:', error);
    return NextResponse.json(
      { error: 'Failed to archive conversation' },
      { status: 500 }
    );
  }
}
