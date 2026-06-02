# 🚀 Moswords Vercel Deployment Guide
## Second Brain Hub at `api.awechat.co.za`

**Date**: June 2, 2026  
**Status**: Ready to Deploy  
**Custom Domain**: `api.awechat.co.za`

---

## 📋 Prerequisites

- ✅ Moswords app ready (built & tested)
- ✅ Vercel account (free tier works)
- ✅ `awechat.co.za` domain with DNS access
- ✅ Neon PostgreSQL database (already configured)
- ✅ Environment variables ready

---

## 🎯 Step-by-Step Deployment

### **Step 1: Push to GitHub**

If not already done:
```bash
cd k:\Projects\moswords
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

---

### **Step 2: Connect to Vercel**

1. Go to [vercel.com](https://vercel.com)
2. Click **"Add New"** → **"Project"**
3. Import your GitHub repo `moswords`
4. Click **"Import"**

---

### **Step 3: Set Environment Variables**

In Vercel dashboard, go to **Settings** → **Environment Variables** and add:

```
DATABASE_URL = postgresql://neondb_owner:npg_ivaebn9r2GVp@ep-purple-wave-abqmp0jf-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require

NEXTAUTH_SECRET = kzDV/lrdTUjaUo5xNmI30slVIsQVepUp4bDw0xBpmQ4=

NEXTAUTH_URL = https://api.awechat.co.za

SECOND_BRAIN_API_URL = https://api.awechat.co.za

SECOND_BRAIN_API_KEY = a7f2e9c4d1b8f3a6e5c2d9f1a4b7e0c3

NEXT_PUBLIC_LIVEKIT_URL = wss://moswords-ia9e9eme.livekit.cloud

LIVEKIT_API_KEY = APIhxiPFBEjr7DG

LIVEKIT_API_SECRET = k1APZWufPeajGjdACcE63JOMyQIMuLsZI7rwB2wRePFA

BLOB_READ_WRITE_TOKEN = your-vercel-blob-token-here

NEXT_PUBLIC_GIPHY_API_KEY = wbl6xhVqd3PMU4qnfzRczKZBOm35FHd5
```

⚠️ **NOTE**: Set these as **Production** environment variables (not Preview)

---

### **Step 4: Deploy**

1. Click **"Deploy"** button
2. Wait for build to complete (usually 2-3 minutes)
3. Once deployed, you'll get a Vercel URL: `moswords-xxxxx.vercel.app`

---

### **Step 5: Add Custom Domain**

#### **In Vercel Dashboard:**

1. Go to your project → **Settings** → **Domains**
2. Click **"Add Domain"**
3. Enter: `api.awechat.co.za`
4. Click **"Add"**
5. You'll see DNS instructions

#### **In Your Domain Provider** (where you bought awechat.co.za):

1. Go to DNS settings for `awechat.co.za`
2. Add a **CNAME** record:
   ```
   Name: api
   Type: CNAME
   Value: cname.vercel-dns.com.
   ```

3. **Save** the DNS record
4. Wait 5-30 minutes for DNS to propagate

#### **Verify in Vercel:**

Once DNS propagates, Vercel will automatically issue an SSL certificate and Moswords will be live at:
```
✅ https://api.awechat.co.za
```

---

## ✅ Post-Deployment

### **Test the Deployment**

```bash
# Health check
curl https://api.awechat.co.za/api/second-brain/health

# Verify user (with master token)
curl -H "Authorization: Bearer a7f2e9c4d1b8f3a6e5c2d9f1a4b7e0c3" \
  https://api.awechat.co.za/api/second-brain/auth/me

# Get contacts
curl -H "Authorization: Bearer a7f2e9c4d1b8f3a6e5c2d9f1a4b7e0c3" \
  https://api.awechat.co.za/api/second-brain/contacts
```

All should return JSON responses.

---

## 📱 Update Connected Apps

After deployment, update all apps to use the production URL:

### **awechat.co.za** (already deployed)
```env
SECOND_BRAIN_API_URL=https://api.awechat.co.za
SECOND_BRAIN_MASTER_TOKEN=a7f2e9c4d1b8f3a6e5c2d9f1a4b7e0c3
```

### **Nexus** (when deploying)
```env
REACT_APP_SECOND_BRAIN_API_URL=https://api.awechat.co.za
REACT_APP_SECOND_BRAIN_MASTER_TOKEN=a7f2e9c4d1b8f3a6e5c2d9f1a4b7e0c3
```

### **FinancePlay, LifeStack** (when deploying)
Same format as above.

---

## 🔐 Important Security Notes

⚠️ **NEVER commit `.env.local` to GitHub**
- Vercel uses the environment variables you set in dashboard
- GitHub only needs the app code

✅ **Master Token Security**
- Keep `a7f2e9c4d1b8f3a6e5c2d9f1a4b7e0c3` secure
- Only share with trusted developers
- Rotate if compromised

✅ **Database URL**
- The Neon database URL is secure (already encrypted in Vercel)
- Only accessible from Vercel deployment

---

## 🆘 Troubleshooting

### **Domain not resolving?**
- Wait 5-30 minutes for DNS propagation
- Check: `nslookup api.awechat.co.za`
- Verify CNAME record in domain provider

### **SSL certificate not issued?**
- Remove and re-add domain in Vercel
- Make sure CNAME record is correct
- Wait another 10 minutes

### **API returning errors?**
- Check Vercel logs: **Deployments** → **Current** → **Build Logs**
- Verify all environment variables are set
- Check DATABASE_URL is correct

### **Master Token not working?**
- Make sure `Authorization: Bearer a7f2e9c4d1b8f3a6e5c2d9f1a4b7e0c3` format
- Check SECOND_BRAIN_API_KEY matches in .env.local
- Test health endpoint first

---

## 📊 Verify Deployment

Once live, check:

✅ Health endpoint: `https://api.awechat.co.za/api/second-brain/health`
✅ Auth endpoint: `https://api.awechat.co.za/api/second-brain/auth/me`
✅ Admin dashboard: `https://api.awechat.co.za/ecosystem`
✅ API endpoints: All CRUD operations working
✅ Database: Connected and querying
✅ SSL certificate: Green lock icon in browser

---

## 🎊 You're Live!

Your Second Brain ecosystem is now deployed at:

```
🧠 API Hub: https://api.awechat.co.za
💬 awechat: https://awechat.co.za
```

All connected apps now use:
```env
SECOND_BRAIN_API_URL=https://api.awechat.co.za
SECOND_BRAIN_MASTER_TOKEN=a7f2e9c4d1b8f3a6e5c2d9f1a4b7e0c3
```

---

## 📞 Support

Issues during deployment?
- Check Vercel build logs
- Review this guide
- Test with curl commands
- Check domain DNS status

---

**Status**: ✅ Ready to Deploy  
**Next Step**: Push to GitHub and connect to Vercel  
**Timeline**: 5-10 minutes from now

🚀 Let's go!
