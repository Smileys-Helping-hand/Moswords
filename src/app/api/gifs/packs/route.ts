import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
export const dynamic = 'force-dynamic';
import { db } from '@/lib/db';
import { gifPacks, gifItems } from '@/lib/schema';
import { eq, asc, sql } from 'drizzle-orm';
import { BUILT_IN_PACKS } from '@/lib/gif-library';

/**
 * GET /api/gifs/packs
 * Returns all packs with their item counts.
 * DB packs take priority; built-in packs fill in any gaps.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let dbPacks: Array<{ id: string; name: string; slug: string; emoji: string; sortOrder: number; count: number }> = [];

  try {
    const rows = await db
      .select({
        id: gifPacks.id,
        name: gifPacks.name,
        slug: gifPacks.slug,
        emoji: gifPacks.emoji,
        sortOrder: gifPacks.sortOrder,
        count: sql<number>`cast(count(${gifItems.id}) as int)`,
      })
      .from(gifPacks)
      .leftJoin(gifItems, eq(gifItems.packId, gifPacks.id))
      .groupBy(gifPacks.id, gifPacks.name, gifPacks.slug, gifPacks.emoji, gifPacks.sortOrder)
      .orderBy(asc(gifPacks.sortOrder));

    dbPacks = rows as typeof dbPacks;
  } catch (_e) {
    // Tables don't exist yet — return built-in packs only
  }

  // Merge: built-in packs provide count from static data when DB is empty
  const dbSlugs = new Set(dbPacks.map((p) => p.slug));
  const builtInAsDbPacks = BUILT_IN_PACKS.filter((p) => !dbSlugs.has(p.id)).map((p, i) => ({
    id: `builtin__${p.id}`,
    name: p.name,
    slug: p.id,
    emoji: p.emoji,
    sortOrder: 100 + i,
    count: p.gifs.length,
  }));

  // For DB packs that also have built-in data, add built-in count if DB is empty
  const merged = [
    ...dbPacks.map((p) => ({
      ...p,
      count: p.count > 0 ? p.count : (BUILT_IN_PACKS.find((bp) => bp.id === p.slug)?.gifs.length ?? 0),
    })),
    ...builtInAsDbPacks,
  ];

  return NextResponse.json({ packs: merged });
}
