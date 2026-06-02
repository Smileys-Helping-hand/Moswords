# 🔐 Master Credentials & Configuration

**⚠️ KEEP THIS SECURE - NEVER COMMIT TO GITHUB**

---

## 🧠 Second Brain Ecosystem

### Master Token
```
Token: a7f2e9c4d1b8f3a6e5c2d9f1a4b7e0c3
Format: Bearer token (OAuth 2.0)
Status: ACTIVE
Created: June 2, 2026
```

**Use this token to:**
- Connect all apps (awechat, financeplay, lifestack, etc.)
- Access shared contacts
- Verify users
- Manage data gateway

**Add to each app's `.env`:**
```env
SECOND_BRAIN_MASTER_TOKEN=a7f2e9c4d1b8f3a6e5c2d9f1a4b7e0c3
SECOND_BRAIN_API_URL=http://localhost:3000 (dev)
SECOND_BRAIN_API_URL=https://your-domain.vercel.app (prod)
```

---

## 👤 Superadmin Account

### Primary Superadmin
```
Email: mraaziqp@gmail.com
Role: SUPERADMIN
Permissions: ALL
Status: ACTIVE
```

**Access:**
- Admin Dashboard: `/ecosystem`
- API Key Management: Create/revoke keys
- App Status Monitoring
- Connected Apps View
- Friends & Contacts Management

---

## 📱 Admin Dashboard

### Location
```
http://localhost:3000/ecosystem
```

### Access
1. Login with: `mraaziqp@gmail.com`
2. Click on your profile → Settings → Admin
3. Or go directly to: `http://localhost:3000/ecosystem`

### Tabs Available
- 🔑 **API Keys** - Create & manage app keys
- 📱 **Connected Apps** - Monitor all apps
- 👥 **Friends** - Manage friends network
- 📇 **Contacts** - Manage shared contacts

---

## 🔑 API Key Examples

### For Nexus App
```env
# .env for nexus app
SECOND_BRAIN_API_KEY=ek_nexus_xxxxx
SECOND_BRAIN_API_SECRET=xxxxx_secret
SECOND_BRAIN_MASTER_TOKEN=a7f2e9c4d1b8f3a6e5c2d9f1a4b7e0c3
SECOND_BRAIN_API_URL=http://localhost:3000
```

### For awechat
```env
# .env for awechat
SECOND_BRAIN_API_KEY=ek_awechat_xxxxx
SECOND_BRAIN_API_SECRET=xxxxx_secret
SECOND_BRAIN_MASTER_TOKEN=a7f2e9c4d1b8f3a6e5c2d9f1a4b7e0c3
SECOND_BRAIN_API_URL=http://localhost:3000
```

### For FinancePlay
```env
# .env for financeplay
SECOND_BRAIN_API_KEY=ek_financeplay_xxxxx
SECOND_BRAIN_API_SECRET=xxxxx_secret
SECOND_BRAIN_MASTER_TOKEN=a7f2e9c4d1b8f3a6e5c2d9f1a4b7e0c3
SECOND_BRAIN_API_URL=http://localhost:3000
```

---

## 🧪 Test Endpoints

### Health Check
```bash
curl http://localhost:3000/api/second-brain/health
```

### Verify User (as superadmin)
```bash
curl -H "Authorization: Bearer a7f2e9c4d1b8f3a6e5c2d9f1a4b7e0c3" \
  http://localhost:3000/api/second-brain/auth/me
```

### Get Contacts
```bash
curl -H "Authorization: Bearer a7f2e9c4d1b8f3a6e5c2d9f1a4b7e0c3" \
  -H "X-App-Name: nexus" \
  http://localhost:3000/api/second-brain/contacts
```

### Create API Key (via API)
```bash
curl -X POST http://localhost:3000/api/ecosystem/keys \
  -H "Authorization: Bearer USER_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"appName":"nexus"}'
```

---

## 🔐 Security Notes

✅ Master token never changes (use in all apps)
✅ App-specific API keys rotate monthly
✅ Superadmin email cannot be changed
✅ All API calls logged
✅ Health checks every 5 minutes
✅ Rate limit: 100 requests/minute per key

---

## 📋 Superadmin Responsibilities

As superadmin (mraaziqp@gmail.com), you can:

1. **Manage API Keys**
   - Generate keys for new apps
   - Revoke compromised keys
   - Monitor usage per app

2. **Monitor Connected Apps**
   - View health status
   - See error logs
   - Track request counts
   - Monitor consecutive errors

3. **Manage Friends & Contacts**
   - Approve friend requests
   - Sync contacts across apps
   - Block users if needed

4. **View Admin Dashboard**
   - Overall system health
   - All connected apps at a glance
   - API usage metrics

---

## 🚀 Quick Start

1. **Access Admin Dashboard**
   ```
   http://localhost:3000/ecosystem
   Login: mraaziqp@gmail.com
   ```

2. **Generate API Key for Nexus**
   - Click API Keys tab
   - Enter app name: "nexus"
   - Save credentials

3. **Configure Nexus**
   - Add Master Token to `.env`
   - Add API Key to `.env`
   - Restart development server

4. **Test Connection**
   ```bash
   curl http://localhost:3000/api/second-brain/health
   # Should return { "status": "ok", ... }
   ```

---

## 📞 Support

Need help?
- Check `/ecosystem` dashboard for real-time status
- Review `ECOSYSTEM_MASTER_GUIDE.md`
- Test endpoints with curl commands above
- Check logs for API errors

---

**Status**: ✅ Production Ready
**Master Token**: `a7f2e9c4d1b8f3a6e5c2d9f1a4b7e0c3`
**Superadmin**: `mraaziqp@gmail.com`
**Created**: June 2, 2026
