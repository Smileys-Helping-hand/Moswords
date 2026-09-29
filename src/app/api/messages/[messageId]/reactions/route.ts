/**
 * Message Reactions API Endpoint
 * Handles emoji reactions on messages
 */

import { NextRequest, NextResponse } from 'next/server';
import { channelAccess } from '@/lib/access';
import { isUuid } from '@/lib/validate';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { messages, messageReactions } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/messages/[messageId]/reactions
 * Get all reactions for a message
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId } = await params;
    if (!(await canSeeMessage(messageId, (session.user as any).id))) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const reactions = await db
      .select()
      .from(messageReactions)
      .where(eq(messageReactions.messageId, messageId));

    // Group reactions by emoji
    const grouped = reactions.reduce((acc, reaction) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = {
          emoji: reaction.emoji,
          count: 0,
          users: [],
          hasReacted: false,
        };
      }
      acc[reaction.emoji].count++;
      acc[reaction.emoji].users.push({
        userId: reaction.userId,
        userName: reaction.userName,
      });
      if (reaction.userId === (session.user as any).id) {
        acc[reaction.emoji].hasReacted = true;
      }
      return acc;
    }, {} as Record<string, any>);

    return NextResponse.json({
      reactions: Object.values(grouped),
    });
  } catch (error) {
    console.error('Error fetching reactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reactions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/messages/[messageId]/reactions
 * Add or remove a reaction
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId } = await params;
    if (!(await canSeeMessage(messageId, (session.user as any).id))) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }
    const { emoji } = await request.json();

    if (!emoji || typeof emoji !== 'string' || emoji.length > 16) {
      return NextResponse.json({ error: 'Invalid emoji' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const userName = (session.user as any).displayName || (session.user as any).name || 'User';

    // Check if reaction already exists
    const existing = await db
      .select()
      .from(messageReactions)
      .where(
        and(
          eq(messageReactions.messageId, messageId),
          eq(messageReactions.userId, userId),
          eq(messageReactions.emoji, emoji)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Remove reaction (toggle off)
      await db
        .delete(messageReactions)
        .where(
          and(
            eq(messageReactions.messageId, messageId),
            eq(messageReactions.userId, userId),
            eq(messageReactions.emoji, emoji)
          )
        );

      return NextResponse.json({ action: 'removed', emoji });
    } else {
      // Add reaction
      await db.insert(messageReactions).values({
        id: `${messageId}-${userId}-${emoji}-${Date.now()}`,
        messageId,
        userId,
        userName,
        emoji,
        createdAt: new Date(),
      });

      return NextResponse.json({ action: 'added', emoji });
    }
  } catch (error) {
    console.error('Error adding reaction:', error);
    return NextResponse.json(
      { error: 'Failed to add reaction' },
      { status: 500 }
    );
  }
}

/** Reactions belong to channel messages; only members of that server may see or add them. */
async function canSeeMessage(messageId: string, userId: string): Promise<boolean> {
  if (!isUuid(messageId)) return false;
  const [msg] = await db
    .select({ channelId: messages.channelId })
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1);
  return !!msg && !!(await channelAccess(msg.channelId, userId));
}
