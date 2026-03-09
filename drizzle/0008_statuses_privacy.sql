-- Add privacy_settings JSONB column to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_settings jsonb DEFAULT '{}'::jsonb;

-- User statuses (WhatsApp-style 24-hour stories)
CREATE TABLE IF NOT EXISTS user_statuses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  media_url text,
  media_type text NOT NULL DEFAULT 'image',
  caption text,
  background_color text DEFAULT '#1a1a2e',
  created_at timestamp NOT NULL DEFAULT now(),
  expires_at timestamp NOT NULL
);

-- Track who viewed each status
CREATE TABLE IF NOT EXISTS status_views (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  status_id uuid NOT NULL REFERENCES user_statuses(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewed_at timestamp NOT NULL DEFAULT now(),
  UNIQUE (status_id, viewer_id)
);

CREATE INDEX IF NOT EXISTS idx_user_statuses_user_id ON user_statuses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_statuses_expires_at ON user_statuses(expires_at);
CREATE INDEX IF NOT EXISTS idx_status_views_status_id ON status_views(status_id);
CREATE INDEX IF NOT EXISTS idx_status_views_viewer_id ON status_views(viewer_id);
