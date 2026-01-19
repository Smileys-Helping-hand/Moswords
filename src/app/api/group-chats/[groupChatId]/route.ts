import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { groupChats, groupChatMembers, users } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

// GET /api/group-chats/[groupChatId] - Get group chat details
export async function GET(
  request: NextRequest,
  { params }: { params: { groupChatId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const groupChatId = params.groupChatId;

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

    // Get group chat details
    const [groupChat] = await db
      .select()
      .from(groupChats)
      .where(eq(groupChats.id, groupChatId));

    if (!groupChat) {
      return NextResponse.json({ error: 'Group chat not found' }, { status: 404 });
    }

    // Get all members with user details
    const members = await db
      .select({
        id: groupChatMembers.id,
        userId: groupChatMembers.userId,
        role: groupChatMembers.role,
        joinedAt: groupChatMembers.joinedAt,
        user: {
          id: users.id,
          email: users.email,
          name: users.name,
          displayName: users.displayName,
          photoURL: users.photoURL,
          lastSeen: users.lastSeen,
        },
      })
      .from(groupChatMembers)
      .leftJoin(users, eq(groupChatMembers.userId, users.id))
      .where(eq(groupChatMembers.groupChatId, groupChatId));

    return NextResponse.json({
      groupChat,
      members,
      userRole: membership.role,
    });
  } catch (error) {
    console.error('Error fetching group chat:', error);
    return NextResponse.json(
      { error: 'Failed to fetch group chat' },
      { status: 500 }
    );
  }
}

// PATCH /api/group-chats/[groupChatId] - Update group chat
export async function PATCH(
  request: NextRequest,
  { params }: { params: { groupChatId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const groupChatId = params.groupChatId;
    const { name, description, imageUrl } = await request.json();

    // Check if user is an admin
    const [membership] = await db
      .select()
      .from(groupChatMembers)
      .where(
        and(
          eq(groupChatMembers.groupChatId, groupChatId),
          eq(groupChatMembers.userId, userId)
        )
      );

    if (!membership || membership.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can update group chat' },
        { status: 403 }
      );
    }

    // Update group chat
    const [updated] = await db
      .update(groupChats)
      .set({
        name: name?.trim() || undefined,
        description: description?.trim() || undefined,
        imageUrl: imageUrl || undefined,
        updatedAt: new Date(),
      })
      .where(eq(groupChats.id, groupChatId))
      .returning();

    return NextResponse.json({ groupChat: updated });
  } catch (error) {
    console.error('Error updating group chat:', error);
    return NextResponse.json(
      { error: 'Failed to update group chat' },
      { status: 500 }
    );
  }
}

// DELETE /api/group-chats/[groupChatId] - Leave or delete group chat
export async function DELETE(
  request: NextRequest,
  { params }: { params: { groupChatId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const groupChatId = params.groupChatId;

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

    // Get group chat to check if user is creator
    const [groupChat] = await db
      .select()
      .from(groupChats)
      .where(eq(groupChats.id, groupChatId));

    if (!groupChat) {
      return NextResponse.json({ error: 'Group chat not found' }, { status: 404 });
    }

    // If user is creator and wants to delete the whole group
    if (groupChat.createdBy === userId) {
      await db.delete(groupChats).where(eq(groupChats.id, groupChatId));
      return NextResponse.json({ message: 'Group chat deleted' });
    }

    // Otherwise just remove user from group
    await db
      .delete(groupChatMembers)
      .where(
        and(
          eq(groupChatMembers.groupChatId, groupChatId),
          eq(groupChatMembers.userId, userId)
        )
      );

    return NextResponse.json({ message: 'Left group chat' });
  } catch (error) {
    console.error('Error deleting/leaving group chat:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
