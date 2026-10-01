import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { inboundEmails } from '@/lib/schema';
import { adminContext } from '@/lib/admin-context';
import { attachmentDownloadUrl } from '@/lib/inbound-mail';
import { isUuid } from '@/lib/validate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/admin/inbox/:id/attachments/:attachmentId — redirect to a short-lived Resend download URL. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> },
) {
  const ctx = await adminContext();
  if (ctx.response) return ctx.response;
  const { id, attachmentId } = await params;
  if (!isUuid(id) || !isUuid(attachmentId)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const [email] = await db
    .select({ resendId: inboundEmails.resendId, attachments: inboundEmails.attachments })
    .from(inboundEmails)
    .where(eq(inboundEmails.id, id))
    .limit(1);
  if (!email || !(email.attachments ?? []).some((a) => a.id === attachmentId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const url = await attachmentDownloadUrl(email.resendId, attachmentId);
    if (!url) return NextResponse.json({ error: 'Attachment no longer available' }, { status: 404 });
    return NextResponse.redirect(url, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Could not fetch the attachment' }, { status: 502 });
  }
}
