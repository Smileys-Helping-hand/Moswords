import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AccessToken } from 'livekit-server-sdk';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    const body = await request.json().catch(() => ({}));
    const room = body.room || body.roomName || 'default';

    // Identity priority: session -> provided -> random
    const identity = session?.user?.name || session?.user?.email || body.identity || `user-${Math.random().toString(36).slice(2, 9)}`;

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !livekitUrl) {
      console.error('LiveKit keys missing');
      return NextResponse.json({ error: 'LiveKit not configured' }, { status: 500 });
    }

    const at = new AccessToken(apiKey, apiSecret, { identity });
    // Use grant object directly to avoid removed VideoGrant export
    at.addGrant({ room, roomJoin: true, canPublish: true, canSubscribe: true } as any);
    const token = await at.toJwt();

    return NextResponse.json({ token, url: livekitUrl });
  } catch (err: any) {
    console.error('Error generating LiveKit token:', err);
    return NextResponse.json({ error: err?.message || 'Failed to create token' }, { status: 500 });
  }
}
