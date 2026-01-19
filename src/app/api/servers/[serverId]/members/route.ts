import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { serverMembers, users } from '@/lib/schema';
import { eq } from 'drizzle-orm';

// GET /api/servers/[serverId]/members - Get all members of a server
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

    const members = await db
      .select({
        membership: serverMembers,
        user: {
          id: users.id,
          name: users.name,
          displayName: users.displayName,
          email: users.email,
          image: users.image,
          photoURL: users.photoURL,
          customStatus: users.customStatus,
          lastSeen: users.lastSeen,
        },
      })
      .from(serverMembers)
      .innerJoin(users, eq(serverMembers.userId, users.id))
      .where(eq(serverMembers.serverId, serverId));

    return NextResponse.json({ members });
  } catch (error) {
    console.error('Error fetching members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    );
  }
}
