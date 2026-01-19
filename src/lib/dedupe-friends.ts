import 'dotenv/config';
import { db } from './db';
import { friends } from './schema';
import { eq, and } from 'drizzle-orm';

type FriendRow = typeof friends.$inferSelect;

type Status = 'accepted' | 'pending' | 'blocked' | (string & {});

const statusRank: Record<string, number> = {
  accepted: 3,
  pending: 2,
  blocked: 1,
};

function rankStatus(status: string | null | undefined): number {
  if (!status) return 0;
  return statusRank[status] ?? 0;
}

function compareRowsToKeep(a: FriendRow, b: FriendRow): FriendRow {
  // Prefer accepted > pending > blocked
  const rankDiff = rankStatus(b.status as Status) - rankStatus(a.status as Status);
  if (rankDiff !== 0) return rankDiff > 0 ? b : a;

  // Prefer most recent row (createdAt)
  const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  if (bTime !== aTime) return bTime > aTime ? b : a;

  // Stable fallback
  return a.id <= b.id ? a : b;
}

async function dedupeFriends() {
  console.log('🧹 Dedupe friends table (user_id, friend_id)...');

  const rows = await db.select().from(friends);

  const groups = new Map<string, FriendRow[]>();
  for (const row of rows) {
    const key = `${row.userId}::${row.friendId}`;
    const list = groups.get(key);
    if (list) list.push(row);
    else groups.set(key, [row]);
  }

  const duplicates = Array.from(groups.values()).filter((g) => g.length > 1);
  if (duplicates.length === 0) {
    console.log('✅ No duplicate friend pairs found.');
    return;
  }

  console.log(`Found ${duplicates.length} duplicate pair(s). Cleaning up...`);

  let deleteCount = 0;
  for (const group of duplicates) {
    let keep = group[0];
    for (let i = 1; i < group.length; i++) {
      keep = compareRowsToKeep(keep, group[i]);
    }

    const toDelete = group.filter((r) => r.id !== keep.id);

    for (const row of toDelete) {
      await db
        .delete(friends)
        .where(and(eq(friends.userId, row.userId), eq(friends.friendId, row.friendId), eq(friends.id, row.id)));
      deleteCount++;
    }
  }

  console.log(`✅ Deleted ${deleteCount} duplicate row(s).`);
  console.log('Next step: run `npm run db:push` to create the unique index.');
}

dedupeFriends()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Failed to dedupe friends:', error);
    process.exit(1);
  });
