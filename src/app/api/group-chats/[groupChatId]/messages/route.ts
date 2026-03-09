import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
export const dynamic = 'force-dynamic';
import { db } from '@/lib/db';
import { groupChatMessages, groupChatMembers, users } from '@/lib/schema';
import { eq, and, desc, asc, gt } from 'drizzle-orm';

// GET /api/group-chats/[groupChatId]/messages
// ?limit=N     — max messages to return on initial load (default 50, max 100)
// ?after=<id>  — incremental: only messages newer than this message ID
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

    const { searchParams } = new URL(request.url);
    const afterId = searchParams.get('after');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

    const MSG_SELECT = {
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
    } as const;

    const baseWhere = and(
      eq(groupChatMessages.groupChatId, groupChatId),
      eq(groupChatMessages.deleted, false),
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let messages: any[];

    if (afterId) {
      const [anchor] = await db
        .select({ createdAt: groupChatMessages.createdAt })
        .from(groupChatMessages)
        .where(eq(groupChatMessages.id, afterId))
        .limit(1);

      if (anchor) {
        messages = await db
          .select(MSG_SELECT)
          .from(groupChatMessages)
          .leftJoin(users, eq(groupChatMessages.userId, users.id))
          .where(and(baseWhere!, gt(groupChatMessages.createdAt, anchor.createdAt)))
          .orderBy(asc(groupChatMessages.createdAt))
          .limit(200);
      } else {
        messages = [];
      }
    } else {
      const rows = await db
        .select(MSG_SELECT)
        .from(groupChatMessages)
        .leftJoin(users, eq(groupChatMessages.userId, users.id))
        .where(baseWhere!)
        .orderBy(desc(groupChatMessages.createdAt))
        .limit(limit);
      messages = rows.reverse();
    }

    return NextResponse.json({ messages });
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
