import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { directMessages, users } from '@/lib/schema';
import { eq, or, desc } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/direct-messages - Get all direct message conversations
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Get all messages where user is sender or receiver, with sender info
    const messages = await db
      .select({
        id: directMessages.id,
        content: directMessages.content,
        senderId: directMessages.senderId,
        receiverId: directMessages.receiverId,
        createdAt: directMessages.createdAt,
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
          eq(directMessages.senderId, userId),
          eq(directMessages.receiverId, userId)
        )
      )
      .orderBy(desc(directMessages.createdAt))
      .limit(100);

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching direct messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// POST /api/direct-messages - Send a direct message
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { receiverId, content } = await request.json();

    if (!receiverId || !content) {
      return NextResponse.json(
        { error: 'Receiver and content are required' },
        { status: 400 }
      );
    }

    if (receiverId === userId) {
      return NextResponse.json(
        { error: 'Cannot send message to yourself' },
        { status: 400 }
      );
    }

    // Create the message
    const [newMessage] = await db
      .insert(directMessages)
      .values({
        senderId: userId,
        receiverId,
        content: content.trim(),
      })
      .returning();

    // Hydrate sender info so clients can render immediately
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

    return NextResponse.json(
      {
        message: {
          ...newMessage,
          sender,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error sending direct message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
