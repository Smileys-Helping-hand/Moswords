import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { approvals } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ approvalId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { approvalId } = await params;
  const { status, note } = await request.json();
  const currentUserId = (session.user as any).id;

  if (!['approved', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  // Only the assignee (or an admin) may decide, and only once.
  const [existing] = await db
    .select({ assignedToId: approvals.assignedToId, status: approvals.status })
    .from(approvals)
    .where(eq(approvals.id, approvalId))
    .limit(1);
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (existing.assignedToId !== currentUserId && !(await isAdminEmail(session.user.email))) {
    return NextResponse.json({ error: 'Only the assignee can decide this approval' }, { status: 403 });
  }
  if (existing.status !== 'pending') {
    return NextResponse.json({ error: `Already ${existing.status}` }, { status: 409 });
  }

  const [approval] = await db
    .update(approvals)
    .set({
      status,
      note,
      decidedById: currentUserId,
      decidedAt: new Date(),
    })
    .where(eq(approvals.id, approvalId))
    .returning();

  if (!approval) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Call webhook if configured
  if (approval.callbackUrl) {
    fetch(approval.callbackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approvalId, status, decidedAt: new Date() }),
    }).catch(() => {}); // Fire and forget
  }

  return NextResponse.json({ approval });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ approvalId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await isAdminEmail(session.user.email))) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { approvalId } = await params;
  const [deleted] = await db
    .select()
    .from(approvals)
    .where(eq(approvals.id, approvalId));

  if (!deleted) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await db.delete(approvals).where(eq(approvals.id, approvalId));
  return NextResponse.json({ success: true });
}

async function isAdminEmail(email?: string | null): Promise<boolean> {
  const { isAdmin, isSuperAdmin } = await import('@/lib/admin');
  return isSuperAdmin(email ?? undefined) || (await isAdmin(email ?? undefined));
}
