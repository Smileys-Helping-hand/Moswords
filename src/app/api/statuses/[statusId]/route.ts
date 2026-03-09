import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { userStatuses } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// DELETE /api/statuses/[statusId] — delete own status
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ statusId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const currentUserId = (session.user as any).id;
    const { statusId } = await context.params;

    const deleted = await db
      .delete(userStatuses)
      .where(and(eq(userStatuses.id, statusId), eq(userStatuses.userId, currentUserId)))
      .returning({ id: userStatuses.id });

    if (deleted.length === 0) {
      return NextResponse.json({ error: 'Status not found or not yours' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Status deleted' });
  } catch (error) {
    console.error('Error deleting status:', error);
    return NextResponse.json({ error: 'Failed to delete status' }, { status: 500 });
  }
}
