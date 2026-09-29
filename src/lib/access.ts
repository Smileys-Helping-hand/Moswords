import { and, eq } from 'drizzle-orm';
import { db } from './db';
import { channels, groupChatMembers, serverMembers } from './schema';
import { isUuid } from './validate';

/** Returns the channel's serverId when the user is a member of that server, else null. */
export async function channelAccess(channelId: string, userId: string): Promise<{ serverId: string } | null> {
  if (!isUuid(channelId)) return null;
  const [row] = await db
    .select({ serverId: channels.serverId })
    .from(channels)
    .innerJoin(
      serverMembers,
      and(eq(serverMembers.serverId, channels.serverId), eq(serverMembers.userId, userId)),
    )
    .where(eq(channels.id, channelId))
    .limit(1);
  return row ?? null;
}

export async function isServerMember(serverId: string, userId: string): Promise<boolean> {
  if (!isUuid(serverId)) return false;
  const [row] = await db
    .select({ id: serverMembers.id })
    .from(serverMembers)
    .where(and(eq(serverMembers.serverId, serverId), eq(serverMembers.userId, userId)))
    .limit(1);
  return !!row;
}

export async function isGroupMember(groupChatId: string, userId: string): Promise<boolean> {
  if (!isUuid(groupChatId)) return false;
  const [row] = await db
    .select({ id: groupChatMembers.id })
    .from(groupChatMembers)
    .where(and(eq(groupChatMembers.groupChatId, groupChatId), eq(groupChatMembers.userId, userId)))
    .limit(1);
  return !!row;
}

/** The user's role in a server ('owner' | 'admin' | 'moderator' | 'member'), or null if not a member. */
export async function serverRole(serverId: string, userId: string): Promise<string | null> {
  if (!isUuid(serverId)) return null;
  const [row] = await db
    .select({ role: serverMembers.role })
    .from(serverMembers)
    .where(and(eq(serverMembers.serverId, serverId), eq(serverMembers.userId, userId)))
    .limit(1);
  return row?.role ?? null;
}

/**
 * LiveKit rooms are named after the conversation they belong to:
 * `group-<groupChatId>` or `channel-<channelId>`. Only members may join.
 */
export async function canJoinCallRoom(room: string, userId: string): Promise<boolean> {
  const match = /^(group|channel)-([0-9a-f-]{36})$/i.exec(room);
  if (!match) return false;
  const [, kind, id] = match;
  return kind === 'group' ? isGroupMember(id, userId) : !!(await channelAccess(id, userId));
}
