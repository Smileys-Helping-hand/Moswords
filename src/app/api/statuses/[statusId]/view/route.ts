import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { statusViews, userStatuses, statusViews as statusViewsTable } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/statuses/[statusId]/view — mark a status as viewed
export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ statusId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const currentUserId = (session.user as any).id;
    const { statusId } = await context.params;

    // Verify status exists
    const [status] = await db
      .select({ id: userStatuses.id, userId: userStatuses.userId })
      .from(userStatuses)
      .where(eq(userStatuses.id, statusId))
      .limit(1);

    if (!status) return NextResponse.json({ error: 'Status not found' }, { status: 404 });

    // Don't record self-views
    if (status.userId === currentUserId) {
      return NextResponse.json({ message: 'Own status' });
    }

    // Upsert view (ignore duplicate)
    try {
      await db.insert(statusViewsTable).values({
        statusId,
        viewerId: currentUserId,
        viewedAt: new Date(),
      });
    } catch {
      // Duplicate view — already viewed, silently ignore
    }

    return NextResponse.json({ message: 'Viewed' });
  } catch (error) {
    console.error('Error marking status viewed:', error);
    return NextResponse.json({ error: 'Failed to mark status as viewed' }, { status: 500 });
  }
}
