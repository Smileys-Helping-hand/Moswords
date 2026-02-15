import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  channels,
  conversationKeys,
  deviceKeys,
  groupChatMembers,
  serverMembers,
} from '@/lib/schema';
import { and, eq, inArray } from 'drizzle-orm';

function isUserInDmScope(scopeId: string, userId: string): boolean {
  const parts = scopeId.split(':').filter(Boolean);
  return parts.includes(userId);
}

// GET /api/keys/conversation?scope=channel|dm|group&scopeId=...&deviceId=...
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id as string;
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope');
    const scopeId = searchParams.get('scopeId');
    const deviceId = searchParams.get('deviceId');

    if (!scope || !scopeId || !deviceId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const [record] = await db
      .select({ encryptedKey: conversationKeys.encryptedKey })
      .from(conversationKeys)
      .where(
        and(
          eq(conversationKeys.scope, scope),
          eq(conversationKeys.scopeId, scopeId),
          eq(conversationKeys.deviceId, deviceId),
          eq(conversationKeys.userId, userId)
        )
      )
      .limit(1);

    return NextResponse.json({ encryptedKey: record?.encryptedKey || null });
  } catch (error) {
    console.error('Conversation key fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch conversation key' }, { status: 500 });
  }
}

// POST /api/keys/conversation
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id as string;
    const body = await request.json();
    const { scope, scopeId, entries } = body || {};

    if (!scope || !scopeId || !Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Basic access checks
    if (scope === 'dm' && !isUserInDmScope(scopeId, userId)) {
      return NextResponse.json({ error: 'Not authorized for this DM' }, { status: 403 });
    }

    if (scope === 'group') {
      const [membership] = await db
        .select()
        .from(groupChatMembers)
        .where(and(eq(groupChatMembers.groupChatId, scopeId), eq(groupChatMembers.userId, userId)));
      if (!membership) {
        return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
      }
    }

    if (scope === 'channel') {
      const [channel] = await db
        .select({ serverId: channels.serverId })
        .from(channels)
        .where(eq(channels.id, scopeId));

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
    }

    const deviceIds = entries.map((entry: any) => entry.deviceId).filter(Boolean);
    const deviceRecords = await db
      .select({ deviceId: deviceKeys.deviceId, userId: deviceKeys.userId })
      .from(deviceKeys)
      .where(inArray(deviceKeys.deviceId, deviceIds));

    const userByDevice = new Map(deviceRecords.map((record) => [record.deviceId, record.userId]));

    for (const entry of entries) {
      const targetUserId = userByDevice.get(entry.deviceId);
      if (!targetUserId) continue;

      await db
        .insert(conversationKeys)
        .values({
          scope,
          scopeId,
          userId: targetUserId,
          deviceId: entry.deviceId,
          encryptedKey: entry.encryptedKey,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [conversationKeys.scope, conversationKeys.scopeId, conversationKeys.deviceId],
          set: {
            encryptedKey: entry.encryptedKey,
            updatedAt: new Date(),
          },
        });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Conversation key save error:', error);
    return NextResponse.json({ error: 'Failed to save conversation keys' }, { status: 500 });
  }
}
