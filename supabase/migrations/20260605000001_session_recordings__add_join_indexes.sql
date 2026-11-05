-- Optimize session recordings list query which was timing out for high-traffic orgs.
--
-- Problem 1: JOIN lookup on session_recordings uses session_id as the join key,
-- but the existing idx_srec_org_session_idx leads with organization_id — unusable
-- for nested-loop join lookups by session_id alone.
--
-- Problem 2: The sessions table has no covering index for the recording list query
-- (organization_id + is_bot + started_at + recording_duration_ms filters).

-- Fast join lookup: session_recordings → sessions via session_id
CREATE INDEX IF NOT EXISTS idx_srec_session_chunk
  ON session_recordings (session_id, chunk_index);

-- Covering scan for session recording list:
-- (org, is_bot=false, started_at desc) with recording_duration_ms included
-- Partial index excludes bots so it stays small and tight.
CREATE INDEX IF NOT EXISTS idx_sessions_rec_list
  ON sessions (organization_id, started_at DESC, recording_duration_ms)
  WHERE is_bot = false;
