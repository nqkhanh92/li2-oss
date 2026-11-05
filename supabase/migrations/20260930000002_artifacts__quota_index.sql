-- An index for the quota count, and nothing else.
--
-- A SEPARATE file from 20260930000001_artifacts__multiformat.sql on purpose: that one may already
-- have been applied on LiHi, and a migration that has run is a migration that must not change.
-- Editing it in place would leave two environments describing different schemas under one filename,
-- which is the shape of problem this feature has already paid for once.

-- ============================================
-- QUOTA: count live artifacts per organization
-- ============================================
-- publish() enforces `count(*) where organization_id = $1 and status = 'live'`. The index created
-- with the table is (organization_id, created_at DESC), which orders a listing and cannot serve a
-- filter on status. Without this one, the count degrades to a scan of every artifact the org has.
--
-- IF NOT EXISTS so this is re-runnable.

CREATE INDEX IF NOT EXISTS "idx_artifacts_organization_id_status"
  ON "public"."artifacts" USING "btree" ("organization_id", "status");
