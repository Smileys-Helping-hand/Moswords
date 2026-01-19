-- Ensure friend pairs cannot be duplicated in the same direction
-- (A->B and B->A are still allowed by design)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'friends_user_friend_unique'
  ) THEN
    CREATE UNIQUE INDEX friends_user_friend_unique ON friends (user_id, friend_id);
  END IF;
END $$;
