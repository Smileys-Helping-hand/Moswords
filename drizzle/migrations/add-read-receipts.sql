-- Add read receipt timestamps for better tracking
-- This allows us to show exactly when messages were read (not just whether)

ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP;

-- Also add reaction count caching for performance
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reaction_count INTEGER DEFAULT 0;

-- Add migration tracking
CREATE INDEX IF NOT EXISTS idx_direct_messages_read_at
  ON direct_messages(read_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_read_at
  ON messages(read_at DESC);
