import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { passwordResets, users } from '@/lib/schema';
import { clientIp, rateLimit, tooManyRequests } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/reset-password { token, password }
 * Single use: the token is consumed atomically, and every other outstanding
 * reset link for the account stops working too.
 */
export async function POST(request: NextRequest) {
  const limit = await rateLimit(`reset:ip:${clientIp(request.headers)}`, 20, 60 * 60);
  if (!limit.allowed) return tooManyRequests(3600);

  const body = await request.json().catch(() => ({}));
  const token = typeof body.token === 'string' ? body.token : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!token || token.length > 200) {
    return NextResponse.json({ error: 'This reset link is invalid.' }, { status: 400 });
  }
  if (password.length < 8 || password.length > 200) {
    return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  // Claim the token in one statement so a link can't be used twice in a race.
  const [claimed] = await db
    .update(passwordResets)
    .set({ usedAt: sql`now()` })
    .where(
      and(
        eq(passwordResets.tokenHash, tokenHash),
        isNull(passwordResets.usedAt),
        gt(passwordResets.expiresAt, sql`now()`),
      ),
    )
    .returning({ userId: passwordResets.userId });

  if (!claimed) {
    return NextResponse.json(
      { error: 'This reset link has expired or was already used. Request a new one.' },
      { status: 400 },
    );
  }

  const hashed = await bcrypt.hash(password, 12);
  await db.update(users).set({ password: hashed }).where(eq(users.id, claimed.userId));
  await db
    .update(passwordResets)
    .set({ usedAt: sql`now()` })
    .where(and(eq(passwordResets.userId, claimed.userId), isNull(passwordResets.usedAt)));

  const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, claimed.userId)).limit(1);
  return NextResponse.json({ success: true, email: user?.email ?? null });
}
