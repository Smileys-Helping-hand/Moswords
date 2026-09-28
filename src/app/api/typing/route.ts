import { NextRequest, NextResponse } from 'next/server';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { typingStates, users } from '@/lib/schema';
import { requireUser } from '@/lib/session';
import { channelAccess, isGroupMember } from '@/lib/access';
import { isUuid } from '@/lib/validate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Scope = 'dm' | 'group' | 'channel';

/**
 * POST   /api/typing { scope, scopeId }  — "I'm typing" (client sends at most every ~3 s)
 * DELETE /api/typing { scope, scopeId }  — "I stopped"
 *
 * For DMs the scopeId is the *recipient's* user id, so the recipient's sync
 * query only has to look at rows addressed to them. Readers get typing state
 * through /api/sync.
 */
async function parse(request: NextRequest, me: string) {
  const body = await request.json().catch(() => ({}));
  const scope = body.scope as Scope;
  const scopeId = body.scopeId as string;
  if (!['dm', 'group', 'channel'].includes(scope) || !isUuid(scopeId)) return null;
  if (scope === 'dm' && scopeId === me) return null;
  if (scope === 'group' && !(await isGroupMember(scopeId, me))) return null;
  if (scope === 'channel' && !(await channelAccess(scopeId, me))) return null;
  return { scope, scopeId };
}

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const me = auth.user.id;

  const target = await parse(request, me);
  if (!target) return NextResponse.json({ error: 'Invalid typing target' }, { status: 400 });

  const [profile] = await db
    .select({ displayName: users.displayName, name: users.name })
    .from(users)
    .where(eq(users.id, me))
    .limit(1);

  await db
    .insert(typingStates)
    .values({ ...target, userId: me, userName: profile?.displayName || profile?.name || 'Someone' })
    .onConflictDoUpdate({
      target: [typingStates.scope, typingStates.scopeId, typingStates.userId],
      set: { updatedAt: sql`now()` },
    });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const me = auth.user.id;

  const target = await parse(request, me);
  if (!target) return NextResponse.json({ ok: true });

  await db
    .delete(typingStates)
    .where(
      and(
        eq(typingStates.scope, target.scope),
        eq(typingStates.scopeId, target.scopeId),
        eq(typingStates.userId, me),
      ),
    );
  return NextResponse.json({ ok: true });
}
