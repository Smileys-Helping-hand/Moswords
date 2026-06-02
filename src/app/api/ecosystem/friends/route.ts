/**
 * GET  /api/ecosystem/friends - List all friends
 * POST /api/ecosystem/friends - Send friend request
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { friendships, users } from '@/lib/schema';
import { eq, or, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id || (session.user as any).uid;
    const status = request.nextUrl.searchParams.get('status') || 'accepted';

    // Get friends with specified status
    const friends = await db.query.friendships.findMany({
      where: and(
        eq(friendships.userId, userId),
        eq(friendships.status, status)
      ),
      with: {
        friend: {
          columns: {
            id: true,
            email: true,
            displayName: true,
            photoURL: true,
            lastSeen: true,
          },
        },
      },
    });

    return NextResponse.json({
      friends: friends.map((f) => ({
        ...f.friend,
        friendshipId: f.id,
        status: f.status,
        addedAt: f.createdAt,
      })),
      count: friends.length,
    });
  } catch (error) {
    console.error('[Friends List] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id || (session.user as any).uid;
    const { friendEmail, action } = await request.json();

    if (!friendEmail) {
      return NextResponse.json(
        { error: 'Friend email required' },
        { status: 400 }
      );
    }

    // Find friend by email
    const friend = await db.query.users.findFirst({
      where: eq(users.email, friendEmail),
    });

    if (!friend) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (friend.id === userId) {
      return NextResponse.json(
        { error: 'Cannot add yourself' },
        { status: 400 }
      );
    }

    if (action === 'accept') {
      // Accept incoming friend request
      const updated = await db
        .update(friendships)
        .set({
          status: 'accepted',
          acceptedAt: new Date(),
        })
        .where(
          and(
            eq(friendships.userId, friend.id),
            eq(friendships.friendId, userId),
            eq(friendships.status, 'pending')
          )
        )
        .returning();

      if (!updated.length) {
        return NextResponse.json(
          { error: 'No pending request found' },
          { status: 404 }
        );
      }

      // Also create reverse friendship
      await db
        .insert(friendships)
        .values({
          userId,
          friendId: friend.id,
          status: 'accepted',
          acceptedAt: new Date(),
        })
        .onConflictDoNothing();

      return NextResponse.json({
        success: true,
        message: 'Friend request accepted',
      });
    }

    // Send friend request
    const existing = await db.query.friendships.findFirst({
      where: or(
        and(
          eq(friendships.userId, userId),
          eq(friendships.friendId, friend.id)
        ),
        and(
          eq(friendships.userId, friend.id),
          eq(friendships.friendId, userId)
        )
      ),
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Friendship already exists' },
        { status: 400 }
      );
    }

    // Create friendship request
    const newFriendship = await db
      .insert(friendships)
      .values({
        userId,
        friendId: friend.id,
        status: 'pending',
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        friendship: newFriendship[0],
        message: 'Friend request sent',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Friend Request] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
