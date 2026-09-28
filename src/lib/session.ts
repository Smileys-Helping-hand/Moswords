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
