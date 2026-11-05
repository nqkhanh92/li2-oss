-- Rollback incorrectly formatted collection permissions
-- This removes the malformed permissions that were added as nested arrays

-- Filter out any array elements (the incorrectly added collection permissions are nested arrays)
-- Keep only object elements that are proper permission objects
UPDATE roles
SET permissions = (
  SELECT array_agg(elem)
  FROM unnest(permissions) AS elem
  WHERE jsonb_typeof(elem) = 'object'
)
WHERE name IN ('Owner', 'Manager', 'Editor', 'Viewer')
  AND permissions::text LIKE '%"key"%';
