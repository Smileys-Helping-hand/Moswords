# 🔗 Nexus Integration Guide - Complete API Documentation

## Overview

Moswords now has **complete integration** with **Nexus Email** and **Nexus OS**, allowing seamless contact syncing, profile management, and cross-platform communication.

---

## 🎯 Features

### Nexus Email Integration
- ✅ Sync contacts to Nexus email system
- ✅ Batch contact operations (500ms window)
- ✅ Send emails via Nexus
- ✅ Retrieve contacts from Nexus
- ✅ Automatic contact sync history
- ✅ Organization-based contact grouping

### Nexus OS Integration
- ✅ Connect to Nexus OS platform
- ✅ Sync user profiles
- ✅ Manage user settings
- ✅ Track connected apps/integrations
- ✅ Activity logging and history
- ✅ User analytics and metrics

---

## 🚀 Quick Start

### 1. Get Your Nexus API Keys

**Nexus Email API Key:**
1. Visit: `https://api.nexusemail.com/dashboard`
2. Navigate to: Settings → API Keys
3. Create new key with name: "Moswords Integration"
4. Copy the key (format: `nexus_email_...`)

**Nexus OS API Key:**
1. Visit: `https://api.nexusos.com/settings`
2. Navigate to: Developer → API Keys
3. Create new key with name: "Moswords"
4. Copy the key (format: `nexus_os_...`)

### 2. Add API Keys to Moswords Dashboard

1. Navigate to: `/dashboard`
2. Go to: **API Keys** tab
3. Click: **+ New Key**
4. Enter name: "Nexus Email" or "Nexus OS"
5. Save and copy the generated key
6. Store securely (won't be shown again)

### 3. Test Connection

```bash
# Test Nexus Email
curl -X POST http://localhost:3000/api/nexus/sync \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION" \
  -d '{
    "contacts": [
      {
        "id": "contact-1",
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+1-555-0001"
      }
    ],
    "apiKey": "nexus_email_YOUR_KEY"
  }'

# Test Nexus OS
curl -X POST http://localhost:3000/api/nexus/os \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION" \
  -d '{
    "action": "getProfile",
    "apiKey": "nexus_os_YOUR_KEY"
  }'
```

---

## 📚 API Reference

### Nexus Email API Endpoints

#### POST /api/nexus/sync
**Sync contacts to Nexus Email**

```bash
curl -X POST http://localhost:3000/api/nexus/sync \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION" \
  -d '{
    "contacts": [
      {
        "id": "contact-123",
        "name": "Jane Smith",
        "email": "jane@company.com",
        "phone": "+1-555-0002",
        "avatar": "https://..."
      }
    ],
    "apiKey": "nexus_email_YOUR_KEY"
  }'
```

**Response:**
```json
{
  "success": true,
  "synced": 1,
  "failed": 0,
  "total": 1,
  "results": [
    {
      "contactId": "contact-123",
      "nexusId": "nx_456",
      "status": "synced",
      "lastSync": "2026-05-29T16:45:00Z",
      "error": null
    }
  ]
}
```

#### GET /api/nexus/sync
**Get sync history**

```bash
curl http://localhost:3000/api/nexus/sync \
  -H "Cookie: next-auth.session-token=YOUR_SESSION"
```

**Response:**
```json
{
  "syncHistory": [
    {
      "id": "sync-1",
      "timestamp": "2026-05-29T16:45:00Z",
      "contactsCount": 5,
      "successCount": 5,
      "failureCount": 0,
      "status": "completed"
    }
  ]
}
```

### Nexus OS API Endpoints

#### POST /api/nexus/os
**Interact with Nexus OS**

Available actions:

**Get User Profile**
```bash
curl -X POST http://localhost:3000/api/nexus/os \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION" \
  -d '{
    "action": "getProfile",
    "apiKey": "nexus_os_YOUR_KEY"
  }'
```

**Update User Profile**
```bash
curl -X POST http://localhost:3000/api/nexus/os \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION" \
  -d '{
    "action": "updateProfile",
    "apiKey": "nexus_os_YOUR_KEY",
    "profileData": {
      "displayName": "Jane Doe",
      "avatar": "https://...",
      "bio": "Software Engineer"
    }
  }'
```

**Get User Settings**
```bash
curl -X POST http://localhost:3000/api/nexus/os \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION" \
  -d '{
    "action": "getSettings",
    "apiKey": "nexus_os_YOUR_KEY"
  }'
```

**Update User Settings**
```bash
curl -X POST http://localhost:3000/api/nexus/os \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION" \
  -d '{
    "action": "updateSettings",
    "apiKey": "nexus_os_YOUR_KEY",
    "settings": {
      "notifications": true,
      "emailNotifications": false,
      "theme": "dark"
    }
  }'
```

**Get Connected Apps**
```bash
curl -X POST http://localhost:3000/api/nexus/os \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION" \
  -d '{
    "action": "getConnectedApps",
    "apiKey": "nexus_os_YOUR_KEY"
  }'
```

**Get Activity Logs**
```bash
curl -X POST http://localhost:3000/api/nexus/os \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION" \
  -d '{
    "action": "getActivity",
    "apiKey": "nexus_os_YOUR_KEY"
  }'
```

#### GET /api/nexus/os
**Get integration status**

```bash
curl http://localhost:3000/api/nexus/os \
  -H "Cookie: next-auth.session-token=YOUR_SESSION"
```

**Response:**
```json
{
  "isConnected": false,
  "connectedApps": [],
  "lastSync": null,
  "permissions": []
}
```

---

## 🔌 Client Library Usage

### Using NexusEmailClient

```typescript
import { createNexusEmailClient, NexusContact } from '@/lib/nexusClient';

// Create client
const nexusClient = createNexusEmailClient('nexus_email_YOUR_KEY');

// Sync single contact
const contact: NexusContact = {
  email: 'john@example.com',
  name: 'John Doe',
  phone: '+1-555-0001',
};

const result = await nexusClient.syncContact(contact);
console.log(result);
// {
//   contactId: "",
//   nexusId: "nx_123",
//   status: "synced",
//   lastSync: Date
// }

// Batch sync multiple contacts
const contacts: NexusContact[] = [
  { email: 'jane@example.com', name: 'Jane Smith' },
  { email: 'bob@example.com', name: 'Bob Johnson' },
];

const results = await nexusClient.batchSyncContacts(contacts);

// Get all contacts
const response = await nexusClient.getContacts(100, 0);

// Send email
const emailResponse = await nexusClient.sendEmail(
  'recipient@example.com',
  'Hello from Moswords',
  '<p>This is an email sent via Nexus</p>',
  ['cc@example.com'],
  ['bcc@example.com']
);

// Verify connection
const isConnected = await nexusClient.verifyConnection();
```

### Using NexusOSClient

```typescript
import { createNexusOSClient } from '@/lib/nexusClient';

// Create client
const nexusOSClient = createNexusOSClient('nexus_os_YOUR_KEY');

// Get user profile
const profile = await nexusOSClient.getUserProfile('user-123');

// Update profile
const updated = await nexusOSClient.updateUserProfile('user-123', {
  displayName: 'Jane Doe',
  avatar: 'https://...',
});

// Get settings
const settings = await nexusOSClient.getUserSettings('user-123');

// Update settings
const updatedSettings = await nexusOSClient.updateUserSettings('user-123', {
  notifications: true,
  theme: 'dark',
});

// Get connected apps
const apps = await nexusOSClient.getConnectedApps('user-123');

// Log event
const logResult = await nexusOSClient.logEvent('user-123', 'contact_synced', {
  contactCount: 5,
  system: 'nexus',
});

// Get activity logs
const logs = await nexusOSClient.getActivityLogs('user-123', 50);

// Verify connection
const isConnected = await nexusOSClient.verifyConnection();
```

---

## 🔐 Security & Best Practices

### API Key Management
- ✅ **Never commit API keys** to version control
- ✅ **Use environment variables** for sensitive keys
- ✅ **Rotate keys** every 90 days
- ✅ **Revoke keys** when no longer needed
- ✅ **Use minimal permissions** for each key

### Environment Variables
```bash
# .env.local
NEXUS_EMAIL_API_KEY=nexus_email_YOUR_KEY
NEXUS_EMAIL_API_URL=https://api.nexusemail.com
NEXUS_OS_API_KEY=nexus_os_YOUR_KEY
NEXUS_OS_API_URL=https://api.nexusos.com
```

### Error Handling

```typescript
try {
  const result = await nexusClient.syncContact(contact);
  
  if (result.status === 'synced') {
    console.log('Contact synced:', result.nexusId);
  } else if (result.status === 'failed') {
    console.error('Sync failed:', result.error);
    // Retry logic or user notification
  }
} catch (error) {
  console.error('Sync error:', error);
  // Handle network errors, timeouts, etc.
}
```

---

## 🧪 Testing Integration

### Unit Tests

```typescript
import { createNexusEmailClient } from '@/lib/nexusClient';

describe('NexusEmailClient', () => {
  it('should sync contact to Nexus', async () => {
    const client = createNexusEmailClient('test_key');
    const result = await client.syncContact({
      email: 'test@example.com',
      name: 'Test User',
    });
    
    expect(result.status).toBe('synced');
    expect(result.nexusId).toBeDefined();
  });

  it('should handle sync errors', async () => {
    const client = createNexusEmailClient('invalid_key');
    const result = await client.syncContact({
      email: 'test@example.com',
      name: 'Test User',
    });
    
    expect(result.status).toBe('failed');
    expect(result.error).toBeDefined();
  });
});
```

### Integration Tests

```bash
# Test Nexus Email sync
curl -X POST http://localhost:3000/api/nexus/sync \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION" \
  -d '{
    "contacts": [
      {
        "id": "test-1",
        "name": "Test Contact",
        "email": "test@example.com"
      }
    ],
    "apiKey": "nexus_email_test_key"
  }' \
  -w "\nStatus: %{http_code}\n"
```

---

## 🚨 Troubleshooting

### Connection Errors

```
Error: Failed to connect to Nexus. Check your API key.
```

**Solutions:**
1. Verify API key is correct
2. Check API URL (NEXUS_EMAIL_API_URL)
3. Ensure network connectivity
4. Check firewall/proxy settings
5. Verify API key has not expired

### Sync Failures

```
status: "failed"
error: "Contact already exists"
```

**Solutions:**
1. Check if contact exists in Nexus
2. Use update endpoint if modifying
3. Verify email is unique
4. Check contact format

### Rate Limiting

```
Error: Rate limit exceeded
```

**Solutions:**
1. Implement exponential backoff
2. Reduce batch size
3. Add delay between syncs
4. Contact Nexus support for higher limits

---

## 📊 Performance Optimization

### Batch Operations
```typescript
// ✅ Good: Batch sync (500ms window)
const contacts = [...]; // 100 contacts
await nexusClient.batchSyncContacts(contacts);

// ❌ Avoid: Individual requests
for (const contact of contacts) {
  await nexusClient.syncContact(contact); // 100 API calls
}
```

### Caching
```typescript
// Cache Nexus data locally
const contactsCache = new Map();

async function getCachedContact(id: string) {
  if (contactsCache.has(id)) {
    return contactsCache.get(id);
  }
  
  const contact = await nexusClient.getContact(id);
  contactsCache.set(id, contact);
  return contact;
}
```

---

## 📈 Monitoring & Analytics

### Track Integration Health
```typescript
// Log sync events
await nexusOSClient.logEvent('user-123', 'nexus_sync', {
  contactCount: 100,
  successCount: 95,
  failureCount: 5,
  duration: 2500, // ms
});

// Get activity logs
const logs = await nexusOSClient.getActivityLogs('user-123');
```

### Monitor API Usage
```bash
# Check sync history
curl http://localhost:3000/api/nexus/sync \
  -H "Cookie: next-auth.session-token=YOUR_SESSION"
```

---

## 🔄 Sync Workflow

```
User adds contact in Moswords
         ↓
Contact saved locally
         ↓
Sync event queued (500ms batch)
         ↓
Batch sent to Nexus Email API
         ↓
Nexus creates/updates contact
         ↓
Result returned (synced/failed)
         ↓
Local contact updated with nexusId
         ↓
User sees "✓ Nexus" status indicator
```

---

## 🎯 Use Cases

### Use Case 1: Sync All Contacts to Nexus

```typescript
// Get all local contacts
const { contacts } = await fetch('/api/contacts').then(r => r.json());

// Sync to Nexus
const nexusKey = await fetch('/api/keys/api-keys')
  .then(r => r.json())
  .then(data => data.keys.find(k => k.name === 'Nexus Email')?.key);

const result = await fetch('/api/nexus/sync', {
  method: 'POST',
  body: JSON.stringify({ contacts, apiKey: nexusKey }),
});
```

### Use Case 2: Keep Profiles in Sync

```typescript
// Update local profile
const localUpdate = await fetch('/api/profile', {
  method: 'PUT',
  body: JSON.stringify({ displayName: 'Jane Doe' }),
});

// Sync to Nexus OS
const osKey = 'nexus_os_YOUR_KEY';
await fetch('/api/nexus/os', {
  method: 'POST',
  body: JSON.stringify({
    action: 'updateProfile',
    apiKey: osKey,
    profileData: { displayName: 'Jane Doe' },
  }),
});
```

### Use Case 3: Log User Activity

```typescript
// User performs action in Moswords
await fetch('/api/nexus/os', {
  method: 'POST',
  body: JSON.stringify({
    action: 'logEvent',
    apiKey: 'nexus_os_YOUR_KEY',
    eventData: {
      type: 'message_sent',
      details: { recipients: 5, contentType: 'text' },
    },
  }),
});
```

---

## 📚 OpenAPI/Swagger

The complete API is documented in [openapi.yaml](./openapi.yaml).

### View Interactive Documentation

1. Visit: [Swagger UI Editor](https://editor.swagger.io/)
2. File → Import File
3. Select: `openapi.yaml`
4. Explore all endpoints interactively

---

## 🆘 Support & Resources

### Documentation Links
- [Nexus Email API Docs](https://docs.nexusemail.com/api)
- [Nexus OS API Docs](https://docs.nexusos.com/api)
- [OpenAPI Specification](./openapi.yaml)

### Getting Help
1. Check this guide for common issues
2. Review API response errors
3. Check application logs
4. Contact Nexus support
5. File GitHub issue with:
   - Error message
   - API request details
   - Response status code
   - Steps to reproduce

---

**Last Updated:** May 29, 2026  
**Status:** Production Ready ✅  
**Version:** 1.1.0
