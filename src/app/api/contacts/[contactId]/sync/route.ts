import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { deleteContact, shareContactWith, toUiContact, updateContact } from '@/lib/contacts-hub';
import { isUuid } from '@/lib/validate';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ contactId: string }> };

/** POST { system } — share this contact with an ecosystem app (delivered to it via /api/v1 delta sync). */
export async function POST(req: NextRequest, { params }: Ctx) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { contactId } = await params;
  const { system } = await req.json().catch(() => ({}));
  if (!isUuid(contactId) || typeof system !== 'string' || !/^[a-z0-9-]{2,40}$/i.test(system)) {
    return NextResponse.json({ error: 'Invalid contact or app' }, { status: 400 });
  }
  const contact = await shareContactWith(auth.user.id, contactId, system);
  if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
  return NextResponse.json({ contact: toUiContact(contact, auth.user.id) });
}

/** PUT — edit a contact. */
export async function PUT(req: NextRequest, { params }: Ctx) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { contactId } = await params;
  const updates = await req.json().catch(() => ({}));
  const contact = isUuid(contactId)
    ? await updateContact(auth.user.id, contactId, {
        name: updates.name,
        email: updates.email,
        phone: updates.phone,
        photoURL: updates.avatar,
      })
    : null;
  if (!contact) return NextResponse.json({ error: 'Contact not found or invalid' }, { status: 404 });
  return NextResponse.json({ contact: toUiContact(contact, auth.user.id) });
}

/** DELETE — remove a contact (soft delete, so other apps learn about it). */
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { contactId } = await params;
  const ok = isUuid(contactId) && (await deleteContact(auth.user.id, contactId));
  if (!ok) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
  return NextResponse.json({ success: true, id: contactId });
}
