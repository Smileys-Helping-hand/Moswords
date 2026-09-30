/**
 * GET /api/second-brain/auth/me — look up an AwehChat user's public profile.
 *
 * Legacy path kept for existing integrations. Auth: an ecosystem app key with
 * `profile.read` (Authorization: Bearer <key>) plus the user via X-User-Email.
 * The old shared "master token" is gone — it was committed publicly.
 */
import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { authenticateApp, resolveActingUser } from '@/lib/ecosystem-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await authenticateApp(request, 'profile.read');
  if (auth.response) return auth.response;
  const acting = await resolveActingUser(request);
  if (acting.response) return acting.response;

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      displayName: users.displayName,
      photoURL: users.photoURL,
      customStatus: users.customStatus,
    })
    .from(users)
    .where(eq(users.id, acting.user.id))
    .limit(1);

  return NextResponse.json(
    {
      uid: user.id,
      email: user.email,
      displayName: user.displayName || user.name || null,
      photoURL: user.photoURL,
      customStatus: user.customStatus,
      authenticated: true,
      appName: auth.app.appName,
      timestamp: Date.now(),
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
