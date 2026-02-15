import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { messages, directMessages, groupChatMessages } from '@/lib/schema';
import { and, eq } from 'drizzle-orm';

// POST /api/messages/encrypt
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id as string;
    const { type, id, content, contentNonce } = await request.json();

    if (!type || !id || !content || !contentNonce) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    if (type === 'channel') {
      await db
        .update(messages)
        .set({
          content,
          contentNonce,
          isEncrypted: true,
        })
        .where(and(eq(messages.id, id), eq(messages.userId, userId)));
    } else if (type === 'dm') {
      await db
        .update(directMessages)
        .set({
          content,
          contentNonce,
          isEncrypted: true,
        })
        .where(and(eq(directMessages.id, id), eq(directMessages.senderId, userId)));
    } else if (type === 'group') {
      await db
        .update(groupChatMessages)
        .set({
          content,
          contentNonce,
          isEncrypted: true,
        })
        .where(and(eq(groupChatMessages.id, id), eq(groupChatMessages.userId, userId)));
    } else {
      return NextResponse.json({ error: 'Invalid message type' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Message encrypt error:', error);
    return NextResponse.json({ error: 'Failed to encrypt message' }, { status: 500 });
  }
}
