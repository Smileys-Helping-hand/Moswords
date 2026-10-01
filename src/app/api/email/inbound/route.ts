import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { inboundEmails } from '@/lib/schema';
import { escapeHtml, sendEmail } from '@/lib/email';
import { bareAddress, fetchReceivedEmail, verifyResendWebhook } from '@/lib/inbound-mail';
import { SITE_DOMAIN, SITE_URL } from '@/lib/site';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_HTML = 500_000;
const MAX_TEXT = 200_000;

/**
 * POST /api/email/inbound — Resend "email.received" webhook.
 * Signed with RESEND_WEBHOOK_SECRET; stores the message for the admin inbox
 * and, when INBOUND_FORWARD_TO is set, forwards a copy there.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret || !process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Inbound mail is not configured' }, { status: 503 });
  }

  const body = await request.text();
  if (body.length > 1_000_000 || !verifyResendWebhook(secret, request.headers, body)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: { type?: string; data?: { email_id?: string } };
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'Bad payload' }, { status: 400 });
  }
  if (event.type !== 'email.received' || !event.data?.email_id) {
    return NextResponse.json({ ignored: true });
  }

  // A failure here returns 500 so Resend retries the delivery.
  const email = await fetchReceivedEmail(event.data.email_id);
  const [stored] = await db
    .insert(inboundEmails)
    .values({
      resendId: email.id,
      fromAddress: email.from.slice(0, 500),
      toAddresses: (email.to ?? []).slice(0, 50),
      cc: (email.cc ?? []).slice(0, 50),
      subject: email.subject?.slice(0, 1000) ?? null,
      textBody: email.text?.slice(0, MAX_TEXT) ?? null,
      htmlBody: email.html?.slice(0, MAX_HTML) ?? null,
      messageId: email.message_id ?? null,
      attachments: (email.attachments ?? []).map((a) => ({
        id: a.id,
        filename: a.filename,
        contentType: a.content_type,
        size: a.size,
      })),
      authentication: email.authentication ?? null,
    })
    .onConflictDoNothing({ target: inboundEmails.resendId }) // retried deliveries
    .returning({ id: inboundEmails.id });

  if (stored) await forward(email, stored.id).catch((e) => console.error('inbound forward failed:', (e as Error).message));
  return NextResponse.json({ ok: true });
}

/** Copy to the owner's normal mailbox. Skipped for our own domain (no loops) and failed-auth spam. */
async function forward(email: Awaited<ReturnType<typeof fetchReceivedEmail>>, storedId: string) {
  const target = process.env.INBOUND_FORWARD_TO;
  if (!target) return;
  const from = bareAddress(email.from);
  if (from.endsWith(`@${SITE_DOMAIN}`) || from === target.toLowerCase()) return;
  const auth = email.authentication ?? {};
  if (auth.spf === 'fail' && auth.dkim === 'fail') return;

  const subject = email.subject || '(no subject)';
  const header = `<div style="font-family:system-ui,sans-serif;font-size:13px;color:#555;border-bottom:1px solid #ddd;padding:0 0 10px;margin:0 0 14px">
    <b>From:</b> ${escapeHtml(email.from)}<br><b>To:</b> ${escapeHtml((email.to ?? []).join(', '))}<br>
    <a href="${SITE_URL}/admin?tab=inbox&amp;mail=${storedId}">Open in the Moswords inbox</a> · reply here to answer the sender directly
  </div>`;
  await sendEmail({
    to: target,
    subject: `[${SITE_DOMAIN}] ${subject}`.slice(0, 300),
    htmlBody: header + (email.html || `<pre style="white-space:pre-wrap">${escapeHtml(email.text || '')}</pre>`),
    textBody: `From: ${email.from}\nTo: ${(email.to ?? []).join(', ')}\n\n${email.text || ''}`,
    replyTo: email.from,
  });
}
