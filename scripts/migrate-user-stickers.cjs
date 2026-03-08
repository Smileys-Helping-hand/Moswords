const { neon } = require('@neondatabase/serverless');
const db = neon(process.env.DATABASE_URL);
(async () => {
  await db`CREATE TABLE IF NOT EXISTS user_stickers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`;
  await db`CREATE INDEX IF NOT EXISTS idx_user_stickers_user ON user_stickers(user_id, created_at DESC)`;
  console.log('✅ user_stickers table created');
})().catch(e => { console.error(e.message); process.exit(1); });
