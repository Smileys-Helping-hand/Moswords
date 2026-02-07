-- ========================================
-- EMERGENCY DATABASE FIX: Add Missing User Columns
-- ========================================
-- This script adds all missing columns to the users table.
-- Run this directly in the Neon SQL Editor if drizzle-kit push fails.
--
-- HOW TO USE:
-- 1. Go to: https://console.neon.tech/
-- 2. Select your project
-- 3. Go to "SQL Editor"
-- 4. Paste this entire script
-- 5. Click "Run"
--
-- This is SAFE to run multiple times (uses IF NOT EXISTS).
-- ========================================

-- Add missing columns to users table
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_pro BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS custom_status TEXT DEFAULT 'Just joined!',
  ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'obsidian',
  ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Update existing rows to have default values if they're NULL
UPDATE users 
SET 
  points = COALESCE(points, 0),
  is_pro = COALESCE(is_pro, FALSE),
  custom_status = COALESCE(custom_status, 'Just joined!'),
  theme_preference = COALESCE(theme_preference, 'obsidian'),
  last_seen = COALESCE(last_seen, NOW())
WHERE 
  points IS NULL 
  OR is_pro IS NULL 
  OR custom_status IS NULL 
  OR theme_preference IS NULL 
  OR last_seen IS NULL;

-- Verify the columns exist
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
