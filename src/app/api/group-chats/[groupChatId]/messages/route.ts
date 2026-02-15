import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { groupChatMessages, groupChatMembers, users } from '@/lib/schema';
import { eq, and, desc } from 'drizzle-orm';

// GET /api/group-chats/[groupChatId]/messages - Get messages for a group chat
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupChatId: string }> }
) {
  try {
    const { groupChatId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Check if user is a member
    const [membership] = await db
      .select()
      .from(groupChatMembers)
      .where(
        and(
          eq(groupChatMembers.groupChatId, groupChatId),
          eq(groupChatMembers.userId, userId)
        )
      );

    if (!membership) {
      return NextResponse.json(
        { error: 'Not a member of this group' },
        { status: 403 }
      );
    }

    // Get messages with sender info
    const messages = await db
      .select({
        id: groupChatMessages.id,
        content: groupChatMessages.content,
        contentNonce: groupChatMessages.contentNonce,
        isEncrypted: groupChatMessages.isEncrypted,
        userId: groupChatMessages.userId,
        groupChatId: groupChatMessages.groupChatId,
        createdAt: groupChatMessages.createdAt,
        deleted: groupChatMessages.deleted,
        mediaUrl: groupChatMessages.mediaUrl,
        mediaType: groupChatMessages.mediaType,
        mediaEncrypted: groupChatMessages.mediaEncrypted,
        mediaNonce: groupChatMessages.mediaNonce,
        sender: {
          id: users.id,
          email: users.email,
          name: users.name,
          displayName: users.displayName,
          photoURL: users.photoURL,
        },
      })
      .from(groupChatMessages)
      .leftJoin(users, eq(groupChatMessages.userId, users.id))
      .where(
        and(
          eq(groupChatMessages.groupChatId, groupChatId),
          eq(groupChatMessages.deleted, false)
        )
      )
      .orderBy(desc(groupChatMessages.createdAt))
      .limit(100);

    return NextResponse.json({ messages: messages.reverse() });
  } catch (error) {
    console.error('Error fetching group chat messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// POST /api/group-chats/[groupChatId]/messages - Send a message to group chat
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupChatId: string }> }
) {
  try {
    const { groupChatId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const {
      content,
      contentNonce,
      isEncrypted,
      mediaUrl,
      mediaType,
      mediaEncrypted,
      mediaNonce,
    } = await request.json();

    const hasContent = typeof content === 'string' && content.trim().length > 0;
    const hasMedia = !!mediaUrl;

    if (!hasContent && !hasMedia) {
      return NextResponse.json(
        { error: 'Message content or media is required' },
        { status: 400 }
      );
    }

    // Check if user is a member
    const [membership] = await db
      .select()
      .from(groupChatMembers)
      .where(
        and(
          eq(groupChatMembers.groupChatId, groupChatId),
          eq(groupChatMembers.userId, userId)
        )
      );

    if (!membership) {
      return NextResponse.json(
        { error: 'Not a member of this group' },
        { status: 403 }
      );
    }

    // Create the message
    const [newMessage] = await db
      .insert(groupChatMessages)
      .values({
        groupChatId,
        userId,
        content: hasContent ? content.trim() : '',
        contentNonce: contentNonce || null,
        isEncrypted: !!isEncrypted,
        ...(mediaUrl && { mediaUrl }),
        ...(mediaType && { mediaType }),
        mediaEncrypted: !!mediaEncrypted,
        mediaNonce: mediaNonce || null,
      })
      .returning();

    // Get sender info
    const [sender] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        displayName: users.displayName,
        photoURL: users.photoURL,
      })
      .from(users)
      .where(eq(users.id, userId));

    return NextResponse.json({
      message: {
        ...newMessage,
        sender,
      },
    });
  } catch (error) {
    console.error('Error sending group chat message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
