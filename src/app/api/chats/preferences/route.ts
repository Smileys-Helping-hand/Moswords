import { NextRequest, NextResponse } from 'next/server';
import { and, asc, eq, sql } from 'drizzle-orm';
import { db, runBatch } from '@/lib/db';
import { chatFolders, chatPreferences } from '@/lib/schema';
import { requireUser } from '@/lib/session';
import { isGroupMember } from '@/lib/access';
import { isUuid } from '@/lib/validate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/chats/preferences — the user's folders plus archive/pin/folder for each chat. */
export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const me = auth.user.id;

  const [folders, prefs] = await runBatch([
    db
      .select({ id: chatFolders.id, name: chatFolders.name, position: chatFolders.position })
      .from(chatFolders)
      .where(eq(chatFolders.userId, me))
      .orderBy(asc(chatFolders.position), asc(chatFolders.createdAt)),
    db
      .select({
        chatType: chatPreferences.chatType,
        chatId: chatPreferences.chatId,
        archived: chatPreferences.archived,
        pinned: chatPreferences.pinned,
        folderId: chatPreferences.folderId,
      })
      .from(chatPreferences)
      .where(eq(chatPreferences.userId, me)),
  ]);

  return NextResponse.json({ folders, prefs }, { headers: { 'Cache-Control': 'no-store' } });
}

/**
 * PATCH /api/chats/preferences
 * { chatType: 'dm' | 'group', chatId, archived?, pinned?, folderId? (null = no folder) }
 * Only affects the signed-in user's view of that chat.
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const me = auth.user.id;

  const body = await request.json().catch(() => ({}));
  const { chatType, chatId } = body;
  if ((chatType !== 'dm' && chatType !== 'group') || !isUuid(chatId) || (chatType === 'dm' && chatId === me)) {
    return NextResponse.json({ error: 'Invalid chat' }, { status: 400 });
  }
  if (chatType === 'group' && !(await isGroupMember(chatId, me))) {
    return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
  }

  const set: Partial<typeof chatPreferences.$inferInsert> = {};
  if (typeof body.archived === 'boolean') set.archived = body.archived;
  if (typeof body.pinned === 'boolean') set.pinned = body.pinned;
  if (body.folderId === null) set.folderId = null;
  else if (body.folderId !== undefined) {
    if (!isUuid(body.folderId)) return NextResponse.json({ error: 'Invalid folder' }, { status: 400 });
    const [folder] = await db
      .select({ id: chatFolders.id })
      .from(chatFolders)
      .where(and(eq(chatFolders.id, body.folderId), eq(chatFolders.userId, me)))
      .limit(1);
    if (!folder) return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    set.folderId = folder.id;
  }
  if (Object.keys(set).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const [pref] = await db
    .insert(chatPreferences)
    .values({ userId: me, chatType, chatId, ...set, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [chatPreferences.userId, chatPreferences.chatType, chatPreferences.chatId],
      set: { ...set, updatedAt: sql`now()` },
    })
    .returning({
      chatType: chatPreferences.chatType,
      chatId: chatPreferences.chatId,
      archived: chatPreferences.archived,
      pinned: chatPreferences.pinned,
      folderId: chatPreferences.folderId,
    });

  return NextResponse.json({ pref });
}
