-- Add FK from session_recordings to sessions for referential integrity
-- and to enable PostgREST relationship joins.

ALTER TABLE "public"."session_recordings"
  ADD CONSTRAINT fk_session_recordings_session_id
  FOREIGN KEY ("session_id")
  REFERENCES "public"."sessions" ("session_id")
  ON DELETE CASCADE;
