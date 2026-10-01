import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { passwordResets, users } from '@/lib/schema';
import { isEmail, normalizeEmail } from '@/lib/validate';
import { clientIp, rateLimit, tooManyRequests } from '@/lib/rate-limit';
import { generatePasswordResetEmail, sendEmail } from '@/lib/email';
import { SITE_URL } from '@/lib/site';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GENERIC = {
  message: 'If an account exists for that email, a reset link is on its way. Check your inbox and spam folder.',
};

/**
 * POST /api/auth/forgot-password { email }
 * Always answers the same way, so it can't be used to find out who has an account.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const email = normalizeEmail(body.email);
  if (!isEmail(email)) {
    return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
  }

  const [perIp, perEmail] = await Promise.all([
    rateLimit(`forgot:ip:${clientIp(request.headers)}`, 10, 60 * 60),
    rateLimit(`forgot:email:${email}`, 3, 60 * 60),
  ]);
  if (!perIp.allowed) return tooManyRequests(3600);
  if (!perEmail.allowed) return NextResponse.json(GENERIC); // quietly stop mail-bombing one inbox

  const [user] = await db
    .select({ id: users.id, name: users.displayName, fallback: users.name })
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`)
    .limit(1);

  if (user) {
    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await db.insert(passwordResets).values({
      tokenHash,
      userId: user.id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const link = `${SITE_URL}/reset-password?token=${encodeURIComponent(token)}`;
    const mail = generatePasswordResetEmail(user.name || user.fallback || 'there', link);
    try {
      await sendEmail({ to: email, subject: 'Reset your Moswords password', htmlBody: mail.html, textBody: mail.text });
    } catch (error) {
      // Still answer generically; the failure is in the server log.
      console.error('password reset email failed:', (error as Error).message);
    }
  }

  return NextResponse.json(GENERIC);
}
