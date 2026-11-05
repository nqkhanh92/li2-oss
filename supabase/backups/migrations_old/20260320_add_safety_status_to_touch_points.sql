-- Add safety_status to touch_points
-- Values: NULL (not checked / clean), 'flagged' (threat detected, link frozen)
-- NULL = default, no index overhead for clean links
ALTER TABLE touch_points
  ADD COLUMN IF NOT EXISTS safety_status text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS safety_flagged_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS safety_threat_types text[] DEFAULT NULL;

-- Index for re-scan cron: find flagged links quickly
CREATE INDEX IF NOT EXISTS idx_touch_points_safety_status
  ON touch_points (safety_status)
  WHERE safety_status IS NOT NULL;

-- Safety violations log — immutable audit trail
CREATE TABLE IF NOT EXISTS safety_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  touch_point_id uuid NOT NULL REFERENCES touch_points(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  threat_types text[] NOT NULL,
  checked_url text NOT NULL,
  source text NOT NULL DEFAULT 'google_safe_browsing', -- source of detection
  resolved_at timestamptz DEFAULT NULL,                -- admin cleared it
  resolved_by uuid DEFAULT NULL,                       -- admin user id
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_safety_violations_tp_id
  ON safety_violations (touch_point_id);

CREATE INDEX IF NOT EXISTS idx_safety_violations_org_id
  ON safety_violations (organization_id);

-- Comment for documentation
COMMENT ON COLUMN touch_points.safety_status IS 'NULL = clean/unchecked, flagged = threat detected by Google Safe Browsing. Admin-only unfreeze.';
