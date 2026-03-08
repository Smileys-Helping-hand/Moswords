import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { gifItems, gifPacks } from '@/lib/schema';
import { eq, ilike, or, sql } from 'drizzle-orm';
import { BUILT_IN_PACKS, searchBuiltIn } from '@/lib/gif-library';

/**
 * GET /api/gifs
 *
 * Query params:
 *   pack  – pack slug (e.g. "reactions"). Omit for all.
 *   q     – search query (searches title + tags).
 *   limit – max results (default 48)
 *   source – "db" | "builtin" | "all" (default "all")
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const pack = searchParams.get('pack') ?? '';
  const q = (searchParams.get('q') ?? '').trim();
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '48', 10), 200);
  const source = searchParams.get('source') ?? 'all';

  // ── 1. Try DB first ──────────────────────────────────────────────────────
  let dbItems: Array<{
    id: string; packId: string; title: string; tags: string[];
    url: string; thumbUrl: string | null; sortOrder: number;
    packSlug: string | null; packName: string | null; packEmoji: string | null;
  }> = [];

  if (source !== 'builtin') {
    try {
      const query = db
        .select({
          id: gifItems.id,
          packId: gifItems.packId,
          title: gifItems.title,
          tags: gifItems.tags,
          url: gifItems.url,
          thumbUrl: gifItems.thumbUrl,
          sortOrder: gifItems.sortOrder,
          packSlug: gifPacks.slug,
          packName: gifPacks.name,
          packEmoji: gifPacks.emoji,
        })
        .from(gifItems)
        .leftJoin(gifPacks, eq(gifItems.packId, gifPacks.id));

      // Apply filters
      const conditions = [];
      if (pack) conditions.push(eq(gifPacks.slug, pack));
      if (q) {
        conditions.push(
          or(
            ilike(gifItems.title, `%${q}%`),
            sql`${gifItems.tags}::text ilike ${'%' + q + '%'}`,
          )
        );
      }

      const result = await (conditions.length > 0
        ? query.where(conditions.length === 1 ? conditions[0] : sql`(${conditions.reduce((a, b) => sql`${a} AND ${b}`)})`)
        : query
      ).limit(limit).execute();

      dbItems = result as typeof dbItems;
    } catch (_e) {
      // DB may not have the tables yet — fall through to built-in
    }
  }

  // ── 2. Built-in fallback ─────────────────────────────────────────────────
  let builtInItems: Array<{
    id: string; title: string; tags: string[];
    url: string; thumbUrl: string | null; sortOrder: number;
    packSlug: string; packName: string; packEmoji: string;
  }> = [];

  if (source !== 'db') {
    const filtered = q
      ? searchBuiltIn(q)
      : pack
        ? (BUILT_IN_PACKS.find((p) => p.id === pack)?.gifs ?? [])
        : BUILT_IN_PACKS.flatMap((p) => p.gifs);

    builtInItems = filtered.slice(0, limit).map((g) => {
      const parentPack = BUILT_IN_PACKS.find((p) => p.gifs.some((gi) => gi.id === g.id))!;
      return {
        id: `builtin__${g.id}`,
        title: g.title,
        tags: g.tags,
        url: g.url,
        thumbUrl: null,
        sortOrder: 0,
        packSlug: parentPack?.id ?? 'reactions',
        packName: parentPack?.name ?? 'Reactions',
        packEmoji: parentPack?.emoji ?? '😂',
      };
    });
  }

  // ── 3. Merge, de-duplicate by URL ────────────────────────────────────────
  const seen = new Set<string>();
  const merged = [...dbItems, ...builtInItems].filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });

  return NextResponse.json({ gifs: merged });
}

/**
 * POST /api/gifs
 * Add a custom GIF to a pack (admin / power users).
 * Body: { packId, title, url, thumbUrl?, tags? }
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { packId, title, url, thumbUrl, tags } = body;

  if (!packId || !title || !url) {
    return NextResponse.json({ error: 'packId, title and url are required' }, { status: 400 });
  }

  // Validate URL is https (security)
  if (!url.startsWith('https://')) {
    return NextResponse.json({ error: 'url must use HTTPS' }, { status: 400 });
  }

  const [row] = await db
    .insert(gifItems)
    .values({
      packId,
      title,
      url,
      thumbUrl: thumbUrl ?? null,
      tags: tags ?? [],
    })
    .returning();

  return NextResponse.json({ gif: row }, { status: 201 });
}
