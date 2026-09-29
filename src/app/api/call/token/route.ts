import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';
import { requireUser } from '@/lib/session';
import { canJoinCallRoom } from '@/lib/access';

export const dynamic = 'force-dynamic';

/**
 * POST /api/call/token { room } — LiveKit token for a group/channel call.
 * Signed-in members of that group or channel only; identity is the user id.
 */
export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => ({}));
  const room = String(body.room || body.roomName || '');
  if (!(await canJoinCallRoom(room, auth.user.id))) {
    return NextResponse.json({ error: 'You are not a member of this call' }, { status: 403 });
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const livekitUrl = process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL;
  if (!apiKey || !apiSecret || !livekitUrl) {
    return NextResponse.json({ error: 'Group calls are not configured yet' }, { status: 503 });
  }

  try {
    const at = new AccessToken(apiKey, apiSecret, {
      identity: auth.user.id,
      name: typeof body.name === 'string' ? body.name.slice(0, 60) : auth.user.email?.split('@')[0],
      ttl: '6h',
    });
    at.addGrant({ room, roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true });
    return NextResponse.json({ token: await at.toJwt(), url: livekitUrl });
  } catch (error) {
    console.error('Error generating LiveKit token:', (error as Error).message);
    return NextResponse.json({ error: 'Failed to create token' }, { status: 500 });
  }
}
