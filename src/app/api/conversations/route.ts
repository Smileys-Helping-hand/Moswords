import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { directMessages, users } from '@/lib/schema';
import { eq, or, desc } from 'drizzle-orm';

type ConversationRow = {
  otherUserId: string;
  lastMessage: {
    id: string;
    content: string;
    senderId: string;
    receiverId: string;
    createdAt: Date;
    read: boolean;
    archived: boolean;
  };
  otherUser?: {
    id: string;
    email: string;
    name: string | null;
    displayName: string | null;
    photoURL: string | null;
    lastSeen: string | null;
  };
  unreadCount: number;
};

// GET /api/conversations - list recent DM conversations
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUserId = (session.user as any).id as string;

    const rows = await db
      .select({
        id: directMessages.id,
        content: directMessages.content,
        senderId: directMessages.senderId,
        receiverId: directMessages.receiverId,
        createdAt: directMessages.createdAt,
        read: directMessages.read,
        archived: directMessages.archived,
      })
      .from(directMessages)
      .where(
        or(eq(directMessages.senderId, currentUserId), eq(directMessages.receiverId, currentUserId))
      )
      .orderBy(desc(directMessages.createdAt))
      .limit(300);

    // Group by "other user" and compute unread count
    const byOther = new Map<string, ConversationRow>();

    for (const msg of rows) {
      const otherUserId = msg.senderId === currentUserId ? msg.receiverId : msg.senderId;

      if (!byOther.has(otherUserId)) {
        byOther.set(otherUserId, {
          otherUserId,
          lastMessage: {
            id: msg.id,
            content: msg.content,
            senderId: msg.senderId,
            receiverId: msg.receiverId,
            createdAt: msg.createdAt,
            read: msg.read,
            archived: msg.archived,
          },
          unreadCount: 0,
        });
      }

      const conv = byOther.get(otherUserId)!;
      if (msg.receiverId === currentUserId && msg.read === false && msg.archived === false) {
        conv.unreadCount += 1;
      }
    }

    const otherUserIds = Array.from(byOther.keys());
    const otherUsers = otherUserIds.length
      ? await db
          .select({
            id: users.id,
            email: users.email,
            name: users.name,
            displayName: users.displayName,
            photoURL: users.photoURL,
            lastSeen: users.lastSeen,
          })
          .from(users)
          // simple IN with or-chain to avoid importing inArray
          .where(or(...otherUserIds.map((id) => eq(users.id, id))))
      : [];

    const otherById = new Map(otherUsers.map((u) => [u.id, u] as const));
    for (const [id, conv] of byOther) {
      conv.otherUser = otherById.get(id);
    }

    // Sort by lastMessage timestamp desc
    const conversations = Array.from(byOther.values()).sort(
      (a, b) => b.lastMessage.createdAt.getTime() - a.lastMessage.createdAt.getTime()
    );

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('Error listing conversations:', error);
    return NextResponse.json({ error: 'Failed to list conversations' }, { status: 500 });
  }
}
