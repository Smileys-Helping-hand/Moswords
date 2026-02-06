-- Manual migration to convert last_seen from TEXT to TIMESTAMP
-- This handles the type conversion that drizzle-kit push cannot do automatically

-- Step 1: Alter the column type with USING clause
ALTER TABLE users 
ALTER COLUMN last_seen TYPE timestamp 
USING CASE 
  WHEN last_seen = 'offline' OR last_seen IS NULL THEN NOW()
  ELSE NOW()  -- If somehow there's other text, default to now
END;

-- Step 2: Set default value
ALTER TABLE users 
ALTER COLUMN last_seen SET DEFAULT NOW();

-- Step 3: Set NOT NULL constraint
ALTER TABLE users 
ALTER COLUMN last_seen SET NOT NULL;
