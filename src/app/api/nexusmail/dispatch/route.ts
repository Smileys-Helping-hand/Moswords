import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { registeredApps, emailLogs } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { sendEmail } from '@/lib/email';
import { isEmail } from '@/lib/validate';
import { rateLimit, tooManyRequests } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/nexusmail/dispatch
 * 
 * Validates the app via secretKey, sends email via AWS SES,
 * logs the email, and increments the app's email counter.
 * 
 * Request Body:
 * {
 *   "secretKey": "app-api-key",
 *   "recipient": "user@example.com",
 *   "templateId": "welcome-email",
 *   "subject": "Welcome to our service",
 *   "body": "Email content here"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { secretKey, recipient, templateId, subject, body } = await request.json();

    // Validate request
    if (!secretKey || !recipient || !templateId || !subject || !body) {
      return NextResponse.json(
        { error: 'Missing required fields: secretKey, recipient, templateId, subject, body' },
        { status: 400 }
      );
    }

    // Validate API key and get app
    const [app] = await db
      .select()
      .from(registeredApps)
      .where(eq(registeredApps.apiKey, secretKey))
      .limit(1);

    if (!app) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid API key' },
        { status: 401 }
      );
    }

    // Check if app is active
    if (app.status !== 'active') {
      return NextResponse.json(
        { error: `App is ${app.status}. Contact support to reactivate.` },
        { status: 403 }
      );
    }

    if (!isEmail(recipient) || String(subject).length > 300) {
      return NextResponse.json({ error: 'Invalid recipient or subject' }, { status: 400 });
    }

    // A leaked app key must not become an unlimited spam relay.
    const [hourly, daily] = await Promise.all([
      rateLimit(`nexusmail:${app.id}`, 60, 60 * 60),
      rateLimit(`nexusmail:day:${app.id}`, 200, 24 * 60 * 60),
    ]);
    if (!hourly.allowed) return tooManyRequests(3600);
    if (!daily.allowed) return tooManyRequests(24 * 3600);

    // Send email via AWS SES
    let emailStatus = 'sent';
    let errorMessage: string | undefined;

    try {
      await sendEmail({
        to: recipient,
        subject,
        htmlBody: body,
      });
    } catch (error: any) {
      console.error('Email send error:', error);
      emailStatus = 'failed';
      errorMessage = error.message || 'Unknown error';
    }

    // Log the email
    await db.insert(emailLogs).values({
      appSource: app.name,
      recipient,
      templateId,
      status: emailStatus,
      errorMessage,
    });

    // Increment emails_sent counter
    await db
      .update(registeredApps)
      .set({
        emailsSent: app.emailsSent + 1,
      })
      .where(eq(registeredApps.id, app.id));

    if (emailStatus === 'failed') {
      return NextResponse.json(
        { 
          error: 'Email delivery failed',
          details: errorMessage,
          logged: true,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Email sent successfully',
        appName: app.name,
        emailsSent: app.emailsSent + 1,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Dispatch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
