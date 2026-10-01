import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

// On Amplify, credentials come from the app's IAM compute role via the default
// provider chain (Amplify forbids AWS_* env vars). Static keys are only used
// when explicitly provided, e.g. for local development.
const staticKeyId = process.env.SES_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
const staticSecret = process.env.SES_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;

const sesClient = new SESClient({
  region: process.env.SES_REGION || process.env.AWS_REGION || 'eu-west-2',
  ...(staticKeyId && staticSecret
    ? { credentials: { accessKeyId: staticKeyId, secretAccessKey: staticSecret } }
    : {}),
});

export interface EmailOptions {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  /** Overrides the default sender, e.g. "Moswords Support <support@awehchat.co.za>". Resend only. */
  from?: string;
  replyTo?: string;
  /** Extra headers such as In-Reply-To / References for threading. Resend only. */
  headers?: Record<string, string>;
}

/** Escape text for HTML email bodies (names, subjects and messages come from users). */
export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** Plain text typed by an admin → simple HTML email body. */
export function textToHtml(text: string): string {
  return `<div style="font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.55;white-space:pre-wrap">${escapeHtml(text)}</div>`;
}

/** Default sender for app mail. */
export function defaultFromAddress(): string {
  return (
    process.env.RESEND_FROM_EMAIL ||
    process.env.SES_FROM_EMAIL ||
    process.env.AWS_SES_FROM_EMAIL ||
    'Moswords <noreply@awehchat.co.za>'
  );
}

/**
 * Send a transactional email.
 *
 * Resend when RESEND_API_KEY is set (no manual sending review), otherwise AWS
 * SES. SES only delivers to verified addresses until AWS grants production
 * access, so Resend is the way to get password resets working immediately.
 */
export async function sendEmail({ to, subject, htmlBody, textBody, from, replyTo, headers }: EmailOptions): Promise<{ id?: string }> {
  const fromEmail = defaultFromAddress();

  if (process.env.RESEND_API_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: from || fromEmail,
        to: [to],
        subject,
        html: htmlBody,
        text: textBody,
        ...(replyTo ? { reply_to: replyTo } : {}),
        ...(headers ? { headers } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error('Resend rejected email:', res.status, (await res.text()).slice(0, 300));
      throw new Error('Failed to send email');
    }
    const sent = (await res.json().catch(() => ({}))) as { id?: string };
    return { id: sent.id };
  }

  try {
    const command = new SendEmailCommand({
      Source: fromEmail,
      Destination: {
        ToAddresses: [to],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: htmlBody,
            Charset: 'UTF-8',
          },
          ...(textBody && {
            Text: {
              Data: textBody,
              Charset: 'UTF-8',
            },
          }),
        },
      },
    });

    const out = await sesClient.send(command);
    return { id: out.MessageId };
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send email');
  }
}

/**
 * Generate HTML email for MFA code
 */
export function generateMfaEmailHtml(code: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: white; border-radius: 8px; }
        .header { text-align: center; color: #333; }
        .code-box {
          background-color: #f0f0f0;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
          margin: 20px 0;
          font-family: monospace;
        }
        .code { font-size: 32px; letter-spacing: 4px; color: #007bff; font-weight: bold; }
        .expiry { color: #666; font-size: 14px; margin-top: 10px; }
        .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Moswords Verification Code</h1>
        </div>
        <p>Your 6-digit verification code for Moswords is:</p>
        <div class="code-box">
          <div class="code">${code}</div>
          <div class="expiry">This code expires in 10 minutes</div>
        </div>
        <p>If you didn't request this code, please ignore this email and contact support if you have concerns.</p>
        <div class="footer">
          <p>&copy; 2026 Moswords. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate plain text email for MFA code
 */
export function generateMfaEmailText(code: string): string {
  return `
Your Moswords verification code is: ${code}

This code expires in 10 minutes.

If you didn't request this code, please ignore this email and contact support if you have concerns.

© 2026 Moswords. All rights reserved.
  `.trim();
}

/**
 * Generate HTML email for friend request
 */
export interface FriendRequestEmailParams {
  senderName: string;
  senderEmail: string;
  appName: string;
  friendshipId: string;
  acceptLink: string;
  declineLink: string;
}

export function generateFriendRequestEmailHtml(raw: FriendRequestEmailParams): string {
  const params = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, escapeHtml(v)]),
  ) as unknown as FriendRequestEmailParams;
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: white; border-radius: 8px; }
        .header { text-align: center; color: #333; margin-bottom: 20px; }
        .message { color: #555; font-size: 16px; margin: 20px 0; line-height: 1.6; }
        .button-group { text-align: center; margin: 30px 0; }
        .button {
          display: inline-block;
          padding: 12px 30px;
          margin: 0 10px;
          border-radius: 6px;
          text-decoration: none;
          font-weight: bold;
          cursor: pointer;
        }
        .accept-btn {
          background-color: #10b981;
          color: white;
        }
        .accept-btn:hover {
          background-color: #059669;
        }
        .decline-btn {
          background-color: #ef4444;
          color: white;
        }
        .decline-btn:hover {
          background-color: #dc2626;
        }
        .app-badge { background-color: #f3f4f6; padding: 4px 12px; border-radius: 20px; display: inline-block; color: #666; }
        .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Friend Request from <span class="app-badge">${params.appName}</span></h1>
        </div>

        <div class="message">
          <p><strong>${params.senderName}</strong> (${params.senderEmail}) sent you a friend request!</p>
          <p>Click below to accept or decline the request.</p>
        </div>

        <div class="button-group">
          <a href="${params.acceptLink}" class="button accept-btn">✓ Accept</a>
          <a href="${params.declineLink}" class="button decline-btn">✗ Decline</a>
        </div>

        <p style="color: #999; font-size: 14px; text-align: center;">
          Or copy this link to accept: <br/>
          <code style="background: #f5f5f5; padding: 4px 8px; border-radius: 4px;">${params.acceptLink}</code>
        </p>

        <div class="footer">
          <p>This is an automated message from Moswords. If you didn't expect this request, you can safely ignore it.</p>
          <p>&copy; 2026 Moswords. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate plain text email for friend request
 */
export interface FriendRequestEmailTextParams {
  senderName: string;
  appName: string;
}

export function generateFriendRequestEmailText(params: FriendRequestEmailTextParams): string {
  return `
Friend Request from ${params.appName}

${params.senderName} sent you a friend request!

Check the HTML version of this email to accept or decline the request, or visit your Moswords app to respond.

© 2026 Moswords. All rights reserved.
  `.trim();
}

/** Password reset email. `link` contains the one-time token. */
export function generatePasswordResetEmail(name: string, link: string): { html: string; text: string } {
  const safeName = name.replace(/[<>&"]/g, '');
  return {
    html: `<!doctype html><html><body style="margin:0;background:#0B0F19;font-family:system-ui,-apple-system,sans-serif;color:#e9edf2">
  <div style="max-width:480px;margin:0 auto;padding:32px 24px">
    <h1 style="font-size:20px;margin:0 0 16px">Reset your Moswords password</h1>
    <p style="line-height:1.5;opacity:.85">Hi ${safeName}, someone (hopefully you) asked to reset the password for this account.</p>
    <p style="margin:28px 0"><a href="${link}" style="background:#00F0FF;color:#0B0F19;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600">Choose a new password</a></p>
    <p style="line-height:1.5;opacity:.7;font-size:13px">The link works once and expires in 1 hour. If you didn't ask for this, you can ignore this email — your password stays the same.</p>
  </div></body></html>`,
    text: `Hi ${safeName},\n\nReset your Moswords password here (works once, expires in 1 hour):\n${link}\n\nIf you didn't ask for this, ignore this email — your password stays the same.\n`,
  };
}
