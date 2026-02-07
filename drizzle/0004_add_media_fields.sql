-- Add media fields to messages tables
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_type TEXT;

ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS media_type TEXT;

ALTER TABLE group_chat_messages ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE group_chat_messages ADD COLUMN IF NOT EXISTS media_type TEXT;
