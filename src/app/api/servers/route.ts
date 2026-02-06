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

// POST /api/servers - Create a new server with transaction
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

    // Use transaction to ensure all steps succeed or all fail (prevents ghost servers)
    const result = await db.transaction(async (tx) => {
      // Generate a random invite code
      const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();

      // Step 1: Create server
      const [newServer] = await tx
        .insert(servers)
        .values({
          name,
          imageUrl: imageUrl || `https://picsum.photos/seed/${name}/200/200`,
          inviteCode,
          ownerId: userId,
        })
        .returning();

      // Step 2: Add creator as admin member
      await tx.insert(serverMembers).values({
        serverId: newServer.id,
        userId,
        role: 'admin',
      });

      // Step 3: Create default general channel
      const [generalChannel] = await tx.insert(channels).values({
        name: 'general',
        type: 'text',
        serverId: newServer.id,
      }).returning();

      // Step 4: Create additional default channel
      await tx.insert(channels).values({
        name: 'random',
        type: 'text',
        serverId: newServer.id,
      });

      return { server: newServer, generalChannelId: generalChannel.id };
    });

    return NextResponse.json(
      { 
        server: result.server, 
        generalChannelId: result.generalChannelId 
      }, 
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating server:', error);
    return NextResponse.json(
      { error: 'Failed to create server' },
      { status: 500 }
    );
  }
}
