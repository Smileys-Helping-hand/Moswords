import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { chatFolders } from '@/lib/schema';
import { requireUser } from '@/lib/session';
import { isUuid } from '@/lib/validate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ folderId: string }> };

/** PATCH { name?, position? } — rename or reorder one of your folders. */
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { folderId } = await params;
  if (!isUuid(folderId)) return NextResponse.json({ error: 'Folder not found' }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const set: { name?: string; position?: number } = {};
  if (typeof body.name === 'string' && body.name.trim()) set.name = body.name.trim().slice(0, 30);
  if (Number.isInteger(body.position)) set.position = body.position;
  if (Object.keys(set).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

  const [folder] = await db
    .update(chatFolders)
    .set(set)
    .where(and(eq(chatFolders.id, folderId), eq(chatFolders.userId, auth.user.id)))
    .returning({ id: chatFolders.id, name: chatFolders.name, position: chatFolders.position });
  if (!folder) return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
  return NextResponse.json({ folder });
}

/** DELETE — remove a folder. Chats in it simply go back to "All". */
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { folderId } = await params;
  if (!isUuid(folderId)) return NextResponse.json({ error: 'Folder not found' }, { status: 404 });

  const deleted = await db
    .delete(chatFolders)
    .where(and(eq(chatFolders.id, folderId), eq(chatFolders.userId, auth.user.id)))
    .returning({ id: chatFolders.id });
  if (deleted.length === 0) return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
