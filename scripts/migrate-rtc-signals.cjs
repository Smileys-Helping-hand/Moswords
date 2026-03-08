const { neon } = require('@neondatabase/serverless');

const db = neon(process.env.DATABASE_URL);

(async () => {
  try {
    await db`
      CREATE TABLE IF NOT EXISTS rtc_signals (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        payload TEXT NOT NULL,
        call_id TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    await db`
      CREATE INDEX IF NOT EXISTS idx_rtc_signals_to_user
        ON rtc_signals(to_user_id, created_at DESC)
    `;
    console.log('✅ rtc_signals table created');
  } catch (e) {
    console.error('Migration error:', e.message);
    process.exit(1);
  }
})();
