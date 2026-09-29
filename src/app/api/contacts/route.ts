import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { allContacts, getContact, toUiContact, upsertContacts } from '@/lib/contacts-hub';

export const dynamic = 'force-dynamic';

/** GET /api/contacts — the signed-in user's contact book. */
export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  try {
    const list = await allContacts(auth.user.id);
    return NextResponse.json({ contacts: list.map((c) => toUiContact(c, auth.user.id)) });
  } catch (error) {
    console.error('Error fetching contacts:', (error as Error).message);
    return NextResponse.json({ error: 'Failed to load contacts' }, { status: 500 });
  }
}

/** POST /api/contacts { name, email?, phone?, avatar? } — add a contact (merges with an existing match). */
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const { name, email, phone, avatar } = await req.json().catch(() => ({}));
  if (!name?.trim() || (!email?.trim() && !phone?.trim())) {
    return NextResponse.json({ error: 'Name and an email or phone number are required' }, { status: 400 });
  }

  try {
    const [result] = await upsertContacts(auth.user.id, 'awehchat', [{ name, email, phone, photoURL: avatar }]);
    if (!result?.id) {
      return NextResponse.json({ error: result?.error || 'Could not save contact' }, { status: 400 });
    }
    const contact = await getContact(auth.user.id, result.id);
    return NextResponse.json(
      { contact: contact && toUiContact(contact, auth.user.id) },
      { status: result.action === 'created' ? 201 : 200 },
    );
  } catch (error) {
    console.error('Error creating contact:', (error as Error).message);
    return NextResponse.json({ error: 'Failed to save contact' }, { status: 500 });
  }
}
