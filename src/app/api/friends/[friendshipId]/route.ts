import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { friends } from '@/lib/schema';
import { eq, and, or } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// PATCH /api/friends/[friendshipId] - Accept/reject friend request or block
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ friendshipId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { friendshipId } = await context.params;
    const { action } = await request.json(); // 'accept', 'reject', 'block'

    // Get the friendship
    const [friendship] = await db
      .select()
      .from(friends)
      .where(eq(friends.id, friendshipId));

    if (!friendship) {
      return NextResponse.json({ error: 'Friendship not found' }, { status: 404 });
    }

    // Verify user is part of this friendship
    if (friendship.userId !== userId && friendship.friendId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (action === 'accept') {
      // Only the receiver can accept
      if (friendship.friendId !== userId) {
        return NextResponse.json(
          { error: 'Only the receiver can accept' },
          { status: 400 }
        );
      }

      await db
        .update(friends)
        .set({ status: 'accepted' })
        .where(eq(friends.id, friendshipId));

      // Create reverse friendship for easier querying
      // Make this idempotent (avoid duplicate reverse rows)
      await db
        .insert(friends)
        .values({
          userId: friendship.friendId,
          friendId: friendship.userId,
          status: 'accepted',
        })
        // requires a unique constraint on (user_id, friend_id) to be fully effective
        .onConflictDoNothing();

      return NextResponse.json({ message: 'Friend request accepted' });
    } else if (action === 'reject') {
      await db.delete(friends).where(eq(friends.id, friendshipId));
      return NextResponse.json({ message: 'Friend request rejected' });
    } else if (action === 'block') {
      await db
        .update(friends)
        .set({ status: 'blocked' })
        .where(eq(friends.id, friendshipId));
      return NextResponse.json({ message: 'User blocked' });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error updating friendship:', error);
    return NextResponse.json(
      { error: 'Failed to update friendship' },
      { status: 500 }
    );
  }
}

// DELETE /api/friends/[friendshipId] - Remove friend
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ friendshipId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { friendshipId } = await context.params;

    // Get the friendship
    const [friendship] = await db
      .select()
      .from(friends)
      .where(eq(friends.id, friendshipId));

    if (!friendship) {
      return NextResponse.json({ error: 'Friendship not found' }, { status: 404 });
    }

    // Verify user is part of this friendship
    if (friendship.userId !== userId && friendship.friendId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete both directions of the friendship
    await db
      .delete(friends)
      .where(
        or(
          and(eq(friends.userId, friendship.userId), eq(friends.friendId, friendship.friendId)),
          and(eq(friends.userId, friendship.friendId), eq(friends.friendId, friendship.userId))
        )
      );

    return NextResponse.json({ message: 'Friend removed' });
  } catch (error) {
    console.error('Error removing friend:', error);
    return NextResponse.json(
      { error: 'Failed to remove friend' },
      { status: 500 }
    );
  }
}
