# 🔑 Quick Reference - Master Token & Endpoints

## Master Token

```
Token:  a7f2e9c4d1b8f3a6e5c2d9f1a4b7e0c3
Format: Bearer token (OAuth 2.0)
Location: .env.local
Status: ✅ Active
```

---

## Endpoints

### 1. Health Check (No Auth)

```bash
GET http://localhost:3000/api/second-brain/health

Response: { status: "ok", service: "second-brain", ... }
```

### 2. Verify User (Auth Required)

```bash
GET http://localhost:3000/api/second-brain/auth/me

Headers:
  Authorization: Bearer a7f2e9c4d1b8f3a6e5c2d9f1a4b7e0c3

Response:
{
  "uid": "user-123",
  "email": "user@example.com",
  "displayName": "John Doe",
  "photoURL": "https://...",
  "role": "admin",
  "authenticated": true,
  "timestamp": 1717324800000
}
```

### 3. Data Gateway (Auth Required)

```bash
POST http://localhost:3000/api/second-brain/data/gateway

Headers:
  Authorization: Bearer a7f2e9c4d1b8f3a6e5c2d9f1a4b7e0c3
  Content-Type: application/json

Body:
{
  "action": "get|set|list|delete",
  "resource": "profile|conversations|messages|...",
  "resourceId": "optional-id",
  "scope": "private|shared"
}
```

---

## Test Commands

### Using curl

```bash
# Health (no auth)
curl http://localhost:3000/api/second-brain/health

# Auth (with token)
curl -H "Authorization: Bearer a7f2e9c4d1b8f3a6e5c2d9f1a4b7e0c3" \
  http://localhost:3000/api/second-brain/auth/me

# Invalid token (should fail with 401)
curl -H "Authorization: Bearer wrong-token" \
  http://localhost:3000/api/second-brain/auth/me

# Data gateway
curl -X POST \
  -H "Authorization: Bearer a7f2e9c4d1b8f3a6e5c2d9f1a4b7e0c3" \
  -H "Content-Type: application/json" \
  -d '{"action":"list","resource":"profile"}' \
  http://localhost:3000/api/second-brain/data/gateway
```

### Using JavaScript

```javascript
const TOKEN = 'a7f2e9c4d1b8f3a6e5c2d9f1a4b7e0c3';
const BASE_URL = 'http://localhost:3000';

// Health check
fetch(`${BASE_URL}/api/second-brain/health`)
  .then(r => r.json())
  .then(console.log);

// Get user
fetch(`${BASE_URL}/api/second-brain/auth/me`, {
  headers: { Authorization: `Bearer ${TOKEN}` }
})
  .then(r => r.json())
  .then(console.log);

// Data gateway
fetch(`${BASE_URL}/api/second-brain/data/gateway`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    action: 'get',
    resource: 'profile'
  })
})
  .then(r => r.json())
  .then(console.log);
```

### Using Python

```python
import requests
import os

TOKEN = os.getenv('SECOND_BRAIN_API_KEY', 'a7f2e9c4d1b8f3a6e5c2d9f1a4b7e0c3')
BASE_URL = 'http://localhost:3000'
HEADERS = {'Authorization': f'Bearer {TOKEN}'}

# Health
r = requests.get(f'{BASE_URL}/api/second-brain/health')
print(r.json())

# Auth
r = requests.get(f'{BASE_URL}/api/second-brain/auth/me', headers=HEADERS)
print(r.json())

# Data gateway
r = requests.post(
  f'{BASE_URL}/api/second-brain/data/gateway',
  headers={**HEADERS, 'Content-Type': 'application/json'},
  json={'action': 'get', 'resource': 'profile'}
)
print(r.json())
```

---

## Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | Auth endpoint returns user data |
| 400 | Bad request | Missing required fields |
| 401 | Unauthorized | Invalid or missing token |
| 404 | Not found | Resource doesn't exist |
| 500 | Server error | Internal error |

---

## Error Examples

### Missing Token
```
❌ curl http://localhost:3000/api/second-brain/auth/me

Response (401):
{
  "error": "Missing Authorization header",
  "authenticated": false,
  "code": "AUTH_MISSING"
}
```

### Invalid Token
```
❌ curl -H "Authorization: Bearer wrong" \
  http://localhost:3000/api/second-brain/auth/me

Response (401):
{
  "error": "Invalid or expired token",
  "authenticated": false,
  "code": "AUTH_FAILED"
}
```

### Wrong Scheme
```
❌ curl -H "Authorization: Basic token" \
  http://localhost:3000/api/second-brain/auth/me

Response (401):
{
  "error": "Invalid Authorization scheme. Use Bearer token",
  "authenticated": false
}
```

---

## Environment Variables

### Development (.env.local)
```env
SECOND_BRAIN_API_KEY=a7f2e9c4d1b8f3a6e5c2d9f1a4b7e0c3
SECOND_BRAIN_API_URL=http://localhost:3000
```

### Production (Vercel)
```env
SECOND_BRAIN_API_KEY=a7f2e9c4d1b8f3a6e5c2d9f1a4b7e0c3
SECOND_BRAIN_API_URL=https://your-app.vercel.app
```

---

## APK Files

| File | Size | Use |
|------|------|-----|
| Moswords-release.apk | 5 MB | ✅ Production - Install this |
| Moswords.apk | 11 MB | 🔧 Debug - For development |

**Install:**
```bash
adb install -r apk/Moswords-release.apk
```

---

## Common Tasks

### Check if Server is Running
```bash
curl http://localhost:3000/api/second-brain/health
# Should return { "status": "ok", ... }
```

### Get Current User
```bash
curl -H "Authorization: Bearer a7f2e9c4d1b8f3a6e5c2d9f1a4b7e0c3" \
  http://localhost:3000/api/second-brain/auth/me
```

### Generate New Token
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Start Dev Server
```bash
npm run dev
# Server at http://localhost:3000
```

### Build Production APK
```bash
npm run apk:release
# Output: apk/Moswords-release.apk
```

### View Logs
```bash
adb logcat | grep -i "moswords\|error"
```

---

## Integration Checklist

- [ ] Add `.env` variables (API URL & Key)
- [ ] Import auth helper function
- [ ] Call auth endpoint on app start
- [ ] Store user in state/context
- [ ] Handle 401 errors (re-authenticate)
- [ ] Test with valid token (should work)
- [ ] Test with invalid token (should fail)
- [ ] Test offline mode
- [ ] Verify user data matches

---

## Key Security Rules

✅ **DO:**
- Store token in `.env` files
- Use HTTPS in production
- Validate all requests server-side
- Rotate tokens periodically
- Use Bearer token scheme

❌ **DON'T:**
- Hardcode tokens in source code
- Commit `.env` files to git
- Log tokens to console
- Send token in URLs
- Share tokens across projects

---

## Support

- **Server Issues**: Check `/api/second-brain/health`
- **Auth Issues**: Verify token in `.env.local`
- **Integration Issues**: Review `SECOND_BRAIN_ECOSYSTEM.md`
- **Testing Issues**: See `TESTING_CHECKLIST.md`

---

**Token**: `a7f2e9c4d1b8f3a6e5c2d9f1a4b7e0c3`  
**Server**: `http://localhost:3000` (dev) | `https://your-app.vercel.app` (prod)  
**Status**: ✅ Ready to Use
