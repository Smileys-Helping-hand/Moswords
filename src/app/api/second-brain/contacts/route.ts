/**
 * GET  /api/second-brain/contacts - A user's contacts, for connected apps
 * POST /api/second-brain/contacts - Sync contacts from an app
 *
 * Legacy path kept for existing integrations; new work should use /api/v1/contacts.
 * Auth: ecosystem API key (Authorization: Bearer <key>) + the acting user via
 * X-User-Email / userEmail. The old version required a browser session, so no
 * server-to-server caller could ever use it.
 */
import { NextRequest, NextResponse } from 'next/server';
import { authenticateApp, resolveActingUser } from '@/lib/ecosystem-auth';
import { allContacts, MAX_BATCH, upsertContacts } from '@/lib/contacts-hub';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await authenticateApp(request, 'contacts.read');
  if (auth.response) return auth.response;
  const acting = await resolveActingUser(request);
  if (acting.response) return acting.response;

  const list = await allContacts(acting.user.id);
  return NextResponse.json({
    contacts: list.map((c) => ({
      id: c.id,
      email: c.email,
      name: c.name,
      phoneNumber: c.phone,
      photoURL: c.photoURL,
      source: c.source,
      metadata: { company: c.company, label: c.label, notes: c.notes },
      awehchatUserId: c.awehchatUserId,
    })),
    count: list.length,
    userId: acting.user.id,
    appName: auth.app.appName,
    timestamp: Date.now(),
  });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateApp(request, 'contacts.write');
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.contacts)) {
    return NextResponse.json({ error: 'Contacts must be an array' }, { status: 400 });
  }
  if (body.contacts.length > MAX_BATCH) {
    return NextResponse.json({ error: `At most ${MAX_BATCH} contacts per request` }, { status: 413 });
  }
  const acting = await resolveActingUser(request, body.userEmail);
  if (acting.response) return acting.response;

  const results = await upsertContacts(
    acting.user.id,
    auth.app.appName,
    body.contacts.map((c: Record<string, string>) => ({
      name: c.name,
      email: c.email,
      phone: c.phoneNumber ?? c.phone,
      photoURL: c.photoURL,
      externalId: c.externalId ?? c.id,
    })),
  );
  return NextResponse.json({
    success: true,
    synced: results.filter((r) => r.action !== 'skipped').length,
    results,
  });
}
