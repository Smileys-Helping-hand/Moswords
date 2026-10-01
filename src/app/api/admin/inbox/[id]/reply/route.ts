import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { inboundEmails } from '@/lib/schema';
import { adminContext } from '@/lib/admin-context';
import { sendEmail, textToHtml } from '@/lib/email';
import { bareAddress, replyFromAddress } from '@/lib/inbound-mail';
import { isEmail, isUuid } from '@/lib/validate';
import { rateLimit, tooManyRequests } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/inbox/:id/reply { text } — answer the sender from the address
 * they wrote to (support@, hello@ …), threaded with In-Reply-To.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await adminContext();
  if (ctx.response) return ctx.response;
  const { admin } = ctx;
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const limit = await rateLimit(`admin-mail:${admin.id}`, 100, 24 * 60 * 60);
  if (!limit.allowed) return tooManyRequests(3600);

  const body = await request.json().catch(() => ({}));
  const text = typeof body.text === 'string' ? body.text.slice(0, 50_000) : '';
  if (!text.trim()) return NextResponse.json({ error: 'Write a reply first' }, { status: 400 });

  const [email] = await db.select().from(inboundEmails).where(eq(inboundEmails.id, id)).limit(1);
  if (!email) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const to = bareAddress(email.fromAddress);
  if (!isEmail(to)) return NextResponse.json({ error: "The sender's address can't be replied to" }, { status: 400 });

  const subject = email.subject ? (/^re:/i.test(email.subject) ? email.subject : `Re: ${email.subject}`) : 'Re: your message';
  const quoted = (email.textBody || '').split('\n').slice(0, 200).map((l) => `> ${l}`).join('\n');
  const fullText = `${text}\n\nOn ${email.receivedAt.toUTCString()}, ${email.fromAddress} wrote:\n${quoted}`;

  try {
    const sent = await sendEmail({
      to,
      subject: subject.slice(0, 300),
      textBody: fullText,
      htmlBody: textToHtml(fullText),
      from: replyFromAddress(email.toAddresses),
      headers: email.messageId ? { 'In-Reply-To': email.messageId, References: email.messageId } : undefined,
    });
    await db.update(inboundEmails).set({ repliedAt: new Date(), readAt: email.readAt ?? new Date() }).where(eq(inboundEmails.id, id));
    await admin.audit('replied_email', id, { to, subject }, 'email');
    return NextResponse.json({ success: true, id: sent.id });
  } catch {
    return NextResponse.json({ error: 'The reply could not be sent. Check the mail settings.' }, { status: 502 });
  }
}
