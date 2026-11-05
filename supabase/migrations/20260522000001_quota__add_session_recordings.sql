-- Add monthly session recording quota tracking to org_quotas
ALTER TABLE org_quotas
  ADD COLUMN IF NOT EXISTS monthly_session_recordings integer NOT NULL DEFAULT 0;

-- Add per-plan session recording limit to plans
ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS max_session_recordings_per_month integer;

-- Set 5000 session recordings/month for all paid plans (non-t0)
UPDATE plans
SET max_session_recordings_per_month = 5000
WHERE plan_key NOT LIKE '%t0%';
