# 🧠 Nexus App - Second Brain Integration Guide

**Status**: Ready to integrate with Second Brain ecosystem
**Master Token**: `a7f2e9c4d1b8f3a6e5c2d9f1a4b7e0c3`

---

## ✅ WHAT NEXUS NEEDS TO DO

### Step 1: Add Master Token to `.env`
```env
REACT_APP_SECOND_BRAIN_MASTER_TOKEN=a7f2e9c4d1b8f3a6e5c2d9f1a4b7e0c3
REACT_APP_SECOND_BRAIN_API_URL=http://localhost:3000
# Production: REACT_APP_SECOND_BRAIN_API_URL=https://moswords.vercel.app
```

### Step 2: Create Helper (`src/lib/second-brain.ts`)
```typescript
const API_URL = process.env.REACT_APP_SECOND_BRAIN_API_URL;
const MASTER_TOKEN = process.env.REACT_APP_SECOND_BRAIN_MASTER_TOKEN;

export async function verifyUser() {
  const res = await fetch(`${API_URL}/api/second-brain/auth/me`, {
    headers: { Authorization: `Bearer ${MASTER_TOKEN}` },
  });
  return res.json();
}

export async function getContacts() {
  const res = await fetch(`${API_URL}/api/second-brain/contacts`, {
    headers: {
      Authorization: `Bearer ${MASTER_TOKEN}`,
      'X-App-Name': 'nexus',
    },
  });
  return res.json();
}

export async function syncContacts(contacts: any[]) {
  const res = await fetch(`${API_URL}/api/second-brain/contacts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${MASTER_TOKEN}`,
      'X-App-Name': 'nexus',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'sync', contacts }),
  });
  return res.json();
}
```

### Step 3: Use in Components
```typescript
import { verifyUser, getContacts } from '@/lib/second-brain';

export function NexusApp() {
  const [user, setUser] = React.useState(null);
  const [contacts, setContacts] = React.useState([]);

  React.useEffect(() => {
    verifyUser().then(setUser);
    getContacts().then(data => setContacts(data.contacts));
  }, []);

  return (
    <div>
      {user && <h1>Welcome, {user.displayName}!</h1>}
      <h2>Contacts ({contacts.length})</h2>
      {contacts.map(c => (
        <div key={c.id}>{c.name}</div>
      ))}
    </div>
  );
}
```

### Step 4: Vercel Environment Variables
```
REACT_APP_SECOND_BRAIN_MASTER_TOKEN=a7f2e9c4d1b8f3a6e5c2d9f1a4b7e0c3
REACT_APP_SECOND_BRAIN_API_URL=https://moswords.vercel.app
```

### Step 5: Monitor
Go to: `http://localhost:3000/ecosystem`
→ Connected Apps tab
→ See "nexus" connected and monitored

---

## 🎯 WHAT HAPPENS

✅ User logs in → verifyUser() called → User authenticated
✅ App loads → getContacts() called → Contacts from Moswords loaded
✅ User adds contact → syncContacts() called → Synced to all apps
✅ Admin sees real-time status → "nexus" health & requests tracked

---

## ✅ THAT'S IT!

Master Token: `a7f2e9c4d1b8f3a6e5c2d9f1a4b7e0c3`

Use in all apps (Nexus, awechat, FinancePlay, LifeStack)
All will share contacts, users, and friends!

Status: ✅ Ready to go
