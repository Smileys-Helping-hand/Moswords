import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { servers, serverMembers } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { getServerSession } from 'next-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ serverId: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { serverId } = await context.params;

    // Fetch the server
    const server = await db
      .select()
      .from(servers)
      .where(eq(servers.id, serverId))
      .limit(1);

    if (!server.length) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 });
    }

    // Verify user is a member of this server
    const membership = await db
      .select()
      .from(serverMembers)
      .where(
        and(
          eq(serverMembers.serverId, serverId),
          eq(serverMembers.userId, session.user.id as string)
        )
      )
      .limit(1);

    if (!membership.length) {
      return NextResponse.json({ error: 'Not a member of this server' }, { status: 403 });
    }

    return NextResponse.json({
      server: server[0],
    });
  } catch (error) {
    console.error('Error fetching server:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
