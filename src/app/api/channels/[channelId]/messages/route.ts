import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { messages, users } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';

// GET /api/channels/[channelId]/messages - Get messages for a channel
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ channelId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { channelId } = await context.params;

    // Get messages with user info
    const channelMessages = await db
      .select({
        message: {
          id: messages.id,
          content: messages.content,
          channelId: messages.channelId,
          userId: messages.userId,
          mediaUrl: messages.mediaUrl,
          mediaType: messages.mediaType,
          createdAt: messages.createdAt,
          updatedAt: messages.updatedAt,
          deleted: messages.deleted,
        },
        user: {
          id: users.id,
          name: users.name,
          displayName: users.displayName,
          image: users.image,
          photoURL: users.photoURL,
        },
      })
      .from(messages)
      .innerJoin(users, eq(messages.userId, users.id))
      .where(eq(messages.channelId, channelId))
      .orderBy(desc(messages.createdAt))
      .limit(50);

    return NextResponse.json({ messages: channelMessages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// POST /api/channels/[channelId]/messages - Send a message
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ channelId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { channelId } = await context.params;
    const { content, mediaUrl, mediaType } = await request.json();

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      );
    }

    // Skip AI moderation for media messages (they just have placeholder text)
    if (!mediaUrl) {
      // AI moderation (fail-open handled by API)
      try {
        const baseUrl = request.nextUrl.origin;
        const modRes = await fetch(`${baseUrl}/api/ai/moderate-message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // forward cookies for session auth on internal fetch
            cookie: request.headers.get('cookie') ?? '',
          },
          body: JSON.stringify({ text: content.trim() }),
        });
        if (modRes.ok) {
          const mod = await modRes.json();
          if (mod?.isToxic) {
            return NextResponse.json(
              { error: 'Message flagged by auto-moderation', toxicityReason: mod.toxicityReason },
              { status: 400 }
            );
          }
        }
      } catch {
        // fail open
      }
    }

    // Create message with optional media fields
    const [newMessage] = await db
      .insert(messages)
      .values({
        content: content.trim(),
        channelId,
        userId,
        ...(mediaUrl && { mediaUrl }),
        ...(mediaType && { mediaType }),
      })
      .returning({
        id: messages.id,
        content: messages.content,
        channelId: messages.channelId,
        userId: messages.userId,
        mediaUrl: messages.mediaUrl,
        mediaType: messages.mediaType,
        createdAt: messages.createdAt,
      });

    return NextResponse.json({ message: newMessage }, { status: 201 });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
