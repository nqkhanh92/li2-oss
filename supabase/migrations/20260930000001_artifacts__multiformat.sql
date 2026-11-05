-- Artifacts go multi-format: HTML, PDF, PowerPoint and video, 10MB per upload.
--
-- Everything here EDITS what 20260928000001_artifacts__create.sql already created. That file must
-- not be touched — it has already been applied on LiHi, so changing it in place would leave the two
-- environments describing different schemas with the same filename.

-- ============================================
-- STORAGE: widen the artifact-content bucket
-- ============================================
-- UPDATE, not `INSERT ... ON CONFLICT DO NOTHING`.
--
-- The bucket already exists wherever the previous migration ran, so an INSERT would hit the
-- conflict, do nothing, and report success — leaving the limit at 5MB and the whitelist at
-- text/html while TypeScript believes otherwise. That is the exact failure this feature already
-- shipped once (see the `; charset=utf-8` incident in log.md): two sources that disagree, and the
-- disagreement only surfaces as a 500 on a real upload.
--
-- The WHERE clause means a fresh environment where the previous migration has NOT run updates zero
-- rows and stays silent. That is correct: migrations run in filename order, so 20260928000001 has
-- always created the bucket by the time this runs.
--
-- allowed_mime_types is matched by Supabase Storage against the WHOLE Content-Type string, so every
-- entry here is BARE — no `; charset=utf-8`. Keep this list identical to ARTIFACT_STORAGE_MIMES in
-- src/core/types/artifact.type.ts; a contract test compares the two and fails if they drift.
UPDATE storage.buckets
SET
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY[
    'text/html',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
WHERE id = 'artifact-content';

-- ============================================
-- TABLE: widen artifacts_kind_check
-- ============================================
-- 'slides' and 'video' join the vocabulary. 'markdown' and 'site' stay: they have no upload path
-- yet, but narrowing a CHECK is a migration nobody remembers to write either, and the frontend
-- already maps the full list.
--
-- DROP then ADD rather than ALTER: Postgres has no syntax for editing a CHECK in place. IF EXISTS
-- on the drop so this is re-runnable against a database where it has already been applied.

ALTER TABLE "public"."artifacts"
  DROP CONSTRAINT IF EXISTS "artifacts_kind_check";

ALTER TABLE "public"."artifacts"
  ADD CONSTRAINT "artifacts_kind_check"
  CHECK ("kind" IN ('html', 'markdown', 'pdf', 'site', 'slides', 'video'));

-- artifacts_status_check is deliberately NOT touched: the status vocabulary is unchanged.
