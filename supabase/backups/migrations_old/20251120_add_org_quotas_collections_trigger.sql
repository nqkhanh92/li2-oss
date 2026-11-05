-- Migration: Add Trigger for org_quotas.collections Counter
-- Description: Automatically update org_quotas.collections when collections are created, deleted, or restored
-- Date: 2025-11-20
-- Note: This complements the existing trigger for organizations.total_collections

-- =====================================================
-- Create function to update org_quotas collections counter
-- =====================================================
CREATE OR REPLACE FUNCTION update_org_quotas_collections_counter()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.deleted_at IS NULL THEN
    -- Increment quota counter on insert
    UPDATE org_quotas
    SET collections = COALESCE(collections, 0) + 1
    WHERE org_id = NEW.organization_id;
  ELSIF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL) THEN
    -- Decrement quota counter on delete or soft delete
    UPDATE org_quotas
    SET collections = GREATEST(COALESCE(collections, 0) - 1, 0)
    WHERE org_id = COALESCE(OLD.organization_id, NEW.organization_id);
  ELSIF TG_OP = 'UPDATE' AND OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
    -- Increment quota counter on restore
    UPDATE org_quotas
    SET collections = COALESCE(collections, 0) + 1
    WHERE org_id = NEW.organization_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Create trigger on collections table
-- =====================================================
CREATE TRIGGER trigger_org_quotas_collections_counter
  AFTER INSERT OR UPDATE OR DELETE ON collections
  FOR EACH ROW
  EXECUTE FUNCTION update_org_quotas_collections_counter();

-- =====================================================
-- Comments for documentation
-- =====================================================
COMMENT ON FUNCTION update_org_quotas_collections_counter() IS 'Automatically updates org_quotas.collections counter when collections are created, deleted, soft-deleted, or restored. Handles NULL values and prevents negative counts.';
