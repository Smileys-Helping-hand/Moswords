import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { rtcSignals } from '@/lib/schema';
import { eq, and, gt, desc } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/rtc-signal
 * Body: { toUserId, type, payload, callId }
 * Inserts a new signal row for the recipient to pick up.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const fromUserId = (session.user as any).id as string;

    const body = await req.json();
    const { toUserId, type, payload, callId } = body;

    if (!toUserId || !type || !payload || !callId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate signal type to prevent injection
    const validTypes = ['call-offer', 'call-answer', 'call-decline', 'call-cancel', 'call-end', 'ice-candidate'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid signal type' }, { status: 400 });
    }

    await db.insert(rtcSignals).values({
      fromUserId,
      toUserId,
      type,
      payload: typeof payload === 'string' ? payload : JSON.stringify(payload),
      callId,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('RTC signal POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/rtc-signal?since=<ISO timestamp>
 * Returns all signals addressed to the current user newer than `since`.
 * The client deletes processed signals by calling DELETE.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id as string;

    const sinceParam = req.nextUrl.searchParams.get('since');
    const since = sinceParam ? new Date(sinceParam) : new Date(Date.now() - 60_000);

    const signals = await db
      .select()
      .from(rtcSignals)
      .where(
        and(
          eq(rtcSignals.toUserId, userId),
          gt(rtcSignals.createdAt, since),
        )
      )
      .orderBy(desc(rtcSignals.createdAt))
      .limit(50);

    return NextResponse.json({ signals });
  } catch (error) {
    console.error('RTC signal GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/rtc-signal?callId=<id>
 * Cleans up all signals for a completed call.
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const callId = req.nextUrl.searchParams.get('callId');
    if (!callId) {
      return NextResponse.json({ error: 'Missing callId' }, { status: 400 });
    }

    await db.delete(rtcSignals).where(eq(rtcSignals.callId, callId));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('RTC signal DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
