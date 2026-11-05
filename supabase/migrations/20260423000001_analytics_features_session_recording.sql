-- Add session_recording field to analytics_settings.features JSONB
-- Backfill existing rows that don't have it, and update the column default.

UPDATE "public"."analytics_settings"
SET features = features || '{"session_recording": false}'::jsonb
WHERE features -> 'session_recording' IS NULL;

ALTER TABLE "public"."analytics_settings"
  ALTER COLUMN features SET DEFAULT '{
    "pageview_tracking": true,
    "click_tracking": true,
    "scroll_tracking": true,
    "form_tracking": true,
    "outbound_tracking": false,
    "visibility_tracking": false,
    "session_recording": false
  }'::jsonb;
