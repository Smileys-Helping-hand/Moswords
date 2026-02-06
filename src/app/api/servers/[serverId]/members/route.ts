import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { serverMembers, users } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

// GET /api/servers/[serverId]/members - Get all members of a server
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ serverId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { serverId } = await context.params;

    const members = await db
      .select({
        membership: serverMembers,
        user: {
          id: users.id,
          name: users.name,
          displayName: users.displayName,
          email: users.email,
          image: users.image,
          photoURL: users.photoURL,
          customStatus: users.customStatus,
          lastSeen: users.lastSeen,
        },
      })
      .from(serverMembers)
      .innerJoin(users, eq(serverMembers.userId, users.id))
      .where(eq(serverMembers.serverId, serverId));

    return NextResponse.json({ members });
  } catch (error) {
    console.error('Error fetching members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    );
  }
}

// POST /api/servers/[serverId]/members - Add a member to a server
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ serverId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUserId = (session.user as any).id;
    const { serverId } = await context.params;
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if current user is a member/admin of this server
    const [currentMember] = await db
      .select()
      .from(serverMembers)
      .where(
        and(
          eq(serverMembers.serverId, serverId),
          eq(serverMembers.userId, currentUserId)
        )
      )
      .limit(1);

    if (!currentMember) {
      return NextResponse.json(
        { error: 'You are not a member of this server' },
        { status: 403 }
      );
    }

    // Check if user is already a member
    const [existingMember] = await db
      .select()
      .from(serverMembers)
      .where(
        and(
          eq(serverMembers.serverId, serverId),
          eq(serverMembers.userId, userId)
        )
      )
      .limit(1);

    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a member of this server' },
        { status: 400 }
      );
    }

    // Add the new member
    const [newMember] = await db
      .insert(serverMembers)
      .values({
        serverId,
        userId,
        role: 'member',
      })
      .returning();

    return NextResponse.json({ member: newMember }, { status: 201 });
  } catch (error) {
    console.error('Error adding member:', error);
    return NextResponse.json(
      { error: 'Failed to add member' },
      { status: 500 }
    );
  }
}
