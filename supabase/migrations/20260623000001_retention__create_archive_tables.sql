-- Create archive tables for per-org data retention cleanup.
-- t1+ orgs (PRO, Enterprise) have their expired rows moved here instead of hard deleted.
-- These are plain non-partitioned tables so existing queries/RPCs are unaffected.

CREATE TABLE IF NOT EXISTS interactions_archive (LIKE interactions INCLUDING ALL);
ALTER TABLE interactions_archive ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS pageviews_archive (LIKE pageviews INCLUDING ALL);
ALTER TABLE pageviews_archive ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS session_recordings_archive (LIKE session_recordings INCLUDING ALL);
ALTER TABLE session_recordings_archive ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS visits_archive (LIKE visits INCLUDING ALL);
ALTER TABLE visits_archive ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
