import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'af-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export interface EmailOptions {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
}

/**
 * Send email via AWS SES
 */
export async function sendEmail({ to, subject, htmlBody, textBody }: EmailOptions): Promise<void> {
  const fromEmail = process.env.AWS_SES_FROM_EMAIL || 'noreply@awechat.co.za';

  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error('AWS credentials not configured');
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

    await sesClient.send(command);
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
