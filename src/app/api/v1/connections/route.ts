import { NextRequest, NextResponse } from 'next/server';
import { authenticateApp, resolveActingUser } from '@/lib/ecosystem-auth';
import { listConnections } from '@/lib/contacts-hub';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/v1/connections?userEmail=… — the user's AwehChat friends. Scope friends.read. */
export async function GET(request: NextRequest) {
  const auth = await authenticateApp(request, 'friends.read');
  if (auth.response) return auth.response;
  const acting = await resolveActingUser(request);
  if (acting.response) return acting.response;
  return NextResponse.json({ connections: await listConnections(acting.user.id) });
}
