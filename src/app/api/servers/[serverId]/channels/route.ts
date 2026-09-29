import { NextRequest, NextResponse } from 'next/server';
import { serverRole } from '@/lib/access';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
export const dynamic = 'force-dynamic';
import { db } from '@/lib/db';
import { channels } from '@/lib/schema';
import { eq } from 'drizzle-orm';

// GET /api/servers/[serverId]/channels - Get all channels for a server
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ serverId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { serverId } = await context.params;
    if (!(await serverRole(serverId, (session.user as any).id))) {
      return NextResponse.json({ error: 'Not a member of this server' }, { status: 403 });
    }

    const serverChannels = await db
      .select()
      .from(channels)
      .where(eq(channels.serverId, serverId));

    return NextResponse.json({ channels: serverChannels });
  } catch (error) {
    console.error('Error fetching channels:', error);
    return NextResponse.json(
      { error: 'Failed to fetch channels' },
      { status: 500 }
    );
  }
}

// POST /api/servers/[serverId]/channels - Create a new channel
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ serverId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { serverId } = await context.params;
    const role = await serverRole(serverId, (session.user as any).id);
    if (role !== 'owner' && role !== 'admin') {
      return NextResponse.json({ error: 'Only server admins can create channels' }, { status: 403 });
    }
    const { name, type } = await request.json();

    if (typeof name !== 'string' || !name.trim() || name.length > 100) {
      return NextResponse.json(
        { error: 'Channel name is required' },
        { status: 400 }
      );
    }

    const [newChannel] = await db
      .insert(channels)
      .values({
        name: name.trim(),
        type: type === 'voice' ? 'voice' : 'text',
        serverId,
      })
      .returning();

    return NextResponse.json({ channel: newChannel }, { status: 201 });
  } catch (error) {
    console.error('Error creating channel:', error);
    return NextResponse.json(
      { error: 'Failed to create channel' },
      { status: 500 }
    );
  }
}
