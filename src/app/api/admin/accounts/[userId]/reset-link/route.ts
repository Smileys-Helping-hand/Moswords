import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { passwordResets, users } from '@/lib/schema';
import { adminContext } from '@/lib/admin-context';
import { isAdminUserId, isSuperAdmin } from '@/lib/admin';
import { SITE_URL } from '@/lib/site';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/accounts/:id/reset-link — create a one-time, 1-hour password
 * reset link for a user, for an admin to pass on (useful while email delivery
 * isn't available). Not for the owner account or your own.
 */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const ctx = await adminContext();
  if (ctx.response) return ctx.response;
  const { admin } = ctx;
  const { userId } = await params;

  const [target] = await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  // A reset link is a key to the account, so: never the owner's or your own,
  // and only the owner may create one for another admin.
  if (target.id === admin.id || isSuperAdmin(target.email) || (!admin.isSuperAdmin && (await isAdminUserId(target.id)))) {
    return NextResponse.json({ error: 'Not allowed for this account' }, { status: 403 });
  }

  const token = crypto.randomBytes(32).toString('base64url');
  await db.insert(passwordResets).values({
    tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
    userId: target.id,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });
  await admin.audit('created_reset_link', target.id, { email: target.email });

  return NextResponse.json(
    { link: `${SITE_URL}/reset-password?token=${encodeURIComponent(token)}`, expiresInMinutes: 60 },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
