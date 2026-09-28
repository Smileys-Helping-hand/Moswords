# 🚨 DATABASE FIX - STEP BY STEP GUIDE

## The Problem
Your app crashes with "Failed Query" because your database is missing columns that exist in your code.

**Think of it like this:**
- 📋 **Code (Menu):** Offers "Lobster" (points, is_pro, etc.)
- 🍴 **Database (Kitchen):** Doesn't have Lobster yet
- 💥 **Result:** Order fails with error

---

## ✅ SOLUTION: 3 Methods (Pick One)

### **METHOD 1: Automatic CLI Push (Recommended)**

Run this command in your terminal:

\`\`\`powershell
npm run db:push
\`\`\`

**Expected Output:**
\`\`\`
✓ Applying changes...
✓ Done!
\`\`\`

If this works, you're done! Test your sign-up form.

---

### **METHOD 2: Manual SQL in Neon Console (If CLI Fails)**

1. **Go to Neon Dashboard:**
   - Visit: https://console.neon.tech/
   - Log in with your account
   - Select your project

2. **Open SQL Editor:**
   - Click "SQL Editor" in the left sidebar

3. **Run the Fix:**
   - Open the file: `drizzle/manual_fix_users_table.sql`
   - Copy the ENTIRE contents
   - Paste into the Neon SQL Editor
   - Click "Run" button

4. **Verify Success:**
   - You should see output showing the columns were added
   - The last SELECT statement will show all columns

---

### **METHOD 3: Quick One-Liner (Emergency Fix)**

If you just want to fix it NOW, paste this into Neon SQL Editor:

\`\`\`sql
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_pro BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS custom_status TEXT DEFAULT 'Just joined!',
  ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'obsidian',
  ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS display_name TEXT;
\`\`\`

---

## 🧪 Test the Fix

After running ANY of the above methods:

1. Restart your Next.js dev server (Ctrl+C, then `npm run dev`)
2. Go to your sign-up page
3. Try creating a new account
4. ✅ It should work without errors!

---

## 🔍 Why This Happened

Your schema file (`src/lib/schema.ts`) was updated with new columns, but the database wasn't synced. This happens when:

- You pull changes from git but don't run migrations
- The `db:push` command failed silently
- Environment variables weren't loaded properly

The SQL script forces the database to match your code.

---

## 📋 What Was Added

These columns are now in your `users` table:

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `points` | INTEGER | 0 | User reward points |
| `is_pro` | BOOLEAN | false | Premium membership status |
| `custom_status` | TEXT | 'Just joined!' | User's custom status |
| `theme_preference` | TEXT | 'obsidian' | UI theme choice |
| `last_seen` | TIMESTAMP | NOW() | Last activity time |
| `photo_url` | TEXT | NULL | Profile picture URL |
| `display_name` | TEXT | NULL | User's display name |

---

## ❓ Still Having Issues?

If the error persists:

1. Check your `.env.local` file has `DATABASE_URL` set correctly
2. Make sure your Neon database is active (not suspended)
3. Try logging the exact error message
4. Verify you're connected to the correct database

---

**After fixing, you can delete this file. It's just a guide.**
