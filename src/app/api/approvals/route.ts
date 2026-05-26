import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { approvals, users } from '@/lib/schema';
import { eq, desc, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') as string | null;
  const assigned = searchParams.get('assigned') === 'true';
  const currentUserId = (session.user as any).id;

  const conditions = assigned ? [eq(approvals.assignedToId, currentUserId)] : [];
  if (status) conditions.push(eq(approvals.status, status));

  const items = await db
    .select()
    .from(approvals)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(approvals.createdAt))
    .limit(100);

  return NextResponse.json({ approvals: items });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { title, description, priority = 'normal', assignedToId, callbackUrl, metadata } = await request.json();

  if (!title) {
    return NextResponse.json({ error: 'title required' }, { status: 400 });
  }

  const approval = await db
    .insert(approvals)
    .values({
      title,
      description,
      priority,
      assignedToId,
      callbackUrl,
      metadata,
      requestedBy: (session.user as any).name || (session.user as any).email || 'User',
      status: 'pending',
    })
    .returning();

  return NextResponse.json({ approval: approval[0] }, { status: 201 });
}
