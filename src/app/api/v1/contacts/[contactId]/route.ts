import { NextRequest, NextResponse } from 'next/server';
import { authenticateApp, resolveActingUser } from '@/lib/ecosystem-auth';
import { deleteContact, getContact } from '@/lib/contacts-hub';
import { isUuid } from '@/lib/validate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ contactId: string }> };

/** GET /api/v1/contacts/:id — scope contacts.read */
export async function GET(request: NextRequest, { params }: Ctx) {
  const auth = await authenticateApp(request, 'contacts.read');
  if (auth.response) return auth.response;
  const acting = await resolveActingUser(request);
  if (acting.response) return acting.response;

  const { contactId } = await params;
  const contact = isUuid(contactId) ? await getContact(acting.user.id, contactId) : null;
  if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
  return NextResponse.json({ contact });
}

/** DELETE /api/v1/contacts/:id — scope contacts.write. Soft delete; appears as a tombstone in deltas. */
export async function DELETE(request: NextRequest, { params }: Ctx) {
  const auth = await authenticateApp(request, 'contacts.write');
  if (auth.response) return auth.response;
  const acting = await resolveActingUser(request);
  if (acting.response) return acting.response;

  const { contactId } = await params;
  const deleted = isUuid(contactId) && (await deleteContact(acting.user.id, contactId));
  if (!deleted) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
