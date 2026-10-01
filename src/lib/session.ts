import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from './auth';

export interface SessionUser {
  id: string;
  email: string | null;
}

/**
 * Resolve the signed-in user for an API route.
 *
 * Returns `{ user }` on success or `{ response }` holding a ready 401 to return.
 * Always passes `authOptions` — calling getServerSession() without it silently
 * drops the user id from the session.
 */
export async function requireUser(): Promise<
  { user: SessionUser; response?: undefined } | { user?: undefined; response: NextResponse }
> {
  const session = await getServerSession(authOptions);
  const id = (session?.user as { id?: string } | undefined)?.id;
  if (!id) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { user: { id, email: session?.user?.email ?? null } };
}

export { isUuid, normalizeEmail } from './validate';

/** Like requireUser, but only for the superadmin or rows in admin_users. */
export async function requireAdmin(): Promise<
  { user: SessionUser; response?: undefined } | { user?: undefined; response: NextResponse }
> {
  const auth = await requireUser();
  if (auth.response) return auth;
  const { isAdminUserId, isSuperAdmin } = await import('./admin');
  if (isSuperAdmin(auth.user.email ?? undefined) || (await isAdminUserId(auth.user.id))) return auth;
  return { response: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) };
}

/** Owner-only actions: API keys, integrations, admin roles, deleting accounts. */
export async function requireSuperAdmin(): Promise<
  { user: SessionUser; response?: undefined } | { user?: undefined; response: NextResponse }
> {
  const auth = await requireUser();
  if (auth.response) return auth;
  const { isSuperAdmin } = await import('./admin');
  if (isSuperAdmin(auth.user.email ?? undefined)) return auth;
  return { response: NextResponse.json({ error: 'Only the owner can do this' }, { status: 403 }) };
}
