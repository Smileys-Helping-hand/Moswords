import { NextRequest, NextResponse } from 'next/server';
import { and, ilike, ne, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { requireUser } from '@/lib/session';
import { normalizeEmail } from '@/lib/validate';
import { rateLimit, tooManyRequests } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/users/search?q=<query>
 *
 * - A full email address finds exactly that account (you already know it).
 * - Anything else matches the start of a name or display name, and emails come
 *   back masked — substring search on emails would let anyone enumerate every
 *   address on the platform.
 */
export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const me = auth.user.id;

  const limit = await rateLimit(`search:${me}`, 60, 60);
  if (!limit.allowed) return tooManyRequests(60);

  const query = (request.nextUrl.searchParams.get('q') || '').trim().slice(0, 100);
  if (query.length < 2) return NextResponse.json({ users: [] });

  const columns = {
    id: users.id,
    email: users.email,
    name: users.name,
    displayName: users.displayName,
    photoURL: users.photoURL,
    customStatus: users.customStatus,
  };

  try {
    if (query.includes('@')) {
      const found = await db
        .select(columns)
        .from(users)
        .where(and(sql`lower(${users.email}) = ${normalizeEmail(query)}`, ne(users.id, me)))
        .limit(1);
      return NextResponse.json({ users: found });
    }

    const escaped = query.replace(/[\%_]/g, (c) => `\${c}`);
    const found = await db
      .select(columns)
      .from(users)
      .where(
        and(
          ne(users.id, me),
          or(
            ilike(users.displayName, `${escaped}%`),
            ilike(users.name, `${escaped}%`),
            ilike(users.displayName, `% ${escaped}%`),
            ilike(users.name, `% ${escaped}%`),
          ),
        ),
      )
      .limit(10);

    return NextResponse.json({ users: found.map((u) => ({ ...u, email: maskEmail(u.email) })) });
  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json({ error: 'Failed to search users' }, { status: 500 });
  }
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '';
  return `${local.slice(0, 2)}${'•'.repeat(Math.max(1, Math.min(6, local.length - 2)))}@${domain}`;
}
