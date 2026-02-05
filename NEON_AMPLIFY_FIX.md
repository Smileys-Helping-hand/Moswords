# 🔧 Fix Neon Database Issues on AWS Amplify

## Your Neon Database
```
postgresql://neondb_owner:npg_ivaebn9r2GVp@ep-purple-wave-abqmp0jf-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require
```

## ⚠️ Common Neon + AWS Amplify Issues

### Problem 1: Missing Environment Variables
AWS Amplify **does NOT** read your local `.env.local` file. You MUST add them manually.

### Problem 2: Connection String Format
Neon pooler connections sometimes need adjustments for serverless environments.

## ✅ SOLUTION: Add These to AWS Amplify

1. **Go to AWS Amplify Console**
   - https://console.aws.amazon.com/amplify
   - Select your app
   - Click **"Environment variables"**

2. **Add ALL THREE variables:**

```
NEXTAUTH_SECRET=IB8mmrLxGVuEP1F6x94aiacdQ0Z3T6di8a35S8hSTLw=

NEXTAUTH_URL=https://main.d3lo4qcwjjczdwhr.amplifyapp.com

DATABASE_URL=postgresql://neondb_owner:npg_ivaebn9r2GVp@ep-purple-wave-abqmp0jf-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require
```

3. **Click "Save"**

4. **Redeploy:**
   - Go to your app in Amplify
   - Click "Redeploy this version"

## 🔍 If Still Having Issues with Neon

### Option A: Use Direct Connection (Not Pooler)
Some apps work better with direct connection. In Neon console:
- Click "Connection Details"
- Select **"Direct connection"** instead of "Pooled connection"
- Copy that URL instead

### Option B: Check Neon Project Status
- Go to https://console.neon.tech
- Verify your project is **Active** (not suspended)
- Check if you've hit connection limits on free tier

### Option C: Enable Neon IP Allowlist
If you have IP restrictions:
- In Neon console → Settings → IP Allow
- Make sure AWS IP ranges are allowed (or disable IP restrictions)

## 📊 Test After Deploy

Visit: `https://main.d3lo4qcwjjczdwhr.amplifyapp.com/api/health`

This should show:
```json
{
  "status": "ok",
  "database": "connected",
  "hasDatabase": true
}
```

## 🆘 For Your Other App Too

Apply the SAME fix:
1. Find the DATABASE_URL in that app's `.env.local`
2. Add it to that app's hosting environment variables
3. Add NEXTAUTH_SECRET and NEXTAUTH_URL too
4. Redeploy

**The issue is NOT Neon itself - it's that environment variables aren't being passed to production!**
