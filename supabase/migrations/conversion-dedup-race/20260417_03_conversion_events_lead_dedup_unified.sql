-- Unified lead dedup index (supersedes migration 02)
--
-- Why we changed course:
--   Migration 02 created two partial unique indexes — one for attributed leads
--   (touch_point_id IS NOT NULL) and one for direct leads (touch_point_id IS NULL).
--   Postgres ON CONFLICT can only target ONE partial index per statement, and the
--   WHERE predicate in the INSERT must match the index's predicate EXACTLY.
--   That forced either (a) two code paths in Go depending on tp_id nullness, or
--   (b) this unified expression index.
--
--   Using COALESCE(touch_point_id::text, 'DIRECT') collapses both cases into a
--   single index that a single ON CONFLICT clause can target. Cast to ::text first
--   so the COALESCE sentinel is type-compatible (UUID columns reject empty strings
--   and can't COALESCE to a non-UUID literal directly — see memory
--   feedback_postgres_uuid_empty_string).
--
-- Run this in the Supabase SQL editor. Safe to re-run — DROP/CREATE both use IF (NOT) EXISTS.

BEGIN;

DROP INDEX IF EXISTS conversion_events_lead_dedup_attributed;
DROP INDEX IF EXISTS conversion_events_lead_dedup_direct;

CREATE UNIQUE INDEX IF NOT EXISTS
  conversion_events_lead_dedup
  ON conversion_events (
    customer_profile_id,
    COALESCE(touch_point_id::text, 'DIRECT'),
    event_name
  )
  WHERE event_type = 'lead';

COMMIT;

-- Verification — must show indisvalid=true, indisready=true, one row
SELECT
  i.relname AS index_name,
  idx.indisvalid AS is_valid,
  idx.indisready AS is_ready,
  pg_get_indexdef(idx.indexrelid) AS ddl
FROM pg_class i
JOIN pg_index idx ON idx.indexrelid = i.oid
WHERE i.relname IN (
  'conversion_events_lead_dedup',
  'conversion_events_lead_dedup_attributed',
  'conversion_events_lead_dedup_direct'
);
