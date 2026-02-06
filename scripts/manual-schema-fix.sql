-- MANUAL SQL FALLBACK FOR NEON CONSOLE
-- Run this in Neon Dashboard -> SQL Editor if automated sync fails

-- Add missing columns to users table (IF NOT EXISTS prevents errors if columns already exist)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS is_pro BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN IF NOT EXISTS custom_status TEXT DEFAULT 'Just joined!',
ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'obsidian',
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP DEFAULT NOW() NOT NULL,
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Verify columns were added
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- EXPLANATION:
-- This command adds all 6 critical columns if they're missing.
-- Using "IF NOT EXISTS" means you can run this safely multiple times.
-- The SELECT query at the end lets you verify all columns exist.
