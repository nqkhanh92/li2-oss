-- Migration: Create Collections Feature
-- Description: Add collections functionality for organizing touch-points with team-based access control
-- Date: 2025-11-05
-- Note: Authorization is handled in the application layer via the permission system

-- =====================================================
-- 1. Create collections table
-- =====================================================
CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id), -- Creator
  org_permission TEXT NOT NULL DEFAULT 'can_edit' CHECK (org_permission IN ('can_edit', 'can_view', 'no_access')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- =====================================================
-- 2. Create collection_members table
-- =====================================================
CREATE TABLE collection_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer', 'no_access')),
  added_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(collection_id, user_id)
);

-- =====================================================
-- 3. Add collection_id to touch_points
-- =====================================================
-- Each touch-point can belong to one collection (or none)
ALTER TABLE touch_points
ADD COLUMN collection_id UUID REFERENCES collections(id) ON DELETE SET NULL;

-- =====================================================
-- 4. Update organizations table
-- =====================================================
-- Add counter for collections
ALTER TABLE organizations
ADD COLUMN total_collections INTEGER DEFAULT 0;

-- =====================================================
-- 5. Update plans table
-- =====================================================
-- Add collection limits to plans
ALTER TABLE plans
ADD COLUMN max_collections_per_org INTEGER DEFAULT 0;

-- Update existing plans with collection limits
-- Free plan: 0 collections, Premium plan: 10 collections
-- Note: Adjust these values based on your actual plan names if different
UPDATE plans SET max_collections_per_org = 0 WHERE name = 'Free' OR name ILIKE '%free%';
UPDATE plans SET max_collections_per_org = 10 WHERE name = 'Premium' OR name ILIKE '%premium%';

-- =====================================================
-- 6. Update org_quotas table
-- =====================================================
-- Add collections quota tracking
ALTER TABLE org_quotas
ADD COLUMN collections INTEGER DEFAULT 0;

-- =====================================================
-- 7. Create indexes for performance
-- =====================================================
CREATE INDEX idx_collections_org_id ON collections(organization_id);
CREATE INDEX idx_collections_user_id ON collections(user_id);
CREATE INDEX idx_collections_deleted_at ON collections(deleted_at);
CREATE INDEX idx_collection_members_collection ON collection_members(collection_id);
CREATE INDEX idx_collection_members_user ON collection_members(user_id);
CREATE INDEX idx_touch_points_collection ON touch_points(collection_id);

-- =====================================================
-- 8. Create trigger for updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_collections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_collections_updated_at
  BEFORE UPDATE ON collections
  FOR EACH ROW
  EXECUTE FUNCTION update_collections_updated_at();

CREATE TRIGGER trigger_collection_members_updated_at
  BEFORE UPDATE ON collection_members
  FOR EACH ROW
  EXECUTE FUNCTION update_collections_updated_at();

-- =====================================================
-- 9. Create function to update organization counter
-- =====================================================
CREATE OR REPLACE FUNCTION update_org_collections_counter()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.deleted_at IS NULL THEN
    -- Increment counter on insert
    UPDATE organizations
    SET total_collections = total_collections + 1
    WHERE id = NEW.organization_id;
  ELSIF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL) THEN
    -- Decrement counter on delete or soft delete
    UPDATE organizations
    SET total_collections = GREATEST(total_collections - 1, 0)
    WHERE id = COALESCE(OLD.organization_id, NEW.organization_id);
  ELSIF TG_OP = 'UPDATE' AND OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
    -- Increment counter on restore
    UPDATE organizations
    SET total_collections = total_collections + 1
    WHERE id = NEW.organization_id;
  END IF
;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_org_collections_counter
  AFTER INSERT OR UPDATE OR DELETE ON collections
  FOR EACH ROW
  EXECUTE FUNCTION update_org_collections_counter();

-- =====================================================
-- 10. Comments for documentation
-- =====================================================
COMMENT ON TABLE collections IS 'Collections for organizing touch-points with team-based access control. Each touch-point can belong to one collection or none.';
COMMENT ON TABLE collection_members IS 'Members with specific roles for each collection. Collection-level permissions override organization-level permissions.';
COMMENT ON COLUMN collections.org_permission IS 'Organization-level permission: can_edit (anyone in org can edit), can_view (org members can only view), no_access (only collection members can access)';
COMMENT ON COLUMN collection_members.role IS 'Collection-level role: owner (full access + manage members), editor (can edit), viewer (can view), no_access (no access)';
COMMENT ON COLUMN touch_points.collection_id IS 'Each touch-point can belong to one collection (or none). Constraint enforced at application layer.';
COMMENT ON COLUMN organizations.total_collections IS 'Counter for total non-deleted collections in the organization. Updated automatically via trigger.';
COMMENT ON COLUMN plans.max_collections_per_org IS 'Maximum number of collections allowed per organization. Free: 0, Premium: 10';
COMMENT ON COLUMN org_quotas.collections IS 'Current number of collections used in the organization quota.';
