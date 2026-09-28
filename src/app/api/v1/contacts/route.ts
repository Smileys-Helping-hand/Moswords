import { NextRequest, NextResponse } from 'next/server';
import { authenticateApp, resolveActingUser } from '@/lib/ecosystem-auth';
import { listConnections, listContacts, MAX_BATCH, upsertContacts } from '@/lib/contacts-hub';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/contacts?userEmail=…&cursor=…&limit=…&include=connections
 *   Scope: contacts.read. First call without `cursor` returns the live book;
 *   pass back `nextCursor` to receive only changes (tombstones included).
 *
 * POST /api/v1/contacts   { userEmail, contacts: ContactInput[] }   (≤ 500)
 *   Scope: contacts.write. Upserts, de-duplicated by externalId → email → phone.
 *
 * Auth: Authorization: Bearer <ecosystem key>. Acting user: X-User-Email or userEmail.
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateApp(request, 'contacts.read');
  if (auth.response) return auth.response;
  const acting = await resolveActingUser(request);
  if (acting.response) return acting.response;

  const params = request.nextUrl.searchParams;
  try {
    const page = await listContacts(acting.user.id, {
      cursor: params.get('cursor'),
      limit: Number(params.get('limit')) || undefined,
    });
    const includeConnections = (params.get('include') || '').split(',').includes('connections');
    return NextResponse.json({
      ...page,
      ...(includeConnections ? { connections: await listConnections(acting.user.id) } : {}),
    });
  } catch (error) {
    console.error('v1 contacts list failed:', (error as Error).message);
    return NextResponse.json({ error: 'Failed to list contacts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateApp(request, 'contacts.write');
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.contacts)) {
    return NextResponse.json({ error: 'Body must be { userEmail, contacts: [...] }' }, { status: 400 });
  }
  if (body.contacts.length > MAX_BATCH) {
    return NextResponse.json({ error: `At most ${MAX_BATCH} contacts per request` }, { status: 413 });
  }

  const acting = await resolveActingUser(request, body.userEmail);
  if (acting.response) return acting.response;

  try {
    const results = await upsertContacts(acting.user.id, auth.app.appName, body.contacts);
    const summary = results.reduce<Record<string, number>>((acc, r) => {
      acc[r.action] = (acc[r.action] || 0) + 1;
      return acc;
    }, {});
    return NextResponse.json({ results, summary });
  } catch (error) {
    console.error('v1 contacts upsert failed:', (error as Error).message);
    return NextResponse.json({ error: 'Failed to save contacts' }, { status: 500 });
  }
}
