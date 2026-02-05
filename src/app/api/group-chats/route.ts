import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { groupChats, groupChatMembers, users } from '@/lib/schema';
import { eq, inArray } from 'drizzle-orm';

// GET /api/group-chats - Get all group chats for current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Get all group chats where user is a member
    const memberships = await db
      .select()
      .from(groupChatMembers)
      .where(eq(groupChatMembers.userId, userId));

    if (memberships.length === 0) {
      return NextResponse.json({ groupChats: [] });
    }

    const groupChatIds = memberships.map(m => m.groupChatId);

    // Get full group chat details
    const chats = await db
      .select({
        id: groupChats.id,
        name: groupChats.name,
        description: groupChats.description,
        imageUrl: groupChats.imageUrl,
        createdBy: groupChats.createdBy,
        createdAt: groupChats.createdAt,
        updatedAt: groupChats.updatedAt,
      })
      .from(groupChats)
      .where(inArray(groupChats.id, groupChatIds));

    // Get member counts for each group
    const chatsWithCounts = await Promise.all(
      chats.map(async (chat) => {
        const members = await db
          .select()
          .from(groupChatMembers)
          .where(eq(groupChatMembers.groupChatId, chat.id));

        const userRole = memberships.find(m => m.groupChatId === chat.id)?.role || 'member';

        return {
          ...chat,
          memberCount: members.length,
          userRole,
        };
      })
    );

    return NextResponse.json({ groupChats: chatsWithCounts });
  } catch (error) {
    console.error('Error fetching group chats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch group chats' },
      { status: 500 }
    );
  }
}

// POST /api/group-chats - Create a new group chat
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { name, description, memberIds } = body;

    console.log('Creating group chat:', { userId, name, memberCount: memberIds?.length });

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Group name is required' },
        { status: 400 }
      );
    }

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one member is required' },
        { status: 400 }
      );
    }

    // Create the group chat
    const [newGroupChat] = await db
      .insert(groupChats)
      .values({
        name: name.trim(),
        description: description?.trim() || null,
        createdBy: userId,
      })
      .returning();

    if (!newGroupChat || !newGroupChat.id) {
      throw new Error('Failed to create group chat - no ID returned');
    }

    console.log('Group chat created:', newGroupChat.id);

    // Add creator as admin
    await db.insert(groupChatMembers).values({
      groupChatId: newGroupChat.id,
      userId,
      role: 'admin',
    });

    console.log('Added creator as admin');

    // Add other members
    const memberValues = memberIds
      .filter((id: string) => id !== userId) // Don't add creator twice
      .map((memberId: string) => ({
        groupChatId: newGroupChat.id,
        userId: memberId,
        role: 'member',
      }));

    if (memberValues.length > 0) {
      await db.insert(groupChatMembers).values(memberValues);
      console.log(`Added ${memberValues.length} additional members`);
    }

    console.log('Group chat creation complete:', {
      id: newGroupChat.id,
      totalMembers: memberIds.length + 1, // including creator
    });

    return NextResponse.json({
      groupChat: newGroupChat,
      memberCount: memberIds.length + 1, // Include creator in count
    });
  } catch (error) {
    console.error('Error creating group chat:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create group chat' },
      { status: 500 }
    );
  }
}
