-- ============================================================
-- Dashboards feature schema
-- Phase 2a: Dashboard Core
-- ============================================================

-- 1. dashboards table
CREATE TABLE dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  name VARCHAR(256) NOT NULL,
  access_mode TEXT NOT NULL DEFAULT 'only_me',
  default_role TEXT NOT NULL DEFAULT 'viewer',
  template_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dashboards_org ON dashboards(organization_id);
CREATE INDEX idx_dashboards_owner ON dashboards(organization_id, created_by);

ALTER TABLE dashboards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON dashboards FOR ALL USING (true) WITH CHECK (true);

-- 2. dashboard_widgets table
CREATE TABLE dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
  name VARCHAR(256) NOT NULL,
  widget_type TEXT NOT NULL DEFAULT 'standard',
  config JSONB NOT NULL,
  formula_config JSONB,
  position JSONB NOT NULL DEFAULT '{"x":0,"y":0,"w":1,"h":1}'::jsonb,
  date_override JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dashboard_widgets_dashboard ON dashboard_widgets(dashboard_id);

ALTER TABLE dashboard_widgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON dashboard_widgets FOR ALL USING (true) WITH CHECK (true);

-- 3. dashboard_members table (prep for Phase 2c — Sharing)
-- Created now but not populated in Phase 2a. All dashboards are "Only Me".
CREATE TABLE dashboard_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  role TEXT NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(dashboard_id, user_id)
);

CREATE INDEX idx_dashboard_members_dashboard ON dashboard_members(dashboard_id);
CREATE INDEX idx_dashboard_members_user ON dashboard_members(user_id);

ALTER TABLE dashboard_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON dashboard_members FOR ALL USING (true) WITH CHECK (true);

-- 4. dashboard_pins table (per-user pinning)
CREATE TABLE dashboard_pins (
  dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (dashboard_id, user_id)
);

ALTER TABLE dashboard_pins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON dashboard_pins FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 5. Plan limits
-- =====================================================
ALTER TABLE plans ADD COLUMN IF NOT EXISTS max_dashboards_per_org INTEGER DEFAULT 3;
UPDATE plans SET max_dashboards_per_org = 3  WHERE plan_key = 't0';
UPDATE plans SET max_dashboards_per_org = 3  WHERE plan_key = 't0_trial';
UPDATE plans SET max_dashboards_per_org = 20 WHERE plan_key = 't1';
UPDATE plans SET max_dashboards_per_org = 20 WHERE plan_key = 't1_trial';
UPDATE plans SET max_dashboards_per_org = -1 WHERE plan_key = 't2';

-- =====================================================
-- 6. Org quota counter
-- =====================================================
ALTER TABLE org_quotas ADD COLUMN IF NOT EXISTS dashboards INTEGER NOT NULL DEFAULT 0;

-- =====================================================
-- 7. Quota trigger — increment/decrement on dashboard insert/delete
-- Follows the same pattern as collections and event_rules triggers.
-- =====================================================
CREATE OR REPLACE FUNCTION update_org_quotas_dashboards_counter()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE org_quotas
    SET dashboards = COALESCE(dashboards, 0) + 1
    WHERE org_id = NEW.organization_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE org_quotas
    SET dashboards = GREATEST(COALESCE(dashboards, 0) - 1, 0)
    WHERE org_id = OLD.organization_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_dashboards_quota
  AFTER INSERT OR DELETE ON dashboards
  FOR EACH ROW
  EXECUTE FUNCTION update_org_quotas_dashboards_counter();

COMMENT ON FUNCTION update_org_quotas_dashboards_counter() IS 'Automatically updates org_quotas.dashboards counter when dashboards are created or deleted. Handles NULL values and prevents negative counts.';
