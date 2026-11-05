-- Purpose: Remove duplicate lead rows in conversion_events caused by the
-- pre-existing TOCTOU race between FindExistingLeadEvent and CreateConversionEvent.
-- Keeps the oldest row (MIN created_at, then MIN id as tiebreaker) per dup group.
--
-- Splits lead rows into two groups because touch_point_id is a UUID column
-- and cannot be COALESCE'd to '' (Postgres 22P02). Uses two separate GROUP BYs
-- with the appropriate predicate.
--
-- NOTE: customer_profiles.lead_count is NOT adjusted. Historical overcounts stay.
-- The goal of this migration is to make the unique index creation possible,
-- not to retroactively fix counter drift.
--
-- FK safety: conversion_events.lead_event_id REFERENCES conversion_events(id)
-- ON DELETE SET NULL (see 20251231150852_create_conversion_tracking.sql:117).
-- Deleting a duplicate lead row will null out any referencing sale row's
-- lead_event_id. No pre-flight reparenting required.
--
-- RUN INSTRUCTIONS:
--   1. Execute the diagnostic SELECTs first (wrapped in one transaction).
--   2. If counts look reasonable, run the two DELETE CTEs.
--   3. Verify counts drop to 0 with the same diagnostic SELECTs.
--   4. Commit. Proceed to task-2 only after both counts are 0.

BEGIN;

-- ============================================================================
-- Diagnostic 1: count attributed lead duplicate groups (touch_point_id NOT NULL)
-- Expected shape: each row is a dup group; we delete all but the oldest per group.
-- ============================================================================
SELECT
  'attributed_leads_before' AS label,
  count(*) AS dup_group_count,
  coalesce(sum(dup_count - 1), 0) AS rows_to_delete
FROM (
  SELECT customer_profile_id, touch_point_id, event_name, count(*) AS dup_count
  FROM conversion_events
  WHERE event_type = 'lead' AND touch_point_id IS NOT NULL
  GROUP BY customer_profile_id, touch_point_id, event_name
  HAVING count(*) > 1
) t;

-- ============================================================================
-- Diagnostic 2: count direct lead duplicate groups (touch_point_id IS NULL)
-- ============================================================================
SELECT
  'direct_leads_before' AS label,
  count(*) AS dup_group_count,
  coalesce(sum(dup_count - 1), 0) AS rows_to_delete
FROM (
  SELECT customer_profile_id, event_name, count(*) AS dup_count
  FROM conversion_events
  WHERE event_type = 'lead' AND touch_point_id IS NULL
  GROUP BY customer_profile_id, event_name
  HAVING count(*) > 1
) t;

-- ============================================================================
-- Snapshot: back up all rows that WILL be deleted into a dated backup table.
-- Restore (if needed): INSERT INTO conversion_events
--                        SELECT * FROM conversion_events_bkp_20260417_leaddedup;
-- Drop the backup after 7-14 days once the cleanup is confirmed stable:
--                        DROP TABLE conversion_events_bkp_20260417_leaddedup;
-- ============================================================================
CREATE TABLE conversion_events_bkp_20260417_leaddedup AS
SELECT ce.*
FROM conversion_events ce
WHERE ce.id IN (
  -- Attributed-lead duplicates that would be deleted below
  SELECT id FROM (
    SELECT
      id,
      row_number() OVER (
        PARTITION BY customer_profile_id, touch_point_id, event_name
        ORDER BY created_at ASC, id ASC
      ) AS rn
    FROM conversion_events
    WHERE event_type = 'lead' AND touch_point_id IS NOT NULL
  ) t WHERE rn > 1
  UNION ALL
  -- Direct-lead duplicates that would be deleted below
  SELECT id FROM (
    SELECT
      id,
      row_number() OVER (
        PARTITION BY customer_profile_id, event_name
        ORDER BY created_at ASC, id ASC
      ) AS rn
    FROM conversion_events
    WHERE event_type = 'lead' AND touch_point_id IS NULL
  ) t WHERE rn > 1
);

-- Confirm snapshot row count matches the sum of diagnostic rows_to_delete.
SELECT
  'backup_snapshot_count' AS label,
  count(*) AS rows_backed_up
FROM conversion_events_bkp_20260417_leaddedup;

-- ============================================================================
-- Delete attributed lead duplicates, keeping oldest per group.
-- ============================================================================
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY customer_profile_id, touch_point_id, event_name
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM conversion_events
  WHERE event_type = 'lead' AND touch_point_id IS NOT NULL
)
DELETE FROM conversion_events
WHERE id IN (SELECT id FROM ranked WHERE rn > 1)
RETURNING id;  -- for audit; count of returned rows = deletions

-- ============================================================================
-- Delete direct lead duplicates, keeping oldest per group.
-- ============================================================================
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY customer_profile_id, event_name
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM conversion_events
  WHERE event_type = 'lead' AND touch_point_id IS NULL
)
DELETE FROM conversion_events
WHERE id IN (SELECT id FROM ranked WHERE rn > 1)
RETURNING id;

-- ============================================================================
-- Verification: both counts should now be 0.
-- ============================================================================
SELECT
  'attributed_leads_after' AS label,
  count(*) AS dup_group_count
FROM (
  SELECT 1 FROM conversion_events
  WHERE event_type = 'lead' AND touch_point_id IS NOT NULL
  GROUP BY customer_profile_id, touch_point_id, event_name
  HAVING count(*) > 1
) t;

SELECT
  'direct_leads_after' AS label,
  count(*) AS dup_group_count
FROM (
  SELECT 1 FROM conversion_events
  WHERE event_type = 'lead' AND touch_point_id IS NULL
  GROUP BY customer_profile_id, event_name
  HAVING count(*) > 1
) t;

COMMIT;
