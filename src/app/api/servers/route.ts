import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { servers, serverMembers, channels } from '@/lib/schema';
import { eq } from 'drizzle-orm';

// GET /api/servers - Get all servers for the current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Get all servers where user is a member
    const userServers = await db
      .select({
        server: servers,
        membership: serverMembers,
      })
      .from(serverMembers)
      .innerJoin(servers, eq(servers.id, serverMembers.serverId))
      .where(eq(serverMembers.userId, userId));

    return NextResponse.json({ servers: userServers });
  } catch (error) {
    console.error('Error fetching servers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch servers' },
      { status: 500 }
    );
  }
}

// POST /api/servers - Create a new server
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { name, imageUrl } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Server name is required' },
        { status: 400 }
      );
    }

    // Generate a random invite code
    const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();

    // Create server
    const [newServer] = await db
      .insert(servers)
      .values({
        name,
        imageUrl: imageUrl || `https://picsum.photos/seed/${name}/200/200`,
        inviteCode,
        ownerId: userId,
      })
      .returning();

    // Add creator as owner member
    await db.insert(serverMembers).values({
      serverId: newServer.id,
      userId,
      role: 'owner',
    });

    // Create default channels
    await db.insert(channels).values([
      {
        name: 'general',
        type: 'text',
        serverId: newServer.id,
      },
      {
        name: 'random',
        type: 'text',
        serverId: newServer.id,
      },
    ]);

    return NextResponse.json({ server: newServer }, { status: 201 });
  } catch (error) {
    console.error('Error creating server:', error);
    return NextResponse.json(
      { error: 'Failed to create server' },
      { status: 500 }
    );
  }
}
