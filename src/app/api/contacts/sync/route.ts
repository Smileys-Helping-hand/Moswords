import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { allContacts, deleteContact, toUiContact, updateContact, upsertContacts } from '@/lib/contacts-hub';
import { isUuid } from '@/lib/validate';

export const dynamic = 'force-dynamic';

interface UiEvent {
  type: 'add' | 'update' | 'delete' | 'sync';
  contact: { id?: string; name?: string; email?: string; phone?: string; avatar?: string };
}

/**
 * POST /api/contacts/sync { events } — apply the contact editor's queued
 * changes in order, then return the full, authoritative list.
 */
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const me = auth.user.id;

  const { events } = await req.json().catch(() => ({ events: null }));
  if (!Array.isArray(events)) {
    return NextResponse.json({ error: 'Events must be an array' }, { status: 400 });
  }

  try {
    for (const event of (events as UiEvent[]).slice(0, 200)) {
      const c = event.contact || {};
      const input = { name: c.name, email: c.email, phone: c.phone, photoURL: c.avatar };
      if (event.type === 'add') {
        await upsertContacts(me, 'awehchat', [input]);
      } else if (event.type === 'update' && isUuid(c.id)) {
        await updateContact(me, c.id, input);
      } else if (event.type === 'delete' && isUuid(c.id)) {
        await deleteContact(me, c.id);
      }
    }
    const list = await allContacts(me);
    return NextResponse.json({ contacts: list.map((c) => toUiContact(c, me)) });
  } catch (error) {
    console.error('Error syncing contacts:', (error as Error).message);
    return NextResponse.json({ error: 'Failed to sync contacts' }, { status: 500 });
  }
}
