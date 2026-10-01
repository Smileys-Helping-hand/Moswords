import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { adminUsers, users } from '@/lib/schema';
import { adminContext } from '@/lib/admin-context';
import { isAdminUserId, isSuperAdmin } from '@/lib/admin';
import { forgetAccountStatus } from '@/lib/account-status';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ userId: string }> };

async function loadTarget(userId: string) {
  const [target] = await db
    .select({ id: users.id, email: users.email, suspendedAt: users.suspendedAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return target ?? null;
}

/**
 * PATCH /api/admin/accounts/:id { action, reason? }
 *   suspend | unsuspend — any admin (not yourself, not a superadmin)
 *   make_admin | remove_admin — superadmins only
 */
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const ctx = await adminContext();
  if (ctx.response) return ctx.response;
  const { admin } = ctx;
  const { userId } = await params;

  const target = await loadTarget(userId);
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (target.id === admin.id) return NextResponse.json({ error: "You can't change your own account here" }, { status: 400 });
  if (isSuperAdmin(target.email)) return NextResponse.json({ error: 'The owner account cannot be changed' }, { status: 403 });

  const { action, reason } = await request.json().catch(() => ({}));

  // Admins can't act against each other; only the owner manages admins.
  if (!admin.isSuperAdmin && (await isAdminUserId(target.id))) {
    return NextResponse.json({ error: 'Only the owner can change another admin' }, { status: 403 });
  }

  switch (action) {
    case 'suspend': {
      const why = typeof reason === 'string' ? reason.trim().slice(0, 300) || null : null;
      await db.update(users).set({ suspendedAt: new Date(), suspendedReason: why }).where(eq(users.id, target.id));
      // A suspended admin loses admin access too.
      await db.delete(adminUsers).where(eq(adminUsers.userId, target.id));
      forgetAccountStatus(target.id);
      await admin.audit('suspended_user', target.id, { email: target.email, reason: why });
      return NextResponse.json({ success: true });
    }
    case 'unsuspend': {
      await db.update(users).set({ suspendedAt: null, suspendedReason: null }).where(eq(users.id, target.id));
      forgetAccountStatus(target.id);
      await admin.audit('unsuspended_user', target.id, { email: target.email });
      return NextResponse.json({ success: true });
    }
    case 'make_admin':
    case 'remove_admin': {
      if (!admin.isSuperAdmin) {
        return NextResponse.json({ error: 'Only the owner can change admin roles' }, { status: 403 });
      }
      if (action === 'make_admin') {
        await db
          .insert(adminUsers)
          .values({ userId: target.id, email: target.email.toLowerCase(), role: 'admin' })
          .onConflictDoNothing();
      } else {
        await db.delete(adminUsers).where(eq(adminUsers.userId, target.id));
      }
      await admin.audit(action === 'make_admin' ? 'granted_admin' : 'revoked_admin', target.id, { email: target.email });
      return NextResponse.json({ success: true });
    }
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }
}

/**
 * DELETE /api/admin/accounts/:id { confirmEmail } — permanently delete an
 * account and everything it owns. Superadmins only; the email must be typed
 * back to confirm.
 */
export async function DELETE(request: NextRequest, { params }: Ctx) {
  const ctx = await adminContext();
  if (ctx.response) return ctx.response;
  const { admin } = ctx;
  if (!admin.isSuperAdmin) {
    return NextResponse.json({ error: 'Only the owner can delete accounts' }, { status: 403 });
  }
  const { userId } = await params;
  const target = await loadTarget(userId);
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (target.id === admin.id || isSuperAdmin(target.email)) {
    return NextResponse.json({ error: 'This account cannot be deleted' }, { status: 403 });
  }

  const { confirmEmail } = await request.json().catch(() => ({}));
  if (typeof confirmEmail !== 'string' || confirmEmail.trim().toLowerCase() !== target.email.toLowerCase()) {
    return NextResponse.json({ error: "Type the user's email exactly to confirm" }, { status: 400 });
  }

  // Groups and servers they created would cascade-delete with them, taking
  // everyone else's messages along. Hand them to another member first
  // (existing admins first, then the longest-standing member). Order matters,
  // so these run one after another.
  for (const statement of [
    sql`
      UPDATE group_chats g SET created_by = (
        SELECT m.user_id FROM group_chat_members m
        WHERE m.group_chat_id = g.id AND m.user_id <> ${target.id}
        ORDER BY (m.role = 'admin') DESC, m.joined_at ASC LIMIT 1)
      WHERE g.created_by = ${target.id}
        AND EXISTS (SELECT 1 FROM group_chat_members m WHERE m.group_chat_id = g.id AND m.user_id <> ${target.id})`,
    sql`
      UPDATE group_chat_members gm SET role = 'admin'
      FROM group_chats g
      WHERE gm.group_chat_id = g.id AND gm.user_id = g.created_by AND gm.user_id <> ${target.id}
        AND g.id IN (SELECT group_chat_id FROM group_chat_members WHERE user_id = ${target.id})`,
    sql`
      UPDATE servers s SET owner_id = (
        SELECT sm.user_id FROM server_members sm
        WHERE sm.server_id = s.id AND sm.user_id <> ${target.id}
        ORDER BY (sm.role IN ('owner', 'admin')) DESC, sm.joined_at ASC LIMIT 1)
      WHERE s.owner_id = ${target.id}
        AND EXISTS (SELECT 1 FROM server_members sm WHERE sm.server_id = s.id AND sm.user_id <> ${target.id})`,
  ]) {
    await db.execute(statement);
  }

  // Audit first: the log row references the admin, not the deleted user.
  await admin.audit('deleted_user', target.id, { email: target.email });
  await db.delete(users).where(eq(users.id, target.id)); // their own messages, friendships, keys… go with them
  forgetAccountStatus(target.id);
  return NextResponse.json({ success: true });
}
