-- Add appearance column to users table for theme/accent preferences
-- This migration is safe to run multiple times (IF NOT EXISTS)

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'appearance'
    ) THEN
        ALTER TABLE users ADD COLUMN appearance jsonb DEFAULT NULL;
    END IF;
END $$;
