import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { isAdmin, isSuperAdmin } from '@/lib/admin';

export const dynamic = 'force-dynamic';

/** GET /api/admin/me — is the signed-in user an admin? (Used to show the dashboard link.) */
export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const email = auth.user.email ?? undefined;
  const owner = isSuperAdmin(email);
  return NextResponse.json(
    { isAdmin: owner || (await isAdmin(email)), isSuperAdmin: owner },
    { headers: { 'Cache-Control': 'private, max-age=60' } },
  );
}
