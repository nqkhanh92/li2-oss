-- Migration: Add ip column to sessions table
-- Description: Stores the client IP address for the session, derived from the first pageview.

ALTER TABLE "public"."sessions" ADD COLUMN IF NOT EXISTS "ip" inet;

-- Update existing sessions if any (optional, but good for consistency if we have data)
-- This might be slow on large tables, so we use a subquery if needed.
-- UPDATE "public"."sessions" s
-- SET ip = (SELECT ip FROM pageviews p WHERE p.session_id = s.session_id ORDER BY timestamp ASC LIMIT 1)
-- WHERE s.ip IS NULL;
