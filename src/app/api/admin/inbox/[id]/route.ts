import { NextRequest, NextResponse } from 'next/server';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { inboundEmails } from '@/lib/schema';
import { adminContext } from '@/lib/admin-context';
import { isUuid } from '@/lib/validate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/admin/inbox/:id — the full message; marks it read. */
export async function GET(_request: NextRequest, { params }: Ctx) {
  const ctx = await adminContext();
  if (ctx.response) return ctx.response;
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const [email] = await db.select().from(inboundEmails).where(eq(inboundEmails.id, id)).limit(1);
  if (!email) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  // Only the request that flips it to read reports wasUnread (keeps the badge count honest).
  const flipped = email.readAt
    ? []
    : await db
        .update(inboundEmails)
        .set({ readAt: new Date() })
        .where(and(eq(inboundEmails.id, id), isNull(inboundEmails.readAt)))
        .returning({ id: inboundEmails.id });

  return NextResponse.json(
    {
      wasUnread: flipped.length > 0,
      email: {
        id: email.id,
        from: email.fromAddress,
        to: email.toAddresses,
        cc: email.cc ?? [],
        subject: email.subject,
        text: email.textBody,
        html: email.htmlBody,
        attachments: email.attachments ?? [],
        authentication: email.authentication ?? {},
        receivedAt: email.receivedAt,
        repliedAt: email.repliedAt,
        archivedAt: email.archivedAt,
      },
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

/** PATCH /api/admin/inbox/:id { action: archive | unarchive | unread } */
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const ctx = await adminContext();
  if (ctx.response) return ctx.response;
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { action } = await request.json().catch(() => ({}));
  const changes =
    action === 'archive' ? { archivedAt: new Date() }
    : action === 'unarchive' ? { archivedAt: null }
    : action === 'unread' ? { readAt: null }
    : null;
  if (!changes) return NextResponse.json({ error: 'Unknown action' }, { status: 400 });

  const updated = await db.update(inboundEmails).set(changes).where(eq(inboundEmails.id, id)).returning({ id: inboundEmails.id });
  if (updated.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
