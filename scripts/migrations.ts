/**
 * Additive, idempotent schema migrations.
 *
 * Every statement must be safe to run repeatedly against production
 * (IF NOT EXISTS / DROP NOT NULL only — never drop data). The runner executes
 * each statement on its own, so one failure (for example, an index on a table
 * that production never got) is reported without blocking the rest.
 */
export interface Migration {
  id: string;
  statements: string[];
}

export const migrations: Migration[] = [
  {
    // Production never received these tables (found by the drift report on
    // 2026-09-30). Must run first: later migrations index/alter them.
    id: '2026-09-30-create-missing-tables',
    statements: [
      `CREATE TABLE IF NOT EXISTS message_reactions (
        id text PRIMARY KEY,
        message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user_name text NOT NULL,
        emoji text NOT NULL,
        created_at timestamp NOT NULL DEFAULT now()
      )`,
      `CREATE TABLE IF NOT EXISTS approvals (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        title text NOT NULL,
        description text,
        requested_by text NOT NULL,
        app_source text,
        assigned_to_id uuid REFERENCES users(id) ON DELETE SET NULL,
        decided_by_id uuid REFERENCES users(id) ON DELETE SET NULL,
        status text NOT NULL DEFAULT 'pending',
        priority text NOT NULL DEFAULT 'normal',
        metadata jsonb,
        callback_url text,
        note text,
        created_at timestamp NOT NULL DEFAULT now(),
        decided_at timestamp,
        expires_at timestamp
      )`,
      `CREATE TABLE IF NOT EXISTS friendships (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        friend_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status text NOT NULL DEFAULT 'pending',
        created_at timestamp NOT NULL DEFAULT now(),
        accepted_at timestamp,
        blocked_at timestamp
      )`,
      `CREATE TABLE IF NOT EXISTS contacts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        email text,
        name text NOT NULL,
        phone_number text,
        photo_url text,
        source text NOT NULL,
        email_normalized text,
        phone_normalized text,
        deleted_at timestamp,
        synced_to_apps text[] NOT NULL DEFAULT '{}',
        metadata jsonb,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      )`,
      `CREATE TABLE IF NOT EXISTS ecosystem_api_keys (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        app_name text NOT NULL,
        api_key text NOT NULL UNIQUE,
        key_hash text,
        key_prefix text,
        api_secret text NOT NULL,
        owner_id uuid REFERENCES users(id) ON DELETE CASCADE,
        status text NOT NULL DEFAULT 'active',
        permissions text[] NOT NULL DEFAULT ARRAY['contacts.read','profile.read'],
        webhook_url text,
        rate_limit_per_minute integer NOT NULL DEFAULT 100,
        requests_this_minute integer NOT NULL DEFAULT 0,
        last_reset_time timestamp NOT NULL DEFAULT now(),
        total_requests integer NOT NULL DEFAULT 0,
        metadata jsonb,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now(),
        last_used_at timestamp,
        expires_at timestamp
      )`,
      `CREATE TABLE IF NOT EXISTS connected_apps (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        app_name text NOT NULL,
        api_key_id uuid REFERENCES ecosystem_api_keys(id) ON DELETE SET NULL,
        status text NOT NULL DEFAULT 'connected',
        last_health_check timestamp NOT NULL DEFAULT now(),
        last_error text,
        consecutive_errors integer NOT NULL DEFAULT 0,
        permission_scope text[] NOT NULL DEFAULT ARRAY['contacts','profile'],
        metadata jsonb,
        connected_at timestamp NOT NULL DEFAULT now(),
        disconnected_at timestamp
      )`,
      `CREATE TABLE IF NOT EXISTS api_request_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        api_key_id uuid NOT NULL REFERENCES ecosystem_api_keys(id) ON DELETE CASCADE,
        endpoint text NOT NULL,
        method text NOT NULL,
        status_code integer NOT NULL,
        response_time integer NOT NULL,
        error_message text,
        ip_address text,
        created_at timestamp NOT NULL DEFAULT now()
      )`,
      `CREATE TABLE IF NOT EXISTS admin_users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        email text NOT NULL UNIQUE,
        role text NOT NULL DEFAULT 'admin',
        features text[] NOT NULL DEFAULT ARRAY['can_manage_api_keys','can_manage_users','can_view_audit_logs','can_configure_subdomain','can_manage_contacts'],
        mfa_enabled boolean NOT NULL DEFAULT false,
        mfa_secret text,
        mfa_backup_codes text,
        mfa_email_code text,
        mfa_email_code_expiry timestamp,
        mfa_email_enabled boolean NOT NULL DEFAULT false,
        last_mfa_verified timestamp,
        last_login timestamp,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      )`,
      `CREATE TABLE IF NOT EXISTS audit_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        email text NOT NULL,
        action text NOT NULL,
        resource text NOT NULL,
        resource_id text,
        details jsonb,
        mfa_verified boolean NOT NULL DEFAULT false,
        ip_address text,
        user_agent text,
        created_at timestamp NOT NULL DEFAULT now()
      )`,
    ],
  },
  {
    // Per-user chat organisation: archive, pin and custom folders for DMs and
    // groups. Replaces the old DM "archive", which flipped a flag on the shared
    // message rows and so archived the chat for both people.
    id: '2026-09-30-chat-organisation',
    statements: [
      `CREATE TABLE IF NOT EXISTS chat_folders (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name text NOT NULL,
        position integer NOT NULL DEFAULT 0,
        created_at timestamp NOT NULL DEFAULT now()
      )`,
      `CREATE INDEX IF NOT EXISTS chat_folders_user_idx ON chat_folders (user_id, position)`,
      `CREATE TABLE IF NOT EXISTS chat_preferences (
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        chat_type text NOT NULL,
        chat_id uuid NOT NULL,
        archived boolean NOT NULL DEFAULT false,
        pinned boolean NOT NULL DEFAULT false,
        folder_id uuid REFERENCES chat_folders(id) ON DELETE SET NULL,
        updated_at timestamp NOT NULL DEFAULT now(),
        PRIMARY KEY (user_id, chat_type, chat_id)
      )`,
    ],
  },
  {
    id: '2026-09-28-restore-user-columns',
    statements: [
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_settings jsonb DEFAULT '{}'::jsonb`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS appearance jsonb`,
    ],
  },
  {
    id: '2026-09-28-realtime-tables',
    statements: [
      `CREATE TABLE IF NOT EXISTS rate_limits (
        key text PRIMARY KEY,
        window_start timestamptz NOT NULL DEFAULT now(),
        count integer NOT NULL DEFAULT 0
      )`,
      `CREATE TABLE IF NOT EXISTS typing_states (
        scope text NOT NULL,
        scope_id text NOT NULL,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user_name text,
        updated_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (scope, scope_id, user_id)
      )`,
      `CREATE TABLE IF NOT EXISTS conversation_clears (
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        other_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        cleared_at timestamp NOT NULL DEFAULT now(),
        PRIMARY KEY (user_id, other_user_id)
      )`,
      `ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS read_at timestamp`,
      `ALTER TABLE friends ADD COLUMN IF NOT EXISTS accepted_at timestamp`,
    ],
  },
  {
    id: '2026-09-28-contact-hub',
    statements: [
      `ALTER TABLE contacts ALTER COLUMN email DROP NOT NULL`,
      `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS email_normalized text`,
      `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS phone_normalized text`,
      `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS deleted_at timestamp`,
      `UPDATE contacts SET email_normalized = lower(trim(email))
         WHERE email_normalized IS NULL AND email IS NOT NULL`,
      `ALTER TABLE ecosystem_api_keys ADD COLUMN IF NOT EXISTS key_hash text`,
      `ALTER TABLE ecosystem_api_keys ADD COLUMN IF NOT EXISTS key_prefix text`,
    ],
  },
  {
    // Stop storing working API keys: keep only a SHA-256 hash. api_key is NOT
    // NULL + UNIQUE, so it is overwritten with the hash rather than nulled.
    // Apps keep using the same keys; lookups go through key_hash.
    id: '2026-09-28-hash-ecosystem-keys',
    statements: [
      `UPDATE ecosystem_api_keys
         SET key_hash = encode(sha256(convert_to(api_key, 'UTF8')), 'hex'),
             key_prefix = left(api_key, 10)
       WHERE key_hash IS NULL`,
      `UPDATE ecosystem_api_keys SET api_key = key_hash
       WHERE key_hash IS NOT NULL AND api_key <> key_hash`,
    ],
  },
  {
    // Every chat screen and the sync loop filter on these columns; without
    // indexes each request was a sequential scan of the whole message table.
    id: '2026-09-28-hot-path-indexes',
    statements: [
      `CREATE INDEX IF NOT EXISTS dm_pair_created_idx ON direct_messages (sender_id, receiver_id, created_at)`,
      `CREATE INDEX IF NOT EXISTS dm_receiver_created_idx ON direct_messages (receiver_id, created_at)`,
      `CREATE INDEX IF NOT EXISTS dm_sender_read_at_idx ON direct_messages (sender_id, read_at)`,
      `CREATE INDEX IF NOT EXISTS dm_unread_idx ON direct_messages (receiver_id) WHERE read = false`,
      `CREATE INDEX IF NOT EXISTS gcm_group_created_idx ON group_chat_messages (group_chat_id, created_at)`,
      `CREATE INDEX IF NOT EXISTS messages_channel_created_idx ON messages (channel_id, created_at)`,
      `CREATE INDEX IF NOT EXISTS group_members_user_idx ON group_chat_members (user_id)`,
      `CREATE INDEX IF NOT EXISTS group_members_group_user_idx ON group_chat_members (group_chat_id, user_id)`,
      `CREATE INDEX IF NOT EXISTS server_members_user_idx ON server_members (user_id)`,
      `CREATE INDEX IF NOT EXISTS server_members_server_user_idx ON server_members (server_id, user_id)`,
      `CREATE INDEX IF NOT EXISTS channels_server_idx ON channels (server_id)`,
      `CREATE INDEX IF NOT EXISTS friends_friend_status_idx ON friends (friend_id, status)`,
      `CREATE INDEX IF NOT EXISTS friends_user_status_idx ON friends (user_id, status)`,
      `CREATE INDEX IF NOT EXISTS rtc_signals_to_created_idx ON rtc_signals (to_user_id, created_at)`,
      `CREATE INDEX IF NOT EXISTS rtc_signals_call_idx ON rtc_signals (call_id)`,
      `CREATE INDEX IF NOT EXISTS reactions_message_idx ON message_reactions (message_id)`,
      `CREATE INDEX IF NOT EXISTS contacts_user_updated_idx ON contacts (user_id, updated_at)`,
      `CREATE INDEX IF NOT EXISTS contacts_user_email_idx ON contacts (user_id, email_normalized)`,
      `CREATE INDEX IF NOT EXISTS contacts_user_phone_idx ON contacts (user_id, phone_normalized)`,
      `CREATE INDEX IF NOT EXISTS typing_scope_idx ON typing_states (scope, scope_id, updated_at)`,
      `CREATE INDEX IF NOT EXISTS users_email_lower_idx ON users (lower(email))`,
      `CREATE INDEX IF NOT EXISTS eco_keys_hash_idx ON ecosystem_api_keys (key_hash)`,
    ],
  },
  {
    // Message search (ILIKE '%q%') uses trigram indexes once tables grow.
    id: '2026-09-29-search-indexes',
    statements: [
      `CREATE EXTENSION IF NOT EXISTS pg_trgm`,
      `CREATE INDEX IF NOT EXISTS dm_content_trgm_idx ON direct_messages USING gin (content gin_trgm_ops) WHERE is_encrypted = false`,
      `CREATE INDEX IF NOT EXISTS gcm_content_trgm_idx ON group_chat_messages USING gin (content gin_trgm_ops) WHERE is_encrypted = false`,
      `CREATE INDEX IF NOT EXISTS messages_content_trgm_idx ON messages USING gin (content gin_trgm_ops) WHERE is_encrypted = false`,
    ],
  },
];
