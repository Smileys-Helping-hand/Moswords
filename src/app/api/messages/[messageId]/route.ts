import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { directMessages } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// DELETE /api/messages/[messageId] — only sender can delete their own message
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ messageId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUserId = (session.user as any).id;
    const { messageId } = await context.params;

    const deleted = await db
      .delete(directMessages)
      .where(and(eq(directMessages.id, messageId), eq(directMessages.senderId, currentUserId)))
      .returning({ id: directMessages.id });

    if (deleted.length === 0) {
      return NextResponse.json({ error: 'Message not found or not authorized' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Message deleted' });
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
  }
}
