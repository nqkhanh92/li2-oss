-- Migration: Move session_recordings.events to Supabase Storage
-- Creates the private org-recordings bucket, adds storage_path column,
-- and drops the events JSONB column.

-- ============================================
-- STORAGE: Create private org-recordings bucket
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'org-recordings',
  'org-recordings',
  false,
  524288,
  ARRAY['application/gzip']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- TABLE: Add storage_path, drop events
-- ============================================
-- ADD COLUMN / DROP COLUMN on a partitioned parent automatically
-- propagates to all child partitions (session_recordings_2026_04, etc.)

ALTER TABLE "public"."session_recordings"
  ADD COLUMN "storage_path" text NOT NULL DEFAULT '';

ALTER TABLE "public"."session_recordings"
  DROP COLUMN "events";
