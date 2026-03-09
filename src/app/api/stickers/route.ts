import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
export const dynamic = 'force-dynamic';
import { db } from '@/lib/db';
import { userStickers } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';

// ── GET /api/stickers ─────────────────────────────────────────────────────────
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as any).id ?? (session.user as any).uid;

  const rows = await db
    .select()
    .from(userStickers)
    .where(eq(userStickers.userId, userId))
    .orderBy(desc(userStickers.createdAt));

  return NextResponse.json({ stickers: rows });
}

// ── POST /api/stickers ────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as any).id ?? (session.user as any).uid;

  const body = await req.json();
  const imageUrl: string = body?.imageUrl;
  if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.length > 2000) {
    return NextResponse.json({ error: 'Invalid imageUrl' }, { status: 400 });
  }

  // Only allow URLs from our own R2 bucket
  const allowed = process.env.NEXT_PUBLIC_R2_DOMAIN ?? '';
  if (allowed && !imageUrl.startsWith(allowed)) {
    return NextResponse.json({ error: 'imageUrl not from allowed domain' }, { status: 400 });
  }

  const [row] = await db
    .insert(userStickers)
    .values({ userId, imageUrl })
    .returning();

  return NextResponse.json({ sticker: row }, { status: 201 });
}
