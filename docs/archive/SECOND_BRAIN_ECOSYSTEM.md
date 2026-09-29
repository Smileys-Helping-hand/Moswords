# Second Brain Ecosystem - Master Token System

## Overview

The **Second Brain** (this Moswords app) is the central hub for your entire application ecosystem. All connected apps (FinancePlay, LifeStack, etc.) authenticate and share data through a single master token system.

This creates a unified identity and data layer across all your apps, with Moswords as the orchestrator.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Second Brain (Moswords)                    │
│         - Master Token Validation                       │
│         - User Authentication                           │
│         - Data Gateway & Sync                           │
│         - Central Auth Store                            │
└─────────────────────────────────────────────────────────┘
         ↑              ↑              ↑              ↑
         │              │              │              │
   ┌─────────┐  ┌────────────┐  ┌──────────┐  ┌──────────┐
   │  Finance │  │ LifeStack  │  │ Moswords │  │   App 4  │
   │   Play   │  │  (Budget)  │  │  (Chat)  │  │          │
   └─────────┘  └────────────┘  └──────────┘  └──────────┘
   
Each app uses the same master token to:
- Verify user identity
- Access shared user data
- Sync state across apps
- Maintain single session
```

---

## Setup & Configuration

### 1. Generate Master Token

```bash
# Run this to generate a secure token:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Output: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6 (example)
```

### 2. Configure .env

Add to your `.env.local`:

```env
# Second Brain Master Token (for local development)
SECOND_BRAIN_API_KEY=your-generated-token-here

# URL where this app is deployed (for other apps to reach it)
SECOND_BRAIN_API_URL=http://localhost:3000        # local
# SECOND_BRAIN_API_URL=https://your-app.vercel.app  # production
```

### 3. Each Connected App Configuration

In each connected app (FinancePlay, LifeStack, etc.), add:

```env
# Second Brain connection
SECOND_BRAIN_API_KEY=same-token-as-above
SECOND_BRAIN_API_URL=http://localhost:3000
```

---

## Master Token Endpoints

### 1. Health Check (No Auth Required)

Check if Second Brain is running:

```bash
curl http://localhost:3000/api/second-brain/health
```

**Response:**
```json
{
  "status": "ok",
  "service": "second-brain",
  "timestamp": 1717324800000,
  "version": "1.0.0",
  "endpoints": {
    "auth": "/api/second-brain/auth/me",
    "gateway": "/api/second-brain/data/gateway",
    "health": "/api/second-brain/health"
  }
}
```

### 2. Verify User (Auth Required)

All apps call this to verify the user and get their profile:

```bash
curl -H "Authorization: Bearer YOUR_MASTER_TOKEN" \
  http://localhost:3000/api/second-brain/auth/me
```

**Success Response (200):**
```json
{
  "uid": "user-123",
  "email": "user@example.com",
  "displayName": "John Doe",
  "photoURL": "https://example.com/photo.jpg",
  "role": "admin",
  "authenticated": true,
  "timestamp": 1717324800000,
  "connectedApps": ["finance-play", "life-stack", "moswords"]
}
```

**Error Response (401):**
```json
{
  "error": "Invalid or expired token",
  "authenticated": false,
  "code": "AUTH_FAILED"
}
```

### 3. Data Gateway (Auth Required)

Universal endpoint for all apps to read/write data:

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_MASTER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "get",
    "resource": "profile",
    "scope": "private"
  }' \
  http://localhost:3000/api/second-brain/data/gateway
```

**Supported Resources:**
- `profile` - User profile data
- `conversations` - Chat conversations
- `messages` - Chat messages
- `preferences` - User preferences
- `data` - Custom app data

**Supported Actions:**
- `get` - Retrieve a single resource
- `set` - Create or update a resource
- `list` - List resources with filters
- `delete` - Delete a resource

---

## Integration in Connected Apps

### JavaScript/TypeScript

```typescript
// Install axios or use fetch
import axios from 'axios';

const SECOND_BRAIN_URL = process.env.REACT_APP_SECOND_BRAIN_API_URL;
const MASTER_TOKEN = process.env.REACT_APP_SECOND_BRAIN_API_KEY;

// Helper function
async function getSecondBrainUser() {
  const response = await axios.get(
    `${SECOND_BRAIN_URL}/api/second-brain/auth/me`,
    {
      headers: {
        Authorization: `Bearer ${MASTER_TOKEN}`,
      },
    }
  );
  
  return response.data; // { uid, email, displayName, ... }
}

// Usage
async function initializeApp() {
  try {
    const user = await getSecondBrainUser();
    console.log('Authenticated as:', user.email);
    // Initialize app with user data
  } catch (error) {
    console.error('Failed to authenticate:', error.response?.data?.error);
  }
}

initializeApp();
```

### React Hook

```typescript
// useSecondBrain.ts
import { useEffect, useState } from 'react';

export function useSecondBrain() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(
          `${process.env.REACT_APP_SECOND_BRAIN_API_URL}/api/second-brain/auth/me`,
          {
            headers: {
              Authorization: `Bearer ${process.env.REACT_APP_SECOND_BRAIN_API_KEY}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Auth failed: ${response.status}`);
        }

        const data = await response.json();
        setUser(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  return { user, loading, error, authenticated: !!user };
}

// Usage in component
export function App() {
  const { user, loading, authenticated } = useSecondBrain();

  if (loading) return <div>Checking authentication...</div>;
  if (!authenticated) return <div>Not authenticated</div>;

  return <div>Welcome, {user.displayName}!</div>;
}
```

### Python

```python
import os
import requests

SECOND_BRAIN_URL = os.getenv('SECOND_BRAIN_API_URL')
MASTER_TOKEN = os.getenv('SECOND_BRAIN_API_KEY')

def get_second_brain_user():
    """Get authenticated user from Second Brain"""
    headers = {
        'Authorization': f'Bearer {MASTER_TOKEN}',
        'Content-Type': 'application/json'
    }
    
    response = requests.get(
        f'{SECOND_BRAIN_URL}/api/second-brain/auth/me',
        headers=headers
    )
    
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f'Auth failed: {response.status_code} - {response.text}')

# Usage
try:
    user = get_second_brain_user()
    print(f"Authenticated as: {user['email']}")
except Exception as e:
    print(f"Error: {e}")
```

---

## Security Best Practices

### 1. Token Storage

✅ **DO:**
- Store token in environment variables (`.env.local`)
- Use secure key management in production
- Rotate tokens regularly
- Keep tokens secret and never commit them

❌ **DON'T:**
- Hardcode tokens in source code
- Commit `.env.local` to git
- Send tokens in URLs or logs
- Share tokens across unrelated apps

### 2. HTTPS in Production

```env
# Development (localhost, HTTP OK)
SECOND_BRAIN_API_URL=http://localhost:3000

# Production (HTTPS REQUIRED)
SECOND_BRAIN_API_URL=https://your-app.vercel.app
```

### 3. Token Validation

- Tokens are validated using constant-time comparison
- Prevents timing attacks
- Invalid tokens result in 401 Unauthorized
- All requests require the exact token

### 4. Rate Limiting (Future Enhancement)

Implement rate limiting per token to prevent abuse:

```typescript
// TODO: Add to middleware
const tokenRateLimits = new Map<string, { count: number; reset: number }>();

function checkRateLimit(token: string, limit = 1000): boolean {
  const now = Date.now();
  const limit_data = tokenRateLimits.get(token);

  if (!limit_data || now > limit_data.reset) {
    tokenRateLimits.set(token, { count: 1, reset: now + 60000 }); // 60s window
    return true;
  }

  if (limit_data.count >= limit) {
    return false;
  }

  limit_data.count++;
  return true;
}
```

---

## Data Scope

All requests support `scope` parameter:

- **`private`** (default): Only the authenticated user can access
- **`shared`**: Other connected apps can read (with permission)

```json
{
  "action": "get",
  "resource": "profile",
  "scope": "private"  // Only this user
}
```

---

## Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| `AUTH_MISSING` | 401 | No Authorization header |
| `AUTH_INVALID_SCHEME` | 401 | Not using Bearer token |
| `AUTH_FAILED` | 401 | Token invalid or expired |
| `AUTH_EMPTY` | 401 | Token is empty |
| `RESOURCE_NOT_FOUND` | 404 | Resource doesn't exist |
| `BAD_REQUEST` | 400 | Missing required fields |
| `SERVER_ERROR` | 500 | Internal server error |

---

## Monitoring & Debugging

### Check Token is Valid

```bash
curl -I \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/second-brain/auth/me
```

Should return `200 OK`.

### Debug Mode

Enable debug logging in connected apps:

```env
DEBUG=second-brain:*
```

### Test Gateway

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"list","resource":"profile"}' \
  http://localhost:3000/api/second-brain/data/gateway
```

---

## Deployment

### Local Development

1. Generate token
2. Add to `.env.local`
3. Start dev server: `npm run dev`
4. Test health check: `curl http://localhost:3000/api/second-brain/health`

### Production (Vercel)

1. Deploy Moswords to Vercel
2. Add environment variable in Vercel dashboard:
   - Name: `SECOND_BRAIN_API_KEY`
   - Value: Your generated token
3. Update connected apps' `.env.production`:
   ```env
   SECOND_BRAIN_API_URL=https://your-app.vercel.app
   SECOND_BRAIN_API_KEY=your-token
   ```

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Required environment variables
ENV SECOND_BRAIN_API_KEY=your-token
ENV DATABASE_URL=...

EXPOSE 3000
CMD ["npm", "start"]
```

---

## Connected Apps Roadmap

### Current

- ✅ **Moswords** (Chat) - The core hub

### Planned

- 📋 **FinancePlay** - Personal finance tracker
- 💼 **LifeStack** - Life management hub
- 📊 **Analytics Dashboard** - Cross-app insights
- 🤖 **Jarvis Assistant** - AI orchestrator (charges from here)

Each app:
- Uses same Master Token for auth
- Can access shared user data
- Maintains separate data stores
- Syncs state through Second Brain

---

## API Reference

### POST /api/second-brain/data/gateway

```typescript
interface DataGatewayRequest {
  action: 'get' | 'set' | 'list' | 'delete';
  resource: string; // 'profile', 'conversations', etc.
  resourceId?: string; // For get/delete
  filter?: Record<string, any>; // For list
  data?: any; // For set
  scope?: 'private' | 'shared'; // Data visibility
}

interface DataGatewayResponse {
  success?: boolean;
  data?: any;
  error?: string;
  timestamp: number;
}
```

---

## Support

For issues or questions about the Second Brain system:

1. Check `/api/second-brain/health` endpoint
2. Verify token is correct
3. Check environment variables
4. Review server logs
5. Create an issue with:
   - Token format (first 8 chars only!)
   - Request/response bodies
   - Error message
   - Environment (dev/prod)

---

**Status**: Production-Ready ✅
**Last Updated**: June 2, 2026
**Maintained by**: Your Team
