import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { friends, users } from '@/lib/schema';
import { eq, or, and } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/friends - Get all friends and friend requests
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status'); // 'accepted', 'pending', 'blocked'

    const whereParts = [eq(friends.userId, userId)];
    if (status) {
      whereParts.push(eq(friends.status, status));
    }

    // Get friends where current user is userId
    const userFriends = await db
      .select({
        id: friends.id,
        userId: friends.userId,
        friendId: friends.friendId,
        status: friends.status,
        createdAt: friends.createdAt,
        friend: {
          id: users.id,
          email: users.email,
          name: users.name,
          displayName: users.displayName,
          photoURL: users.photoURL,
          customStatus: users.customStatus,
          lastSeen: users.lastSeen,
        },
      })
      .from(friends)
      .leftJoin(users, eq(friends.friendId, users.id))
      .where(and(...whereParts));

    // Also get friends where current user is friendId (accepted friendships)
    const reverseFriends = await db
      .select({
        id: friends.id,
        userId: friends.userId,
        friendId: friends.friendId,
        status: friends.status,
        createdAt: friends.createdAt,
        friend: {
          id: users.id,
          email: users.email,
          name: users.name,
          displayName: users.displayName,
          photoURL: users.photoURL,
          customStatus: users.customStatus,
          lastSeen: users.lastSeen,
        },
      })
      .from(friends)
      .leftJoin(users, eq(friends.userId, users.id))
      .where(and(eq(friends.friendId, userId), eq(friends.status, 'accepted')));

    // Also get pending requests sent to this user
    const pendingRequests = await db
      .select({
        id: friends.id,
        userId: friends.userId,
        friendId: friends.friendId,
        status: friends.status,
        createdAt: friends.createdAt,
        requester: {
          id: users.id,
          email: users.email,
          name: users.name,
          displayName: users.displayName,
          photoURL: users.photoURL,
          customStatus: users.customStatus,
          lastSeen: users.lastSeen,
        },
      })
      .from(friends)
      .leftJoin(users, eq(friends.userId, users.id))
      .where(and(eq(friends.friendId, userId), eq(friends.status, 'pending')));

    // Merge and dedupe - for reverse friends, swap to make current user the "owner"
    const allFriends = [
      ...userFriends,
      ...reverseFriends.map(rf => ({
        ...rf,
        userId: rf.friendId,
        friendId: rf.userId,
      }))
    ];

    // Dedupe defensively in case duplicate rows exist
    const uniqueByFriendId = new Map<string, (typeof userFriends)[number]>();
    for (const row of allFriends) {
      const key = row.friend?.id ?? row.friendId;
      if (!uniqueByFriendId.has(key)) uniqueByFriendId.set(key, row);
    }

    const uniqueByRequesterId = new Map<string, (typeof pendingRequests)[number]>();
    for (const row of pendingRequests) {
      const key = row.requester?.id ?? row.userId;
      if (!uniqueByRequesterId.has(key)) uniqueByRequesterId.set(key, row);
    }

    return NextResponse.json({ 
      friends: Array.from(uniqueByFriendId.values()),
      pendingRequests: Array.from(uniqueByRequesterId.values()),
    });
  } catch (error) {
    console.error('Error fetching friends:', error);
    return NextResponse.json(
      { error: 'Failed to fetch friends' },
      { status: 500 }
    );
  }
}

// POST /api/friends - Send a friend request
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { friendId } = await request.json();

    if (!friendId) {
      return NextResponse.json(
        { error: 'Friend ID is required' },
        { status: 400 }
      );
    }

    if (friendId === userId) {
      return NextResponse.json(
        { error: 'Cannot add yourself as a friend' },
        { status: 400 }
      );
    }

    // Check if friendship already exists
    const existingFriendship = await db
      .select()
      .from(friends)
      .where(
        or(
          and(eq(friends.userId, userId), eq(friends.friendId, friendId)),
          and(eq(friends.userId, friendId), eq(friends.friendId, userId))
        )
      );

    if (existingFriendship.length > 0) {
      return NextResponse.json(
        { error: 'Friendship already exists or pending' },
        { status: 400 }
      );
    }

    // Create friend request
    const inserted = await db
      .insert(friends)
      .values({
        userId,
        friendId,
        status: 'pending',
      })
      // requires a unique constraint on (user_id, friend_id) to be fully effective
      .onConflictDoNothing()
      .returning();

    if (inserted.length === 0) {
      return NextResponse.json(
        { error: 'Friendship already exists or pending' },
        { status: 400 }
      );
    }

    const [newFriendship] = inserted;

    return NextResponse.json({ friendship: newFriendship }, { status: 201 });
  } catch (error) {
    console.error('Error creating friend request:', error);
    return NextResponse.json(
      { error: 'Failed to send friend request' },
      { status: 500 }
    );
  }
}
