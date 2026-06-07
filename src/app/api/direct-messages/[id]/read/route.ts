import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { directMessages } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// PATCH /api/direct-messages/[id]/read - Mark a message as read
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { id: messageId } = await params;

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }

    // Get the message
    const message = await db
      .select()
      .from(directMessages)
      .where(eq(directMessages.id, messageId))
      .then((res) => res[0]);

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Only the receiver can mark a message as read
    if (message.receiverId !== userId) {
      return NextResponse.json(
        { error: 'Only the receiver can mark this message as read' },
        { status: 403 }
      );
    }

    // Update the message with read status and timestamp
    const updatedMessage = await db
      .update(directMessages)
      .set({
        read: true,
        readAt: new Date(),
      })
      .where(eq(directMessages.id, messageId))
      .returning();

    return NextResponse.json({ message: updatedMessage[0] });
  } catch (error) {
    console.error('Error marking message as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark message as read' },
      { status: 500 }
    );
  }
}
