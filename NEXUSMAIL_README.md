# 📧 NexusMail - Email Service Backend

## Overview

NexusMail is a serverless email dispatch service built on Vercel + Neon (PostgreSQL) stack, replacing Firebase backend. It provides a secure API for sending emails via AWS SES with comprehensive logging and monitoring.

---

## 🏗️ Architecture

### Tech Stack
- **Database**: Neon PostgreSQL (Serverless)
- **ORM**: Drizzle ORM (Type-safe SQL queries)
- **Deployment**: Vercel (Next.js API Routes)
- **Email Engine**: AWS SES (Simple Email Service)

### Database Schema

#### Table: `registered_apps`
Stores registered applications that can use the email service.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Application name |
| api_key | text | Unique API key (format: `nxm_...`) |
| status | text | Status: `active`, `suspended`, or `inactive` |
| emails_sent | integer | Counter for emails sent |
| created_at | timestamp | Registration timestamp |

#### Table: `email_logs`
Audit log for all email dispatch attempts.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| app_source | text | Name of the app that sent the email |
| recipient | text | Email recipient |
| template_id | text | Template identifier |
| status | text | Status: `sent`, `failed`, or `pending` |
| timestamp | timestamp | When the email was dispatched |
| error_message | text | Error details (if failed) |

---

## 🚀 Setup Instructions

### 1. Environment Variables

Add to your `.env.local` file:

```env
# --- DATABASE (NEON) ---
DATABASE_URL="postgres://user:pass@ep-cool-glade.aws.neon.tech/neondb?sslmode=require"

# --- AWS SES ENGINE ---
AWS_REGION=af-south-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_SES_FROM_EMAIL=noreply@yourdomain.com

# --- NEXTAUTH (Required for Dashboard) ---
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret
```

### 2. Get Neon Database URL

1. Go to [Neon.tech](https://neon.tech) and create a free project
2. On the Dashboard, look for "Connection Details"
3. Copy the connection string (format: `postgres://user:pass@...`)

### 3. AWS SES Setup

1. Go to [AWS Console](https://console.aws.amazon.com/ses/)
2. Verify your sender email address
3. Create IAM credentials with SES permissions
4. Add credentials to `.env.local`

### 4. Run Database Migration

```bash
npm run db:push
```

This will create the `registered_apps` and `email_logs` tables in your Neon database.

---

## 📡 API Endpoints

### 1. Dispatch Email

**POST** `/api/nexusmail/dispatch`

Send an email via authenticated API key.

**Request Body:**
```json
{
  "secretKey": "nxm_your_api_key_here",
  "recipient": "user@example.com",
  "templateId": "welcome-email",
  "subject": "Welcome to Our Service",
  "body": "<h1>Welcome!</h1><p>Thanks for joining us.</p>"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Email sent successfully",
  "appName": "My App",
  "emailsSent": 42
}
```

**Response (Error - Invalid Key):**
```json
{
  "error": "Unauthorized: Invalid API key"
}
```

---

### 2. Register New App

**POST** `/api/nexusmail/apps`

Register a new application and generate an API key. Requires authentication.

**Request Body:**
```json
{
  "name": "My Awesome App"
}
```

**Response:**
```json
{
  "success": true,
  "app": {
    "id": "uuid",
    "name": "My Awesome App",
    "apiKey": "nxm_64_character_hex_key",
    "status": "active",
    "emailsSent": 0,
    "createdAt": "2026-02-05T12:00:00.000Z"
  },
  "message": "App registered successfully"
}
```

---

### 3. Get All Apps

**GET** `/api/nexusmail/apps`

Fetch all registered apps. Requires authentication.

**Response:**
```json
{
  "apps": [
    {
      "id": "uuid",
      "name": "My App",
      "apiKey": "nxm_...",
      "status": "active",
      "emailsSent": 150,
      "createdAt": "2026-02-05T12:00:00.000Z"
    }
  ]
}
```

---

### 4. Update App Status

**PATCH** `/api/nexusmail/apps`

Update an app's status. Requires authentication.

**Request Body:**
```json
{
  "appId": "uuid",
  "status": "suspended"
}
```

**Response:**
```json
{
  "success": true,
  "app": { /* updated app object */ },
  "message": "App status updated to suspended"
}
```

---

### 5. Get Email Logs

**GET** `/api/nexusmail/logs?limit=100`

Fetch audit logs. Requires authentication.

**Response:**
```json
{
  "logs": [
    {
      "id": "uuid",
      "appSource": "My App",
      "recipient": "user@example.com",
      "templateId": "welcome-email",
      "status": "sent",
      "timestamp": "2026-02-05T12:00:00.000Z",
      "errorMessage": null
    }
  ]
}
```

---

## 🎨 Dashboard

Access the dashboard at: `/nexusmail`

Features:
- ✅ View all registered apps
- ✅ Generate new API keys
- ✅ Monitor email delivery stats
- ✅ View audit logs (last 50 emails)
- ✅ Copy API keys to clipboard
- ✅ Real-time success rate calculation

**Requirements**: User must be authenticated (NextAuth session required)

---

## 🧪 Testing the API

### Example: Send Test Email (cURL)

```bash
curl -X POST http://localhost:3000/api/nexusmail/dispatch \
  -H "Content-Type: application/json" \
  -d '{
    "secretKey": "nxm_your_api_key_here",
    "recipient": "test@example.com",
    "templateId": "test-email",
    "subject": "Test Email",
    "body": "<h1>Hello!</h1><p>This is a test.</p>"
  }'
```

### Example: Register App (Node.js)

```javascript
const response = await fetch('http://localhost:3000/api/nexusmail/apps', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Cookie': 'next-auth.session-token=your_session_token'
  },
  body: JSON.stringify({ name: 'My New App' })
});

const data = await response.json();
console.log('API Key:', data.app.apiKey);
```

---

## 🔒 Security Features

1. **API Key Authentication**: 64-character hex keys with `nxm_` prefix
2. **Status Controls**: Apps can be suspended without deleting data
3. **Audit Logging**: Every email attempt is logged with timestamp
4. **NextAuth Protected**: Dashboard requires authentication
5. **Rate Limiting**: Consider adding middleware for production

---

## 🚀 Deployment to Vercel

### Step 1: Push to GitHub
```bash
git add .
git commit -m "feat: Add NexusMail backend"
git push
```

### Step 2: Deploy to Vercel
1. Go to [Vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Add environment variables:
   - `DATABASE_URL`
   - `AWS_REGION`
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_SES_FROM_EMAIL`
   - `NEXTAUTH_URL` (set to your Vercel domain)
   - `NEXTAUTH_SECRET`
4. Click **Deploy**

### Step 3: Run Migration
After first deploy, run:
```bash
npm run db:push
```

---

## 📊 Monitoring

### Success Rate Calculation
Dashboard automatically calculates success rate based on last 50 emails:
```
Success Rate = (Emails with status='sent' / Total Emails) × 100
```

### Email Counter
Each successful dispatch increments the `emails_sent` counter for the app.

---

## 🐛 Troubleshooting

### Issue: "Unauthorized: Invalid API key"
- Verify the API key is copied correctly
- Check if the app status is `active`
- Ensure the key exists in `registered_apps` table

### Issue: Email not sending
- Verify AWS credentials in `.env.local`
- Check AWS SES email verification status
- Review AWS SES sending limits (sandbox vs production)
- Check error logs in the dashboard

### Issue: Dashboard not loading
- Ensure you're signed in (NextAuth session required)
- Check DATABASE_URL is set correctly
- Verify migration was run: `npm run db:push`

---

## 🔄 Migration from Firebase

All Firebase code has been replaced with:
- ✅ PostgreSQL (Neon) instead of Firestore
- ✅ Drizzle ORM instead of Firebase Admin SDK
- ✅ NextAuth sessions instead of Firebase Auth tokens
- ✅ AWS SES instead of Firebase Cloud Functions

**Removed files** (optional cleanup):
- `src/lib/firebase.ts` (keep for backward compatibility or delete)
- `src/lib/firebase-error-handler.ts`
- `src/lib/errors.ts`

---

## 📝 Example Integration

### Python App
```python
import requests

API_KEY = "nxm_your_api_key_here"
API_URL = "https://yourdomain.vercel.app/api/nexusmail/dispatch"

def send_welcome_email(recipient):
    payload = {
        "secretKey": API_KEY,
        "recipient": recipient,
        "templateId": "welcome",
        "subject": "Welcome!",
        "body": "<h1>Hello from Python!</h1>"
    }
    
    response = requests.post(API_URL, json=payload)
    return response.json()

result = send_welcome_email("user@example.com")
print(result)
```

### Node.js App
```javascript
async function sendEmail(recipient) {
  const response = await fetch('https://yourdomain.vercel.app/api/nexusmail/dispatch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secretKey: 'nxm_your_api_key_here',
      recipient: recipient,
      templateId: 'notification',
      subject: 'You have a notification',
      body: '<p>Check your dashboard for updates.</p>'
    })
  });
  
  return await response.json();
}
```

---

## 📈 Next Steps

### Recommended Enhancements
1. **Rate Limiting**: Add middleware to prevent abuse
2. **Email Templates**: Store HTML templates in database
3. **Webhooks**: Add delivery status webhooks
4. **Analytics**: Track open rates, click rates
5. **Bulk Send**: Support sending to multiple recipients
6. **Scheduled Emails**: Queue emails for later delivery

---

## 📞 Support

For issues or questions:
1. Check the [Troubleshooting](#-troubleshooting) section
2. Review the [Neon Documentation](https://neon.tech/docs)
3. Review the [AWS SES Documentation](https://docs.aws.amazon.com/ses/)

---

## ✅ Checklist

- [x] Database schema created (`registered_apps`, `email_logs`)
- [x] Database connection configured (Neon PostgreSQL)
- [x] Dispatch API endpoint created
- [x] Apps management API endpoints created
- [x] Logs API endpoint created
- [x] Dashboard UI created
- [x] AWS SES integration added
- [x] Migration generated
- [x] Documentation written

**Status**: ✅ **READY FOR DEPLOYMENT**

---

## 🎉 You're Done!

Your NexusMail backend is now ready. To get started:

1. Run `npm run db:push` to apply migrations
2. Start the dev server: `npm run dev`
3. Visit `http://localhost:3000/nexusmail` to access the dashboard
4. Register your first app and get an API key
5. Start sending emails! 📧
