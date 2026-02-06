import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { messages, directMessages, groupChatMessages, users, channels } from '@/lib/schema';
import { eq, and, gt, or, desc } from 'drizzle-orm';

/**
 * GET /api/notifications/messages
 * Fetch new messages since a given timestamp
 * Query params:
 *  - since: ISO timestamp
 *  - type: 'channel' | 'dm' | 'group'
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUserId = (session.user as any).id;
    const { searchParams } = new URL(request.url);
    const since = searchParams.get('since');
    const type = searchParams.get('type') as 'channel' | 'dm' | 'group' | null;

    if (!since) {
      return NextResponse.json({ error: 'Missing since parameter' }, { status: 400 });
    }

    const sinceDate = new Date(since);
    const results: any[] = [];

    // Fetch channel messages
    if (!type || type === 'channel') {
      const channelMessages = await db
        .select({
          message: messages,
          user: {
            id: users.id,
            displayName: users.displayName,
            name: users.name,
          },
        })
        .from(messages)
        .innerJoin(users, eq(users.id, messages.userId))
        .where(
          and(
            gt(messages.createdAt, sinceDate),
            // Only messages from channels the user has access to (members of)
          )
        )
        .orderBy(desc(messages.createdAt))
        .limit(50);

      results.push(...channelMessages.map(cm => ({
        id: cm.message.id,
        content: cm.message.content,
        userId: cm.message.userId,
        channelId: cm.message.channelId,
        createdAt: cm.message.createdAt.toISOString(),
        user: cm.user,
      })));
    }

    // Fetch direct messages
    if (!type || type === 'dm') {
      const dms = await db
        .select({
          message: directMessages,
          user: {
            id: users.id,
            displayName: users.displayName,
            name: users.name,
          },
        })
        .from(directMessages)
        .innerJoin(users, eq(users.id, directMessages.senderId))
        .where(
          and(
            gt(directMessages.createdAt, sinceDate),
            eq(directMessages.receiverId, currentUserId)
          )
        )
        .orderBy(desc(directMessages.createdAt))
        .limit(50);

      results.push(...dms.map(dm => ({
        id: dm.message.id,
        content: dm.message.content,
        userId: dm.message.senderId,
        senderId: dm.message.senderId,
        receiverId: dm.message.receiverId,
        createdAt: dm.message.createdAt.toISOString(),
        user: dm.user,
      })));
    }

    // Fetch group chat messages
    if (!type || type === 'group') {
      const groupMessages = await db
        .select({
          message: groupChatMessages,
          user: {
            id: users.id,
            displayName: users.displayName,
            name: users.name,
          },
        })
        .from(groupChatMessages)
        .innerJoin(users, eq(users.id, groupChatMessages.userId))
        .where(
          and(
            gt(groupChatMessages.createdAt, sinceDate),
            // Only messages from group chats the user is a member of
          )
        )
        .orderBy(desc(groupChatMessages.createdAt))
        .limit(50);

      results.push(...groupMessages.map(gm => ({
        id: gm.message.id,
        content: gm.message.content,
        userId: gm.message.userId,
        groupChatId: gm.message.groupChatId,
        createdAt: gm.message.createdAt.toISOString(),
        user: gm.user,
      })));
    }

    // Sort by createdAt descending
    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ messages: results });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}
