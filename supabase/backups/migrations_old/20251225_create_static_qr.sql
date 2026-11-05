-- Migration: Create Static QR Feature
-- Description: Add static QR codes functionality for generating standalone QR codes (text, URL, WiFi)
-- Date: 2025-12-25

-- =====================================================
-- 1. Create static_qr table
-- =====================================================
CREATE TABLE static_qr (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id), -- Creator
  payload JSONB NOT NULL, -- Stores type and type-specific data (text, url, wifi)
  qr_customize_options JSONB, -- QR styling options (colors, logo, patterns)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- =====================================================
-- 2. Create indexes for performance
-- =====================================================
CREATE INDEX idx_static_qr_org_id ON static_qr(organization_id);
CREATE INDEX idx_static_qr_user_id ON static_qr(user_id);
CREATE INDEX idx_static_qr_deleted_at ON static_qr(deleted_at);
CREATE INDEX idx_static_qr_created_at ON static_qr(created_at DESC);

-- =====================================================
-- 3. Create trigger for updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_static_qr_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_static_qr_updated_at
  BEFORE UPDATE ON static_qr
  FOR EACH ROW
  EXECUTE FUNCTION update_static_qr_updated_at();

-- =====================================================
-- 4. Update organizations table
-- =====================================================
-- Add counter for static QR codes
ALTER TABLE organizations
ADD COLUMN total_static_qr INTEGER DEFAULT 0;

-- =====================================================
-- 5. Update plans table
-- =====================================================
-- Add static QR limits to plans
ALTER TABLE plans
ADD COLUMN max_static_qr_per_org INTEGER DEFAULT 0;

-- Update existing plans with static QR limits
-- Free plan: 1000 static QRs, Premium plan: 1000 static QRs
UPDATE plans SET max_static_qr_per_org = 1000;

-- =====================================================
-- 6. Update org_quotas table
-- =====================================================
-- Add static QR quota tracking
ALTER TABLE org_quotas
ADD COLUMN static_qr INTEGER DEFAULT 0;

-- =====================================================
-- 7. Create function to update organization counter
-- =====================================================
CREATE OR REPLACE FUNCTION update_org_static_qr_counter()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.deleted_at IS NULL THEN
    -- Increment counter on insert
    UPDATE organizations
    SET total_static_qr = total_static_qr + 1
    WHERE id = NEW.organization_id;
  ELSIF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL) THEN
    -- Decrement counter on delete or soft delete
    UPDATE organizations
    SET total_static_qr = GREATEST(total_static_qr - 1, 0)
    WHERE id = COALESCE(OLD.organization_id, NEW.organization_id);
  ELSIF TG_OP = 'UPDATE' AND OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
    -- Increment counter on restore
    UPDATE organizations
    SET total_static_qr = total_static_qr + 1
    WHERE id = NEW.organization_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_org_static_qr_counter
  AFTER INSERT OR UPDATE OR DELETE ON static_qr
  FOR EACH ROW
  EXECUTE FUNCTION update_org_static_qr_counter();

-- =====================================================
-- 8. Comments for documentation
-- =====================================================
COMMENT ON TABLE static_qr IS 'Static QR codes for text, URL, and WiFi. Independent of touch points and campaigns.';
COMMENT ON COLUMN static_qr.payload IS 'JSONB containing type (text|url|wifi) and type-specific data';
COMMENT ON COLUMN static_qr.qr_customize_options IS 'QR styling options including colors, logo, dot patterns, corner styles';
COMMENT ON COLUMN organizations.total_static_qr IS 'Counter for total non-deleted static QR codes in the organization. Updated automatically via trigger.';
COMMENT ON COLUMN plans.max_static_qr_per_org IS 'Maximum number of static QR codes allowed per organization. -1 means unlimited.';
COMMENT ON COLUMN org_quotas.static_qr IS 'Current number of static QR codes used in the organization quota.';
