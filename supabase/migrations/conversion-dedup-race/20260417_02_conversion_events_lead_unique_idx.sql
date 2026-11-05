-- Purpose: Partial unique indexes on conversion_events for lead dedup.
--
-- Why two indexes and not one?
--   touch_point_id is a UUID column. Postgres UUID columns cannot be compared
--   to empty strings (ERROR 22P02), and COALESCE(uuid_col, '') is rejected for
--   the same reason. The only representation of "no attribution" is NULL.
--   A single unique index on (customer_profile_id, touch_point_id, event_name)
--   would treat NULL as distinct per row (SQL semantics), so direct leads with
--   the same customer + event_name would NOT be deduped. Two partial indexes
--   with explicit NULL / NOT NULL predicates solve this cleanly.
--
-- Why NOT CONCURRENTLY?
--   Supabase SQL editor wraps submissions in a transaction; CREATE INDEX
--   CONCURRENTLY cannot run inside a transaction block. The dev table is
--   small, so the brief ACCESS EXCLUSIVE lock during build is acceptable.
--   For production, run each CREATE statement separately via psql to enable
--   CONCURRENTLY.
--
-- PREREQUISITE: Task 1 cleanup migration completed with both "after"
--   diagnostic queries returning dup_group_count = 0.

-- Attributed leads: (customer_profile_id, touch_point_id, event_name) must be unique
-- when touch_point_id is present (non-NULL).
CREATE UNIQUE INDEX IF NOT EXISTS
  conversion_events_lead_dedup_attributed
  ON conversion_events (customer_profile_id, touch_point_id, event_name)
  WHERE event_type = 'lead' AND touch_point_id IS NOT NULL;

-- Direct leads: (customer_profile_id, event_name) must be unique
-- when touch_point_id is NULL (no link attribution).
CREATE UNIQUE INDEX IF NOT EXISTS
  conversion_events_lead_dedup_direct
  ON conversion_events (customer_profile_id, event_name)
  WHERE event_type = 'lead' AND touch_point_id IS NULL;

-- Post-create: verify both indexes are VALID (indisvalid = true, indisready = true).
SELECT
  i.relname AS index_name,
  idx.indisvalid AS is_valid,
  idx.indisready AS is_ready
FROM pg_class i
JOIN pg_index idx ON idx.indexrelid = i.oid
WHERE i.relname IN (
  'conversion_events_lead_dedup_attributed',
  'conversion_events_lead_dedup_direct'
);
