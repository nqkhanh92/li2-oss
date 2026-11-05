-- Migration: Event Rules Schema + Plan Gating
-- Description: Create event_rules table, extend plans and org_quotas, add quota trigger
-- Date: 2026-02-25
-- Phase: 16.1 (Event Rules MVP)

-- =====================================================
-- 1. Create event_rules table
-- =====================================================
CREATE TABLE event_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            VARCHAR(256) NOT NULL,
  description     TEXT,

  -- Matching criteria (all non-null fields must match an interaction)
  selector_path   TEXT,
  element_text    VARCHAR(256),
  element_id      VARCHAR(256),
  element_href    VARCHAR(2048),
  page_path       VARCHAR(2048),

  -- Match configuration
  text_match_mode VARCHAR(16) NOT NULL DEFAULT 'contains',

  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- No duplicate event names per org
  UNIQUE(organization_id, name)
);

CREATE INDEX idx_event_rules_org_active
  ON event_rules(organization_id)
  WHERE is_active = true;

-- RLS
ALTER TABLE event_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON event_rules
  FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 2. Extend plans table
-- =====================================================
ALTER TABLE plans ADD COLUMN IF NOT EXISTS max_event_rules_per_org INTEGER DEFAULT 0;

UPDATE plans SET max_event_rules_per_org = 0  WHERE name ILIKE '%free%';
UPDATE plans SET max_event_rules_per_org = 20 WHERE name ILIKE '%premium%';
UPDATE plans SET max_event_rules_per_org = -1 WHERE name ILIKE '%enterprise%';

-- Add event_tagging to advanced_features_allowed for PREMIUM + ENTERPRISE
UPDATE plans SET advanced_features_allowed = array_append(advanced_features_allowed, 'event_tagging')
WHERE name IN ('PREMIUM', 'PREMIUM TRIAL', 'ENTERPRISE')
  AND NOT ('event_tagging' = ANY(advanced_features_allowed));

-- =====================================================
-- 3. Extend org_quotas table
-- =====================================================
ALTER TABLE org_quotas ADD COLUMN IF NOT EXISTS event_rules INTEGER NOT NULL DEFAULT 0;

-- =====================================================
-- 4. Quota counter trigger
-- =====================================================
CREATE OR REPLACE FUNCTION update_org_quotas_event_rules_counter()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE org_quotas
    SET event_rules = COALESCE(event_rules, 0) + 1
    WHERE org_id = NEW.organization_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE org_quotas
    SET event_rules = GREATEST(COALESCE(event_rules, 0) - 1, 0)
    WHERE org_id = OLD.organization_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_org_quotas_event_rules_counter
  AFTER INSERT OR DELETE ON event_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_org_quotas_event_rules_counter();

COMMENT ON FUNCTION update_org_quotas_event_rules_counter() IS
  'Automatically updates org_quotas.event_rules counter when event rules are created or deleted.';
