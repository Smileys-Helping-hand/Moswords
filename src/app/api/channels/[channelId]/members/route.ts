import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { channels, serverMembers, users } from '@/lib/schema';
import { and, eq } from 'drizzle-orm';

// GET /api/channels/[channelId]/members
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ channelId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id as string;
    const { channelId } = await context.params;

    const [channel] = await db
      .select({ serverId: channels.serverId })
      .from(channels)
      .where(eq(channels.id, channelId));

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    const [membership] = await db
      .select()
      .from(serverMembers)
      .where(and(eq(serverMembers.serverId, channel.serverId), eq(serverMembers.userId, userId)));

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this server' }, { status: 403 });
    }

    const members = await db
      .select({
        id: users.id,
      })
      .from(serverMembers)
      .innerJoin(users, eq(serverMembers.userId, users.id))
      .where(eq(serverMembers.serverId, channel.serverId));

    return NextResponse.json({ members });
  } catch (error) {
    console.error('Channel members fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch channel members' }, { status: 500 });
  }
}
