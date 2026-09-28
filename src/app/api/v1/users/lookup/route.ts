import { NextRequest, NextResponse } from 'next/server';
import { authenticateApp } from '@/lib/ecosystem-auth';
import { lookupAccounts, MAX_BATCH } from '@/lib/contacts-hub';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/users/lookup  { emails: string[] }  — scope profile.read
 * Which of these people already have AwehChat accounts (for "Message" vs "Invite").
 * Only emails the caller already knows are ever confirmed; nothing is enumerable.
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateApp(request, 'profile.read');
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.emails)) {
    return NextResponse.json({ error: 'Body must be { emails: [...] }' }, { status: 400 });
  }
  if (body.emails.length > MAX_BATCH) {
    return NextResponse.json({ error: `At most ${MAX_BATCH} emails per request` }, { status: 413 });
  }
  return NextResponse.json({ users: await lookupAccounts(body.emails) });
}
