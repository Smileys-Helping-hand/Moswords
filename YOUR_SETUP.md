# 🎯 YOUR SETUP - Master Credentials & Access Guide

**Date**: June 2, 2026  
**Status**: ✅ Production Ready  
**Superadmin**: mraaziqp@gmail.com

---

## 🔑 MASTER API TOKEN (Use for Nexus & All Apps)

```
┌─────────────────────────────────────────────────────────────────┐
│ MASTER TOKEN: a7f2e9c4d1b8f3a6e5c2d9f1a4b7e0c3                │
│                                                                 │
│ This is THE token that powers your entire ecosystem.            │
│ Add to EVERY app's .env file                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Use in ALL apps:
```env
# Nexus app .env
SECOND_BRAIN_MASTER_TOKEN=a7f2e9c4d1b8f3a6e5c2d9f1a4b7e0c3
SECOND_BRAIN_API_URL=http://localhost:3000

# awechat .env
SECOND_BRAIN_MASTER_TOKEN=a7f2e9c4d1b8f3a6e5c2d9f1a4b7e0c3
SECOND_BRAIN_API_URL=http://localhost:3000

# FinancePlay .env
SECOND_BRAIN_MASTER_TOKEN=a7f2e9c4d1b8f3a6e5c2d9f1a4b7e0c3
SECOND_BRAIN_API_URL=http://localhost:3000

# LifeStack .env
SECOND_BRAIN_MASTER_TOKEN=a7f2e9c4d1b8f3a6e5c2d9f1a4b7e0c3
SECOND_BRAIN_API_URL=http://localhost:3000
```

---

## 🔐 YOUR SUPERADMIN ACCOUNT

```
┌─────────────────────────────────────────────────────────────────┐
│ EMAIL: mraaziqp@gmail.com                                       │
│ ROLE: SUPERADMIN (Only account with full permissions)           │
│ STATUS: ACTIVE                                                  │
│ PERMISSIONS: ALL (create/delete keys, manage apps, etc.)        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 ADMIN DASHBOARD (Your Control Center)

### Access It
```
URL: http://localhost:3000/ecosystem
```

### How to Access
1. Make sure Moswords is running: `npm run dev`
2. Go to: `http://localhost:3000/ecosystem`
3. You'll be asked to login
4. Login with: `mraaziqp@gmail.com` (the account you use for Moswords)
5. You'll have full admin access automatically

### What You'll See

#### Tab 1: 🔑 API Keys
- **Create new API key** for any app
  - Enter app name (nexus, awechat, financeplay, etc.)
  - Get `ek_...` and secret
  - Share with app developers
- **Manage existing keys**
  - See usage (total requests)
  - See last used time
  - Revoke compromised keys
  - Copy key to clipboard

#### Tab 2: 📱 Connected Apps
- **Real-time status** of all connected apps
  - Green = Connected ✅
  - Yellow = Error ⚠️
  - Gray = Disabled
- **Monitor health**
  - Last health check time
  - Error messages
  - Consecutive errors
  - Request count
- **See which apps are active** right now

#### Tab 3: 👥 Friends
- Manage all friends
- See friend requests
- Accept/block users
- Cross-app friends network

#### Tab 4: 📇 Contacts
- View all contacts from all apps
- See which apps have synced which contacts
- Manage contact metadata
- Track contact sync status

---

## 🚀 How to Use Master Token

### For Nexus App

1. **Add to Nexus .env**
```env
SECOND_BRAIN_MASTER_TOKEN=a7f2e9c4d1b8f3a6e5c2d9f1a4b7e0c3
SECOND_BRAIN_API_URL=http://localhost:3000
```

2. **Use in Nexus Code**
```typescript
// nexus/src/lib/second-brain.ts
const TOKEN = process.env.SECOND_BRAIN_MASTER_TOKEN;
const URL = process.env.SECOND_BRAIN_API_URL;

export async function verifyUser() {
  const res = await fetch(`${URL}/api/second-brain/auth/me`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
    },
  });
  return res.json();
}

export async function getContacts() {
  const res = await fetch(`${URL}/api/second-brain/contacts`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'X-App-Name': 'nexus',
    },
  });
  return res.json();
}
```

3. **Use in Nexus Components**
```typescript
import { verifyUser, getContacts } from '@/lib/second-brain';

export default function App() {
  useEffect(() => {
    // Verify user with Second Brain
    verifyUser().then(user => {
      console.log('Logged in as:', user.displayName);
    });

    // Get contacts from Moswords
    getContacts().then(data => {
      console.log('Contacts:', data.contacts);
    });
  }, []);

  return <div>App powered by Second Brain!</div>;
}
```

---

## 📋 API Key Types

### Master Token (What you have now)
- **Token**: `a7f2e9c4d1b8f3a6e5c2d9f1a4b7e0c3`
- **Used by**: ALL apps
- **Scope**: Full ecosystem access
- **Rate limit**: None (admin token)
- **Rotation**: Never (core system token)

### App-Specific Keys (Generate in dashboard)
- **Format**: `ek_<32-hex>`
- **Used by**: Individual apps
- **Scope**: Limited (per app)
- **Rate limit**: 100 requests/minute
- **Rotation**: Monthly recommended

---

## 🧪 Test Master Token Right Now

```bash
# 1. Health check (no auth)
curl http://localhost:3000/api/second-brain/health

# 2. Verify user (with master token)
curl -H "Authorization: Bearer a7f2e9c4d1b8f3a6e5c2d9f1a4b7e0c3" \
  http://localhost:3000/api/second-brain/auth/me

# 3. Get contacts (with master token)
curl -H "Authorization: Bearer a7f2e9c4d1b8f3a6e5c2d9f1a4b7e0c3" \
  -H "X-App-Name: nexus" \
  http://localhost:3000/api/second-brain/contacts

# Should all return JSON with your user data
```

---

## 📱 Create API Key for Individual Apps

### Option 1: Via Admin Dashboard (Easiest)
1. Go to: `http://localhost:3000/ecosystem`
2. Click: "API Keys" tab
3. Enter app name: "nexus" (or "awechat", "financeplay", etc.)
4. Click: "Create Key"
5. **Copy and save the credentials** (shown only once!)

### Option 2: Via API
```bash
curl -X POST http://localhost:3000/api/ecosystem/keys \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"appName":"nexus"}'

# Returns:
# {
#   "key": { ... },
#   "apiKey": "ek_...",
#   "apiSecret": "secret...",
#   "warning": "Save your credentials..."
# }
```

---

## 📊 Monitoring Your Apps

### In Admin Dashboard
Every time you:
1. Go to `/ecosystem`
2. Click "Connected Apps" tab
3. You'll see:
   - ✅ **Connected** - App is working
   - ⚠️ **Error** - Last error shown
   - ⚪ **Disabled** - App disabled
   - Request counts
   - Last health check time

### Real-time Updates
- Dashboard refreshes every 5 seconds
- See errors immediately
- Track API usage per app

---

## 🔒 Keep Safe

⚠️ **IMPORTANT**:
- Never share master token publicly
- Never commit to GitHub (it's in MASTER_CREDENTIALS.md)
- Only share app-specific API keys with developers
- Rotate app keys monthly
- Monitor dashboard for errors

---

## 🎯 Quick Checklist

- [ ] Master token: `a7f2e9c4d1b8f3a6e5c2d9f1a4b7e0c3`
- [ ] Add to Nexus `.env`
- [ ] Start Moswords: `npm run dev`
- [ ] Visit admin dashboard: `http://localhost:3000/ecosystem`
- [ ] Login as: `mraaziqp@gmail.com`
- [ ] See "Connected Apps" tab
- [ ] Create API key for new apps
- [ ] Monitor in dashboard

---

## 📚 Documentation

All guides available in repo:
- **ECOSYSTEM_MASTER_GUIDE.md** - Complete reference
- **AWECHAT_INTEGRATION.md** - awechat setup
- **MASTER_CREDENTIALS.md** - All credentials
- **QUICK_REFERENCE.md** - Commands
- **ECOSYSTEM_COMPLETE.md** - Summary

---

## ✨ What You Have

✅ Complete ecosystem system
✅ Admin dashboard at `/ecosystem`
✅ Master token for all apps
✅ Superadmin status (mraaziqp@gmail.com)
✅ API key management
✅ Connected apps monitoring
✅ Shared contacts system
✅ Friends network
✅ Production-ready 5MB APK

---

## 🚀 Next Steps

1. **Run Moswords**: `npm run dev`
2. **Access Dashboard**: `http://localhost:3000/ecosystem`
3. **Add Master Token to Nexus** `.env`
4. **Create API Keys** for awechat, FinancePlay, LifeStack
5. **Monitor** in real-time via dashboard

---

**Your Second Brain is ready to power your entire app ecosystem!** 🧠

**Master Token**: `a7f2e9c4d1b8f3a6e5c2d9f1a4b7e0c3`  
**Admin Dashboard**: `http://localhost:3000/ecosystem`  
**Superadmin**: `mraaziqp@gmail.com`  
**Status**: ✅ Production Ready

Go build amazing things! 🚀
