# awechat.co.za Integration with Second Brain Ecosystem

## Overview

This guide shows how to integrate **awechat.co.za** (Discord-like messaging app) with the Second Brain ecosystem to:
- Share contacts across apps
- Use unified authentication
- Access friends lists
- Manage API keys from the admin dashboard

---

## Setup: 5 Simple Steps

### Step 1: Generate API Key in Admin Dashboard

1. Go to: `http://localhost:3000/ecosystem`
2. Click "API Keys" tab
3. Enter app name: `awechat`
4. Click "Create Key"
5. **Copy and save**:
   - API Key: `ek_...`
   - API Secret: `...`

### Step 2: Add to awechat.co.za `.env`

```env
# Second Brain Integration
SECOND_BRAIN_API_URL=http://localhost:3000
SECOND_BRAIN_API_KEY=ek_YOUR_API_KEY_HERE
SECOND_BRAIN_API_SECRET=YOUR_SECRET_HERE
SECOND_BRAIN_MASTER_TOKEN=a7f2e9c4d1b8f3a6e5c2d9f1a4b7e0c3
```

### Step 3: Import Helper in awechat

Create `src/lib/second-brain.ts`:

```typescript
/**
 * Second Brain integration for awechat
 * Handles authentication and contact sync with Moswords
 */

const API_URL = process.env.REACT_APP_SECOND_BRAIN_API_URL;
const API_KEY = process.env.REACT_APP_SECOND_BRAIN_API_KEY;
const MASTER_TOKEN = process.env.REACT_APP_SECOND_BRAIN_MASTER_TOKEN;

/**
 * Verify user identity with Second Brain
 */
export async function verifyUserWithSecondBrain() {
  const response = await fetch(
    `${API_URL}/api/second-brain/auth/me`,
    {
      headers: {
        Authorization: `Bearer ${MASTER_TOKEN}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to verify with Second Brain');
  }

  return response.json();
  // { uid, email, displayName, role, authenticated: true }
}

/**
 * Get user's contacts from Second Brain
 */
export async function getContactsFromSecondBrain() {
  const response = await fetch(
    `${API_URL}/api/second-brain/contacts`,
    {
      headers: {
        Authorization: `Bearer ${MASTER_TOKEN}`,
        'X-App-Name': 'awechat',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to get contacts');
  }

  return response.json();
  // { contacts: [...], count: N, userId, appName, timestamp }
}

/**
 * Sync awechat contacts to Second Brain
 */
export async function syncContactsToSecondBrain(
  contacts: { email: string; name: string; phoneNumber?: string; photoURL?: string }[]
) {
  const response = await fetch(
    `${API_URL}/api/second-brain/contacts`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MASTER_TOKEN}`,
        'X-App-Name': 'awechat',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'sync',
        contacts,
      }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to sync contacts');
  }

  return response.json();
  // { success: true, synced: N, contacts: [...] }
}

/**
 * React Hook for Second Brain integration
 */
export function useSecondBrain() {
  const [user, setUser] = React.useState(null);
  const [contacts, setContacts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    (async () => {
      try {
        // Verify with Second Brain
        const userData = await verifyUserWithSecondBrain();
        setUser(userData);

        // Get contacts from Second Brain
        const contactsData = await getContactsFromSecondBrain();
        setContacts(contactsData.contacts);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { user, contacts, loading, error };
}
```

### Step 4: Use in awechat Components

```typescript
import { useSecondBrain, syncContactsToSecondBrain } from '@/lib/second-brain';

export function AweChat() {
  const { user, contacts, loading } = useSecondBrain();

  if (loading) return <div>Loading from Second Brain...</div>;

  if (!user) return <div>Not authenticated with Second Brain</div>;

  return (
    <div>
      <h1>Welcome {user.displayName} to awechat!</h1>

      <h2>Contacts from Moswords ({contacts.length})</h2>
      <ul>
        {contacts.map((c) => (
          <li key={c.id}>
            <img src={c.photoURL} alt={c.name} />
            <span>{c.name}</span>
            <small>{c.email}</small>
          </li>
        ))}
      </ul>

      <button onClick={() => syncContactsToSecondBrain(/* awechat contacts */)}>
        Sync My Contacts
      </button>
    </div>
  );
}
```

### Step 5: Test Integration

```bash
# Check Second Brain is running
curl http://localhost:3000/api/second-brain/health

# Verify your API key
curl -H "Authorization: Bearer a7f2e9c4d1b8f3a6e5c2d9f1a4b7e0c3" \
  http://localhost:3000/api/second-brain/auth/me

# Get contacts
curl -H "Authorization: Bearer a7f2e9c4d1b8f3a6e5c2d9f1a4b7e0c3" \
  -H "X-App-Name: awechat" \
  http://localhost:3000/api/second-brain/contacts
```

---

## API Reference for awechat

### 1. Verify User

```
GET /api/second-brain/auth/me

Headers:
  Authorization: Bearer a7f2e9c4d1b8f3a6e5c2d9f1a4b7e0c3

Response: {
  uid: "user-123",
  email: "user@example.com",
  displayName: "John Doe",
  photoURL: "...",
  role: "admin",
  authenticated: true
}
```

### 2. Get Contacts

```
GET /api/second-brain/contacts

Headers:
  Authorization: Bearer a7f2e9c4d1b8f3a6e5c2d9f1a4b7e0c3
  X-App-Name: awechat

Response: {
  contacts: [
    {
      id: "contact-1",
      email: "friend@example.com",
      name: "Friend Name",
      phoneNumber: "+1234567890",
      photoURL: "...",
      source: "moswords"
    }
  ],
  count: 5,
  userId: "user-123"
}
```

### 3. Sync Contacts

```
POST /api/second-brain/contacts

Headers:
  Authorization: Bearer a7f2e9c4d1b8f3a6e5c2d9f1a4b7e0c3
  X-App-Name: awechat
  Content-Type: application/json

Body: {
  action: "sync",
  contacts: [
    {
      email: "user@awechat.co.za",
      name: "Awesome User",
      phoneNumber: "+27123456789",
      photoURL: "https://..."
    }
  ]
}

Response: {
  success: true,
  action: "sync",
  synced: 1,
  contacts: [...]
}
```

---

## Features awechat Gets

✅ **Unified User Profile**
- Same user ID across Moswords and awechat
- Display name, photo, status from Second Brain

✅ **Shared Contacts**
- Access Moswords contacts in awechat
- Auto-sync contacts between apps
- No duplicate contact management

✅ **Friends List**
- See who's online across apps
- Accept/reject friend requests
- Cross-app messaging capabilities

✅ **API Key Management**
- Admin dashboard shows awechat status
- Monitor API usage
- Rotate API keys anytime

---

## Admin Dashboard View for awechat

When you create an API key for awechat, the admin dashboard shows:

### API Keys Tab
```
App: awechat
Key: ek_abc123...
Status: Active
Created: June 2, 2026
Requests: 1,234
Last Used: 2 minutes ago
```

### Connected Apps Tab
```
App: awechat
Status: Connected ✅
Last Check: 2 min ago
Requests in API: 1,234
```

---

## Seamless Integration Examples

###Example 1: Login with Second Brain

```typescript
// awechat login page
async function loginWithSecondBrain(email, password) {
  // 1. Login to Second Brain (Moswords)
  const auth = await secondBrain.verifyUserWithSecondBrain();
  
  // 2. User automatically logged into awechat
  // 3. Contacts auto-sync
  // 4. Friends list available
}
```

### Example 2: Add Friend from Moswords Contacts

```typescript
// In awechat contact picker
const { contacts } = useSecondBrain();

contacts.map((contact) => (
  <button
    onClick={() => {
      // Send friend request using email from Second Brain
      sendFriendRequest(contact.email);
    }}
  >
    Add {contact.name} as friend
  </button>
));
```

### Example 3: Portal Communication

Since awechat is Discord-like with portals, use Second Brain for:

```typescript
// Create a portal between Moswords and awechat
const moswordsUser = await getFromSecondBrain('users', 'user-123');
const aweUser = await getFromAwechat('users', moswordsUser.email);

// Create portal channel
createPortal({
  app1: 'moswords',
  user1: moswordsUser.id,
  app2: 'awechat',
  user2: aweUser.id,
});
```

---

## Troubleshooting

### "Unauthorized" Errors
- Check `SECOND_BRAIN_MASTER_TOKEN` in `.env`
- Should be: `a7f2e9c4d1b8f3a6e5c2d9f1a4b7e0c3`

### Contacts Not Syncing
- Verify `X-App-Name: awechat` header is sent
- Check contacts are valid (email + name required)
- Use POST to `/api/second-brain/contacts` with `action: "sync"`

### API Key Errors
- Generate a new key in admin dashboard
- Copy both API Key and Secret
- Update `.env` in awechat
- Restart development server

### Can't Connect to Second Brain
- Make sure `npm run dev` is running for Moswords
- Check `http://localhost:3000/api/second-brain/health`
- Should return `{ "status": "ok" }`

---

## Security Best Practices

✅ Store API keys in `.env.local` (not committed to git)
✅ Use Bearer token scheme for all requests
✅ Rotate API keys monthly
✅ Monitor API usage in admin dashboard
✅ Log all contact access for audit trail
✅ Use HTTPS in production

---

## Production Deployment

### Deploy Moswords to Vercel

```bash
vercel deploy --prod
```

### Update awechat `.env.production`

```env
REACT_APP_SECOND_BRAIN_API_URL=https://your-app.vercel.app
REACT_APP_SECOND_BRAIN_API_KEY=ek_YOUR_PROD_KEY
REACT_APP_SECOND_BRAIN_MASTER_TOKEN=a7f2e9c4d1b8f3a6e5c2d9f1a4b7e0c3
```

### Deploy awechat

```bash
# After updating env vars
vercel deploy --prod
```

---

## Next Steps

1. ✅ Create API key for awechat in admin dashboard
2. ✅ Add to awechat `.env`
3. ✅ Import Second Brain helper
4. ✅ Use in components
5. ✅ Test endpoints
6. ✅ Deploy to production
7. ✅ Celebrate seamless cross-app integration! 🎉

---

**Status**: Ready for Integration
**Last Updated**: June 2, 2026
**Maintained by**: Your Team
