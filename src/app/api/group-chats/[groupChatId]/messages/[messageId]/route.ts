import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { groupChatMessages, groupChatMembers } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// DELETE /api/group-chats/[groupChatId]/messages/[messageId]
// Only the sender can delete their own message (soft-delete via `deleted` flag)
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ groupChatId: string; messageId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUserId = (session.user as any).id;
    const { groupChatId, messageId } = await context.params;

    // Verify the user is a member of the group
    const [membership] = await db
      .select()
      .from(groupChatMembers)
      .where(
        and(
          eq(groupChatMembers.groupChatId, groupChatId),
          eq(groupChatMembers.userId, currentUserId)
        )
      );

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
    }

    // Soft-delete: only the sender may delete their message
    const updated = await db
      .update(groupChatMessages)
      .set({ deleted: true })
      .where(
        and(
          eq(groupChatMessages.id, messageId),
          eq(groupChatMessages.userId, currentUserId)
        )
      )
      .returning({ id: groupChatMessages.id });

    if (updated.length === 0) {
      return NextResponse.json(
        { error: 'Message not found or you are not the sender' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Message deleted' });
  } catch (error) {
    console.error('Error deleting group message:', error);
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
  }
}
