-- Migration script to add slugs to organizations that don't have one
-- Handles duplicate names by appending a counter

-- Step 1: Create a function to generate slug from name
CREATE OR REPLACE FUNCTION generate_slug(name TEXT) 
RETURNS TEXT AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(trim(name), '[^a-z0-9\s-]', '', 'gi'),
        '\s+', '-', 'g'
      ),
      '-+', '-', 'g'
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create a temporary table to store slug assignments
CREATE TEMP TABLE temp_org_slugs AS
WITH base_slugs AS (
  SELECT 
    id,
    name,
    generate_slug(name) as base_slug,
    ROW_NUMBER() OVER (PARTITION BY generate_slug(name) ORDER BY created_at) as slug_rank
  FROM organizations
  WHERE org_slug IS NULL OR org_slug = ''
),
unique_slugs AS (
  SELECT 
    id,
    name,
    CASE 
      WHEN slug_rank = 1 THEN base_slug
      ELSE base_slug || '-' || slug_rank
    END as new_slug
  FROM base_slugs
)
SELECT * FROM unique_slugs;

-- Step 3: Verify no duplicate slugs will be created
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  -- Check for duplicates in temp table
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT new_slug, COUNT(*) as cnt
    FROM temp_org_slugs
    GROUP BY new_slug
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE EXCEPTION 'Duplicate slugs detected in migration. Please review the script.';
  END IF;
  
  -- Check for conflicts with existing slugs
  SELECT COUNT(*) INTO duplicate_count
  FROM temp_org_slugs t
  INNER JOIN organizations o ON o.org_slug = t.new_slug
  WHERE o.id != t.id;
  
  IF duplicate_count > 0 THEN
    RAISE EXCEPTION 'Generated slugs conflict with existing slugs. Please review the script.';
  END IF;
END $$;

-- Step 4: Preview the changes (comment out after review)
SELECT 
  o.id,
  o.name,
  o.org_slug as current_slug,
  t.new_slug as proposed_slug,
  o.created_at
FROM organizations o
LEFT JOIN temp_org_slugs t ON o.id = t.id
WHERE o.org_slug IS NULL OR o.org_slug = ''
ORDER BY o.created_at;

-- Step 5: Apply the migration (uncomment after reviewing preview)
-- UPDATE organizations o
-- SET org_slug = t.new_slug
-- FROM temp_org_slugs t
-- WHERE o.id = t.id;

-- Step 6: Verify the update
-- SELECT 
--   COUNT(*) as total_orgs,
--   COUNT(org_slug) as orgs_with_slug,
--   COUNT(*) - COUNT(org_slug) as orgs_without_slug
-- FROM organizations;

-- Step 7: Clean up
DROP FUNCTION IF EXISTS generate_slug(TEXT);
