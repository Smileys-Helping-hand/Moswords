import { NextRequest, NextResponse } from 'next/server';
import { and, desc, isNotNull, isNull, sql } from 'drizzle-orm';
import { db, runBatch } from '@/lib/db';
import { inboundEmails } from '@/lib/schema';
import { adminContext } from '@/lib/admin-context';
import { sendEmail, textToHtml } from '@/lib/email';
import { replyFromAddress } from '@/lib/inbound-mail';
import { isEmail } from '@/lib/validate';
import { rateLimit, tooManyRequests } from '@/lib/rate-limit';
import { SITE_DOMAIN } from '@/lib/site';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PAGE = 50;

// Domain status from Resend, cached per instance for 5 minutes.
let domainCache: { at: number; value: { sending: string; receiving: string; status: string } | null } | null = null;
async function domainStatus() {
  if (domainCache && Date.now() - domainCache.at < 5 * 60_000) return domainCache.value;
  let value = null;
  try {
    const res = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      signal: AbortSignal.timeout(5_000),
    });
    const list = (await res.json()) as { data?: { name: string; status: string; capabilities?: { sending: string; receiving: string } }[] };
    const d = list.data?.find((x) => x.name === SITE_DOMAIN);
    if (d) value = { status: d.status, sending: d.capabilities?.sending ?? 'unknown', receiving: d.capabilities?.receiving ?? 'unknown' };
  } catch {
    /* shown as unknown */
  }
  domainCache = { at: Date.now(), value };
  return value;
}

/** GET /api/admin/inbox?view=inbox|archived&page=0 — mail received at @awehchat.co.za. */
export async function GET(request: NextRequest) {
  const ctx = await adminContext();
  if (ctx.response) return ctx.response;

  const params = request.nextUrl.searchParams;
  const archived = params.get('view') === 'archived';
  const page = Math.max(0, Math.min(1000, parseInt(params.get('page') || '0', 10) || 0));

  const [rows, counts] = await runBatch([
    db
      .select({
        id: inboundEmails.id,
        from: inboundEmails.fromAddress,
        to: inboundEmails.toAddresses,
        subject: inboundEmails.subject,
        snippet: sql<string>`left(regexp_replace(coalesce(${inboundEmails.textBody}, ''), '\\s+', ' ', 'g'), 160)`,
        attachments: sql<number>`coalesce(jsonb_array_length(${inboundEmails.attachments}), 0)`,
        receivedAt: inboundEmails.receivedAt,
        readAt: inboundEmails.readAt,
        repliedAt: inboundEmails.repliedAt,
      })
      .from(inboundEmails)
      .where(archived ? isNotNull(inboundEmails.archivedAt) : isNull(inboundEmails.archivedAt))
      .orderBy(desc(inboundEmails.receivedAt))
      .limit(PAGE)
      .offset(page * PAGE),
    db
      .select({
        unread: sql<number>`count(*) filter (where ${inboundEmails.readAt} is null)::int`,
        total: sql<number>`count(*)::int`,
      })
      .from(inboundEmails)
      .where(and(isNull(inboundEmails.archivedAt))),
  ]);

  return NextResponse.json(
    {
      emails: rows,
      unread: counts[0]?.unread ?? 0,
      total: counts[0]?.total ?? 0,
      page,
      pageSize: PAGE,
      mail: {
        sendingConfigured: !!process.env.RESEND_API_KEY,
        receivingConfigured: !!process.env.RESEND_WEBHOOK_SECRET,
        domain: process.env.RESEND_API_KEY ? await domainStatus() : null,
        addresses: [`support@${SITE_DOMAIN}`, `hello@${SITE_DOMAIN}`, `anything@${SITE_DOMAIN}`],
      },
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

/** POST /api/admin/inbox { to, subject, text, from? } — send a new email from @awehchat.co.za. */
export async function POST(request: NextRequest) {
  const ctx = await adminContext();
  if (ctx.response) return ctx.response;
  const { admin } = ctx;

  const limit = await rateLimit(`admin-mail:${admin.id}`, 100, 24 * 60 * 60);
  if (!limit.allowed) return tooManyRequests(3600);

  const body = await request.json().catch(() => ({}));
  const to = typeof body.to === 'string' ? body.to.trim().toLowerCase() : '';
  const subject = typeof body.subject === 'string' ? body.subject.trim().slice(0, 300) : '';
  const text = typeof body.text === 'string' ? body.text.slice(0, 50_000) : '';
  const fromLocal = typeof body.fromLocal === 'string' ? body.fromLocal.trim().toLowerCase() : 'support';
  if (!isEmail(to)) return NextResponse.json({ error: 'Enter a valid recipient email' }, { status: 400 });
  if (!subject || !text.trim()) return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 });
  if (!/^[a-z0-9][a-z0-9._-]{0,40}$/.test(fromLocal) || fromLocal === 'noreply') {
    return NextResponse.json({ error: 'Invalid sender name' }, { status: 400 });
  }

  try {
    const sent = await sendEmail({
      to,
      subject,
      textBody: text,
      htmlBody: textToHtml(text),
      from: replyFromAddress([`${fromLocal}@${SITE_DOMAIN}`]),
    });
    await admin.audit('sent_email', sent.id ?? to, { to, subject, from: `${fromLocal}@${SITE_DOMAIN}` }, 'email');
    return NextResponse.json({ success: true, id: sent.id });
  } catch {
    return NextResponse.json({ error: 'The email could not be sent. Check the mail settings.' }, { status: 502 });
  }
}

