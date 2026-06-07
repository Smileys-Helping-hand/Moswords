-- Add indexes for common query patterns to improve performance
-- These indexes significantly speed up filtering, sorting, and joining

-- Direct messages indexes
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender_created
  ON direct_messages(sender_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_direct_messages_receiver_created
  ON direct_messages(receiver_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_direct_messages_conversation
  ON direct_messages(sender_id, receiver_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_direct_messages_read
  ON direct_messages(receiver_id, read);

-- Messages (channel messages) indexes
CREATE INDEX IF NOT EXISTS idx_messages_channel_created
  ON messages(channel_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_user_created
  ON messages(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_created
  ON messages(created_at DESC);

-- Message reactions indexes
CREATE INDEX IF NOT EXISTS idx_message_reactions_message
  ON message_reactions(message_id);

CREATE INDEX IF NOT EXISTS idx_message_reactions_user
  ON message_reactions(user_id);

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email
  ON users(email);

CREATE INDEX IF NOT EXISTS idx_users_last_seen
  ON users(last_seen DESC);

-- Channels indexes
CREATE INDEX IF NOT EXISTS idx_channels_server
  ON channels(server_id);

-- Server members indexes
CREATE INDEX IF NOT EXISTS idx_server_members_server
  ON server_members(server_id);

CREATE INDEX IF NOT EXISTS idx_server_members_user
  ON server_members(user_id);

CREATE INDEX IF NOT EXISTS idx_server_members_server_user
  ON server_members(server_id, user_id);

-- Friends indexes
CREATE INDEX IF NOT EXISTS idx_friends_user_status
  ON friends(user_id, status);

CREATE INDEX IF NOT EXISTS idx_friends_friend_status
  ON friends(friend_id, status);
