import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { registeredApps, emailLogs } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Initialize AWS SES client
const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'af-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

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

    // Send email via AWS SES
    let emailStatus = 'sent';
    let errorMessage: string | undefined;

    try {
      const sendEmailCommand = new SendEmailCommand({
        Source: process.env.AWS_SES_FROM_EMAIL || 'noreply@yourdomain.com',
        Destination: {
          ToAddresses: [recipient],
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: body,
              Charset: 'UTF-8',
            },
          },
        },
      });

      await sesClient.send(sendEmailCommand);
    } catch (sesError: any) {
      console.error('AWS SES Error:', sesError);
      emailStatus = 'failed';
      errorMessage = sesError.message || 'Unknown SES error';
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
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
