-- Step 1: Rename duplicate tags by appending (1), (2), etc. based on created_at order
WITH ranked_tags AS (
  SELECT 
    id,
    name,
    organization_id,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY name, organization_id 
      ORDER BY created_at ASC
    ) as rn
  FROM public.tags
),
duplicates AS (
  SELECT 
    id,
    name,
    CASE 
      WHEN rn > 1 THEN name || ' (' || rn || ')'
      ELSE name
    END as new_name
  FROM ranked_tags
  WHERE rn > 1
)
UPDATE public.tags
SET name = duplicates.new_name
FROM duplicates
WHERE tags.id = duplicates.id;

-- Step 2: Add unique constraint to ensure tag names are unique within each organization
ALTER TABLE public.tags 
ADD CONSTRAINT tags_name_organization_id_unique 
UNIQUE (name, organization_id);

-- Add comment to document the constraint
COMMENT ON CONSTRAINT tags_name_organization_id_unique ON public.tags IS 
'Ensures tag names are unique within each organization. Same tag name can exist in different organizations.';
