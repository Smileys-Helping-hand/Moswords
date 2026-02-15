import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { groupChatMembers } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

// GET /api/group-chats/[groupChatId]/members - List group members (for E2E key distribution)
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

    const members = await db
      .select({ userId: groupChatMembers.userId })
      .from(groupChatMembers)
      .where(eq(groupChatMembers.groupChatId, groupChatId));

    return NextResponse.json({ members });
  } catch (error) {
    console.error('Error fetching group members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    );
  }
}

// POST /api/group-chats/[groupChatId]/members - Add member to group
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
    const { newMemberId } = await request.json();

    if (!newMemberId) {
      return NextResponse.json(
        { error: 'Member ID is required' },
        { status: 400 }
      );
    }

    // Check if current user is an admin
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
        { error: 'Only admins can add members' },
        { status: 403 }
      );
    }

    // Check if user is already a member
    const [existingMember] = await db
      .select()
      .from(groupChatMembers)
      .where(
        and(
          eq(groupChatMembers.groupChatId, groupChatId),
          eq(groupChatMembers.userId, newMemberId)
        )
      );

    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a member' },
        { status: 400 }
      );
    }

    // Add new member
    const [newMember] = await db
      .insert(groupChatMembers)
      .values({
        groupChatId,
        userId: newMemberId,
        role: 'member',
      })
      .returning();

    return NextResponse.json({ member: newMember });
  } catch (error) {
    console.error('Error adding member to group:', error);
    return NextResponse.json(
      { error: 'Failed to add member' },
      { status: 500 }
    );
  }
}

// DELETE /api/group-chats/[groupChatId]/members - Remove member from group
export async function DELETE(
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
    const { searchParams } = new URL(request.url);
    const memberIdToRemove = searchParams.get('memberId');

    if (!memberIdToRemove) {
      return NextResponse.json(
        { error: 'Member ID is required' },
        { status: 400 }
      );
    }

    // Check if current user is an admin
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
        { error: 'Only admins can remove members' },
        { status: 403 }
      );
    }

    // Remove member
    await db
      .delete(groupChatMembers)
      .where(
        and(
          eq(groupChatMembers.groupChatId, groupChatId),
          eq(groupChatMembers.userId, memberIdToRemove)
        )
      );

    return NextResponse.json({ message: 'Member removed' });
  } catch (error) {
    console.error('Error removing member from group:', error);
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    );
  }
}
