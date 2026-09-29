import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
export const dynamic = 'force-dynamic';
import { db } from '@/lib/db';
import { messages, users } from '@/lib/schema';
import { and, eq, desc, lt } from 'drizzle-orm';
import { channelAccess } from '@/lib/access';
import { moderateText } from '@/lib/moderation';
import { isSafeMediaUrl, MAX_MESSAGE_LENGTH } from '@/lib/validate';
import { rateLimit, tooManyRequests } from '@/lib/rate-limit';

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
    if (!(await channelAccess(channelId, (session.user as any).id))) {
      return NextResponse.json({ error: 'Not a member of this server' }, { status: 403 });
    }

    // ?before=<ISO timestamp> pages further back in history.
    const before = request.nextUrl.searchParams.get('before');
    const beforeDate = before ? new Date(before) : null;
    const where = beforeDate && !isNaN(beforeDate.getTime())
      ? and(eq(messages.channelId, channelId), lt(messages.createdAt, beforeDate))
      : eq(messages.channelId, channelId);

    // Get messages with user info
    const channelMessages = await db
      .select({
        message: {
          id: messages.id,
          content: messages.content,
          contentNonce: messages.contentNonce,
          isEncrypted: messages.isEncrypted,
          channelId: messages.channelId,
          userId: messages.userId,
          mediaUrl: messages.mediaUrl,
          mediaType: messages.mediaType,
          mediaEncrypted: messages.mediaEncrypted,
          mediaNonce: messages.mediaNonce,
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
      .where(where)
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
    const {
      content,
      contentNonce,
      isEncrypted,
      mediaUrl,
      mediaType,
      mediaEncrypted,
      mediaNonce,
    } = await request.json();

    const hasContent = typeof content === 'string' && content.trim().length > 0;
    const hasMedia = !!mediaUrl;

    if (!hasContent && !hasMedia) {
      return NextResponse.json(
        { error: 'Message content or media is required' },
        { status: 400 }
      );
    }

    if (!(await channelAccess(channelId, userId))) {
      return NextResponse.json({ error: 'Not a member of this server' }, { status: 403 });
    }

    if (hasContent && content.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: 'Message is too long' }, { status: 400 });
    }

    if (hasMedia && !isSafeMediaUrl(mediaUrl)) {
      return NextResponse.json({ error: 'Invalid media URL' }, { status: 400 });
    }

    const limit = await rateLimit(`send:${userId}`, 120, 60);
    if (!limit.allowed) return tooManyRequests(60);

    // Encrypted payloads are opaque to the server; only plaintext is screened.
    if (hasContent && !isEncrypted) {
      const mod = await moderateText(content.trim());
      if (mod.isToxic) {
        return NextResponse.json(
          { error: 'Message flagged by auto-moderation', toxicityReason: mod.reason },
          { status: 400 }
        );
      }
    }

    // Create message with optional media fields
    const [newMessage] = await db
      .insert(messages)
      .values({
        content: hasContent ? content.trim() : '',
        contentNonce: contentNonce || null,
        isEncrypted: !!isEncrypted,
        channelId,
        userId,
        ...(mediaUrl && { mediaUrl }),
        ...(mediaType && { mediaType }),
        mediaEncrypted: !!mediaEncrypted,
        mediaNonce: mediaNonce || null,
      })
      .returning({
        id: messages.id,
        content: messages.content,
        contentNonce: messages.contentNonce,
        isEncrypted: messages.isEncrypted,
        channelId: messages.channelId,
        userId: messages.userId,
        mediaUrl: messages.mediaUrl,
        mediaType: messages.mediaType,
        mediaEncrypted: messages.mediaEncrypted,
        mediaNonce: messages.mediaNonce,
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
