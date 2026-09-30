import { NextRequest, NextResponse } from 'next/server';
import { count, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { chatFolders } from '@/lib/schema';
import { requireUser } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_FOLDERS = 20;

/** POST /api/chats/folders { name } — create a chat folder (category). */
export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const me = auth.user.id;

  const { name } = await request.json().catch(() => ({}));
  const clean = typeof name === 'string' ? name.trim().slice(0, 30) : '';
  if (!clean) return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });

  const [{ n }] = await db.select({ n: count() }).from(chatFolders).where(eq(chatFolders.userId, me));
  if (Number(n) >= MAX_FOLDERS) {
    return NextResponse.json({ error: `You can have up to ${MAX_FOLDERS} folders` }, { status: 400 });
  }

  const [folder] = await db
    .insert(chatFolders)
    .values({
      userId: me,
      name: clean,
      position: sql`(SELECT COALESCE(MAX(position), -1) + 1 FROM chat_folders WHERE user_id = ${me})`,
    })
    .returning({ id: chatFolders.id, name: chatFolders.name, position: chatFolders.position });

  return NextResponse.json({ folder }, { status: 201 });
}
