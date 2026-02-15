-- Add E2E encryption fields to message tables
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS content_nonce text,
  ADD COLUMN IF NOT EXISTS is_encrypted boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS media_encrypted boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS media_nonce text;

ALTER TABLE direct_messages
  ADD COLUMN IF NOT EXISTS content_nonce text,
  ADD COLUMN IF NOT EXISTS is_encrypted boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS media_encrypted boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS media_nonce text;

ALTER TABLE group_chat_messages
  ADD COLUMN IF NOT EXISTS content_nonce text,
  ADD COLUMN IF NOT EXISTS is_encrypted boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS media_encrypted boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS media_nonce text;

-- Device keys for E2E
CREATE TABLE IF NOT EXISTS device_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  public_key text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  last_seen timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS device_keys_user_device_unique
  ON device_keys(user_id, device_id);

-- Conversation key envelopes per device
CREATE TABLE IF NOT EXISTS conversation_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL,
  scope_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  encrypted_key text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS conversation_keys_scope_device_unique
  ON conversation_keys(scope, scope_id, device_id);
