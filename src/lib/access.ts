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
