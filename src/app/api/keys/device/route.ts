import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { deviceKeys } from '@/lib/schema';
import { and, eq, inArray } from 'drizzle-orm';

// GET /api/keys/device?userIds=a,b,c
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userIdsParam = searchParams.get('userIds');
    if (!userIdsParam) {
      return NextResponse.json({ keys: [] });
    }

    const userIds = userIdsParam.split(',').filter(Boolean);
    if (userIds.length === 0) {
      return NextResponse.json({ keys: [] });
    }

    const keys = await db
      .select({
        userId: deviceKeys.userId,
        deviceId: deviceKeys.deviceId,
        publicKey: deviceKeys.publicKey,
      })
      .from(deviceKeys)
      .where(inArray(deviceKeys.userId, userIds));

    return NextResponse.json({ keys });
  } catch (error) {
    console.error('Device keys fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch device keys' }, { status: 500 });
  }
}

// POST /api/keys/device
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { deviceId, publicKey } = body || {};

    if (!deviceId || !publicKey) {
      return NextResponse.json({ error: 'Device ID and public key are required' }, { status: 400 });
    }

    await db
      .insert(deviceKeys)
      .values({
        userId,
        deviceId,
        publicKey,
        lastSeen: new Date(),
      })
      .onConflictDoUpdate({
        target: [deviceKeys.userId, deviceKeys.deviceId],
        set: {
          publicKey,
          lastSeen: new Date(),
        },
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Device key register error:', error);
    return NextResponse.json({ error: 'Failed to register device key' }, { status: 500 });
  }
}
