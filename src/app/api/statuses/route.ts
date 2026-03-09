import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, userStatuses, statusViews, friends } from '@/lib/schema';
import { eq, and, gt, or, inArray } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/statuses — fetch all active statuses from friends + own
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const currentUserId = (session.user as any).id;

    const now = new Date();

    // Get accepted friend IDs
    const friendRows = await db
      .select({ friendId: friends.friendId, userId: friends.userId })
      .from(friends)
      .where(
        and(
          eq(friends.status, 'accepted'),
          or(eq(friends.userId, currentUserId), eq(friends.friendId, currentUserId))
        )
      );

    const friendIds = friendRows.map((f) =>
      f.userId === currentUserId ? f.friendId : f.userId
    );

    // Fetch active (non-expired) statuses from friends + self
    const authorIds = [currentUserId, ...friendIds];
    const activeStatuses = await db
      .select({
        id: userStatuses.id,
        userId: userStatuses.userId,
        mediaUrl: userStatuses.mediaUrl,
        mediaType: userStatuses.mediaType,
        caption: userStatuses.caption,
        backgroundColor: userStatuses.backgroundColor,
        createdAt: userStatuses.createdAt,
        expiresAt: userStatuses.expiresAt,
        // User info
        displayName: users.displayName,
        name: users.name,
        email: users.email,
        photoURL: users.photoURL,
      })
      .from(userStatuses)
      .innerJoin(users, eq(userStatuses.userId, users.id))
      .where(
        and(
          inArray(userStatuses.userId, authorIds),
          gt(userStatuses.expiresAt, now)
        )
      )
      .orderBy(userStatuses.createdAt);

    // Fetch which statuses the current user has viewed
    const viewedRows = await db
      .select({ statusId: statusViews.statusId })
      .from(statusViews)
      .where(eq(statusViews.viewerId, currentUserId));
    const viewedIds = new Set(viewedRows.map((v) => v.statusId));

    // Fetch view counts for own statuses
    const ownStatusIds = activeStatuses
      .filter((s) => s.userId === currentUserId)
      .map((s) => s.id);

    let viewCounts: Record<string, number> = {};
    if (ownStatusIds.length > 0) {
      const countRows = await db
        .select({ statusId: statusViews.statusId })
        .from(statusViews)
        .where(inArray(statusViews.statusId, ownStatusIds));
      for (const row of countRows) {
        viewCounts[row.statusId] = (viewCounts[row.statusId] || 0) + 1;
      }
    }

    const statusesWithMeta = activeStatuses.map((s) => ({
      ...s,
      isViewed: viewedIds.has(s.id),
      viewCount: viewCounts[s.id] || 0,
      isOwn: s.userId === currentUserId,
    }));

    return NextResponse.json({ statuses: statusesWithMeta });
  } catch (error) {
    console.error('Error fetching statuses:', error);
    return NextResponse.json({ error: 'Failed to fetch statuses' }, { status: 500 });
  }
}

// POST /api/statuses — create a new status
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const currentUserId = (session.user as any).id;

    const body = await request.json();
    const { mediaUrl, mediaType = 'image', caption, backgroundColor } = body;

    if (!mediaUrl && mediaType !== 'text') {
      return NextResponse.json({ error: 'mediaUrl is required for image/video statuses' }, { status: 400 });
    }
    if (mediaType === 'text' && !caption) {
      return NextResponse.json({ error: 'caption is required for text statuses' }, { status: 400 });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +24h

    const [created] = await db
      .insert(userStatuses)
      .values({
        userId: currentUserId,
        mediaUrl: mediaUrl || null,
        mediaType,
        caption: caption || null,
        backgroundColor: backgroundColor || '#1a1a2e',
        createdAt: now,
        expiresAt,
      })
      .returning();

    return NextResponse.json({ status: created }, { status: 201 });
  } catch (error) {
    console.error('Error creating status:', error);
    return NextResponse.json({ error: 'Failed to create status' }, { status: 500 });
  }
}
