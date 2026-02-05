/**
 * NexusMail Client Example
 * 
 * This file demonstrates how to integrate NexusMail into your application.
 */

// ========================
// TypeScript/JavaScript Client
// ========================

interface EmailPayload {
  secretKey: string;
  recipient: string;
  templateId: string;
  subject: string;
  body: string;
}

interface EmailResponse {
  success: boolean;
  message: string;
  appName?: string;
  emailsSent?: number;
  error?: string;
}

class NexusMailClient {
  private apiKey: string;
  private apiUrl: string;

  constructor(apiKey: string, apiUrl: string = 'http://localhost:3000') {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
  }

  async sendEmail(
    recipient: string,
    templateId: string,
    subject: string,
    body: string
  ): Promise<EmailResponse> {
    try {
      const response = await fetch(`${this.apiUrl}/api/nexusmail/dispatch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secretKey: this.apiKey,
          recipient,
          templateId,
          subject,
          body,
        }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('NexusMail Error:', error);
      throw error;
    }
  }

  // Helper method for sending welcome emails
  async sendWelcomeEmail(recipient: string, userName: string): Promise<EmailResponse> {
    const subject = 'Welcome to Our Platform!';
    const body = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome, ${userName}! 🎉</h1>
            </div>
            <div class="content">
              <p>Hi ${userName},</p>
              <p>Thank you for joining our platform! We're excited to have you on board.</p>
              <p>Get started by exploring all the features we have to offer.</p>
              <a href="https://yourapp.com/dashboard" class="button">Go to Dashboard</a>
              <p style="margin-top: 30px; color: #666; font-size: 12px;">
                If you have any questions, feel free to reply to this email.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail(recipient, 'welcome-email', subject, body);
  }

  // Helper method for sending notification emails
  async sendNotification(
    recipient: string,
    title: string,
    message: string
  ): Promise<EmailResponse> {
    const subject = title;
    const body = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto;">
            <h2 style="color: #667eea;">${title}</h2>
            <p>${message}</p>
            <hr style="border: 1px solid #eee; margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">
              This is an automated notification from your application.
            </p>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail(recipient, 'notification', subject, body);
  }
}

// ========================
// Usage Examples
// ========================

// Example 1: Basic usage
async function example1() {
  const client = new NexusMailClient('nxm_your_api_key_here');
  
  const result = await client.sendEmail(
    'user@example.com',
    'test-email',
    'Test Subject',
    '<h1>Hello World!</h1><p>This is a test email.</p>'
  );
  
  console.log(result);
}

// Example 2: Send welcome email
async function example2() {
  const client = new NexusMailClient('nxm_your_api_key_here');
  
  const result = await client.sendWelcomeEmail(
    'newuser@example.com',
    'John Doe'
  );
  
  if (result.success) {
    console.log('Welcome email sent!');
  } else {
    console.error('Failed to send:', result.error);
  }
}

// Example 3: Send notification
async function example3() {
  const client = new NexusMailClient('nxm_your_api_key_here');
  
  const result = await client.sendNotification(
    'user@example.com',
    'New Message',
    'You have received a new message from Sarah.'
  );
  
  console.log(result);
}

// Example 4: Bulk send (with error handling)
async function example4() {
  const client = new NexusMailClient('nxm_your_api_key_here');
  
  const recipients = [
    'user1@example.com',
    'user2@example.com',
    'user3@example.com',
  ];
  
  const results = await Promise.allSettled(
    recipients.map(email => 
      client.sendNotification(email, 'Update', 'New features available!')
    )
  );
  
  const successful = results.filter(r => r.status === 'fulfilled').length;
  console.log(`Sent ${successful}/${recipients.length} emails successfully`);
}

// ========================
// Next.js Server-Side Usage
// ========================

// In your Next.js API route or Server Component:
/*
import { NexusMailClient } from '@/lib/nexusmail-client';

export async function POST(request: Request) {
  const { email, name } = await request.json();
  
  const client = new NexusMailClient(process.env.NEXUSMAIL_API_KEY!);
  
  try {
    await client.sendWelcomeEmail(email, name);
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
*/

// ========================
// Python Example
// ========================

/*
import requests

class NexusMailClient:
    def __init__(self, api_key, api_url="http://localhost:3000"):
        self.api_key = api_key
        self.api_url = api_url
    
    def send_email(self, recipient, template_id, subject, body):
        payload = {
            "secretKey": self.api_key,
            "recipient": recipient,
            "templateId": template_id,
            "subject": subject,
            "body": body
        }
        
        response = requests.post(
            f"{self.api_url}/api/nexusmail/dispatch",
            json=payload
        )
        
        return response.json()
    
    def send_welcome_email(self, recipient, user_name):
        subject = f"Welcome, {user_name}!"
        body = f"<h1>Welcome {user_name}!</h1><p>Thanks for joining us.</p>"
        
        return self.send_email(recipient, "welcome-email", subject, body)

# Usage
client = NexusMailClient("nxm_your_api_key_here")
result = client.send_welcome_email("user@example.com", "John Doe")
print(result)
*/

export { NexusMailClient };
export type { EmailPayload, EmailResponse };
