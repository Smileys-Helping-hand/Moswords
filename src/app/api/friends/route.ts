import { NextRequest, NextResponse } from 'next/server';
import { isUuid } from '@/lib/validate';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db, runBatch } from '@/lib/db';
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
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status'); // 'accepted', 'pending', 'blocked'

    const whereParts = [eq(friends.userId, userId)];
    if (status) {
      whereParts.push(eq(friends.status, status));
    }

    const person = {
      id: users.id,
      email: users.email,
      name: users.name,
      displayName: users.displayName,
      photoURL: users.photoURL,
      customStatus: users.customStatus,
      lastSeen: users.lastSeen,
    };

    // Three independent lists, fetched in one round trip.
    let userFriends;
    let reverseFriends;
    let pendingRequests;

    try {
      [userFriends, reverseFriends, pendingRequests] = await runBatch([
      db
        .select({
          id: friends.id,
          userId: friends.userId,
          friendId: friends.friendId,
          status: friends.status,
          createdAt: friends.createdAt,
          friend: person,
        })
        .from(friends)
        .leftJoin(users, eq(friends.friendId, users.id))
        .where(and(...whereParts)),

      // Also get friends where current user is friendId (accepted friendships)
      db
        .select({
          id: friends.id,
          userId: friends.userId,
          friendId: friends.friendId,
          status: friends.status,
          createdAt: friends.createdAt,
          friend: person,
        })
        .from(friends)
        .leftJoin(users, eq(friends.userId, users.id))
        .where(and(eq(friends.friendId, userId), eq(friends.status, 'accepted'))),

      // Also get pending requests sent to this user
      db
        .select({
          id: friends.id,
          userId: friends.userId,
          friendId: friends.friendId,
          status: friends.status,
          createdAt: friends.createdAt,
          requester: person,
        })
        .from(friends)
        .leftJoin(users, eq(friends.userId, users.id))
        .where(and(eq(friends.friendId, userId), eq(friends.status, 'pending'))),
      ]);
    } catch (dbError) {
      console.error('Database error fetching friends:', dbError);
      // Return empty arrays if friends table doesn't exist or has issues
      return NextResponse.json({ 
        friends: [],
        pendingRequests: [],
      });
    }

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
      const key = (row as any).requester?.id ?? row.userId;
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
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { friendId } = body;

    if (!isUuid(friendId)) {
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

    // Check if the friend user exists
    const [targetUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, friendId));

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
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
      const existing = existingFriendship[0];
      // They already asked us: adding them back simply accepts their request.
      if (existing.status === 'pending' && existing.userId === friendId) {
        const now = new Date();
        await db
          .update(friends)
          .set({ status: 'accepted', acceptedAt: now })
          .where(eq(friends.id, existing.id));
        await db
          .insert(friends)
          .values({ userId, friendId, status: 'accepted', acceptedAt: now })
          .onConflictDoNothing();
        return NextResponse.json({ friendship: { ...existing, status: 'accepted' }, accepted: true }, { status: 200 });
      }
      if (existing.status === 'pending') {
        return NextResponse.json(
          { error: 'Friend request already pending' },
          { status: 400 }
        );
      } else if (existing.status === 'accepted') {
        return NextResponse.json(
          { error: 'Already friends with this user' },
          { status: 400 }
        );
      } else {
        return NextResponse.json(
          { error: 'Friendship already exists' },
          { status: 400 }
        );
      }
    }

    // Create friend request
    const inserted = await db
      .insert(friends)
      .values({
        userId,
        friendId,
        status: 'pending',
      })
      .returning();

    if (inserted.length === 0) {
      return NextResponse.json(
        { error: 'Failed to create friend request' },
        { status: 500 }
      );
    }

    const [newFriendship] = inserted;

    return NextResponse.json({ friendship: newFriendship }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating friend request:', error);
    
    // Check for unique constraint violation
    if (error?.code === '23505' || error?.message?.includes('unique')) {
      return NextResponse.json(
        { error: 'Friend request already exists' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to send friend request. Please try again.' },
      { status: 500 }
    );
  }
}
