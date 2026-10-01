import crypto from 'crypto';
import { SITE_DOMAIN } from './site';

/**
 * Mail sent to any @awehchat.co.za address arrives at Resend (the domain's MX),
 * which calls /api/email/inbound. The webhook only carries metadata, so the
 * body is fetched from Resend's receiving API.
 */

const RESEND_API = 'https://api.resend.com';
const MAX_SKEW_SECONDS = 5 * 60;

/**
 * Verify a Resend (Svix) webhook signature: HMAC-SHA256 over
 * `${svix-id}.${svix-timestamp}.${body}` with the base64 part of the whsec_ secret.
 */
export function verifyResendWebhook(secret: string, headers: Headers, body: string): boolean {
  const id = headers.get('svix-id');
  const timestamp = headers.get('svix-timestamp');
  const signatures = headers.get('svix-signature');
  if (!secret || !id || !timestamp || !signatures) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > MAX_SKEW_SECONDS) return false;

  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const expected = crypto.createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest();

  return signatures.split(' ').some((part) => {
    const [version, value] = part.split(',');
    if (version !== 'v1' || !value) return false;
    const given = Buffer.from(value, 'base64');
    return given.length === expected.length && crypto.timingSafeEqual(given, expected);
  });
}

async function resendGet<T>(path: string): Promise<T> {
  const res = await fetch(`${RESEND_API}${path}`, {
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Resend ${path} → ${res.status}`);
  return (await res.json()) as T;
}

export interface ReceivedEmail {
  id: string;
  from: string;
  to: string[];
  cc?: string[];
  subject?: string | null;
  html?: string | null;
  html_format?: string;
  text?: string | null;
  message_id?: string | null;
  authentication?: Record<string, string>;
  attachments?: { id: string; filename: string; content_type: string; size?: number }[];
}

export async function fetchReceivedEmail(emailId: string): Promise<ReceivedEmail> {
  const email = await resendGet<ReceivedEmail>(`/emails/receiving/${encodeURIComponent(emailId)}`);
  // HTML may come back as a data: URI; store plain markup either way.
  if (email.html && email.html.startsWith('data:')) {
    const comma = email.html.indexOf(',');
    const meta = email.html.slice(0, comma);
    const payload = email.html.slice(comma + 1);
    email.html = meta.includes(';base64')
      ? Buffer.from(payload, 'base64').toString('utf8')
      : decodeURIComponent(payload);
  }
  return email;
}

/** Short-lived download URL for one attachment of a received email. */
export async function attachmentDownloadUrl(emailId: string, attachmentId: string): Promise<string | null> {
  const list = await resendGet<{ data: { id: string; download_url: string }[] }>(
    `/emails/receiving/${encodeURIComponent(emailId)}/attachments`,
  );
  return list.data.find((a) => a.id === attachmentId)?.download_url ?? null;
}

/** "Name <addr@x>" → "addr@x" (lower-cased). */
export function bareAddress(value: string): string {
  const match = /<([^>]+)>/.exec(value);
  return (match ? match[1] : value).trim().toLowerCase();
}

/** The @awehchat.co.za address a message was sent to, so replies come from the same one. */
export function ourAddress(to: string[]): string | null {
  for (const addr of to) {
    const bare = bareAddress(addr);
    if (bare.endsWith(`@${SITE_DOMAIN}`)) return bare;
  }
  return null;
}

/** Reply/compose sender: the original recipient address, else support@. Never noreply@. */
export function replyFromAddress(to: string[] = []): string {
  const ours = ourAddress(to);
  const address = ours && !ours.startsWith('noreply@') ? ours : `support@${SITE_DOMAIN}`;
  return `Moswords <${address}>`;
}
