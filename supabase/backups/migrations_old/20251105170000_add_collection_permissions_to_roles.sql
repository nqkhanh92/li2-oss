-- Add collection permissions to default roles
-- This migration adds the new collection-related permissions to existing default roles

-- Owner role: Full access to all collection operations with scope "all"
UPDATE roles
SET permissions = permissions || jsonb_build_array(
  jsonb_build_object('permission_key', 'view_collections', 'scope', 'all'),
  jsonb_build_object('permission_key', 'add_collection', 'scope', 'all'),
  jsonb_build_object('permission_key', 'edit_collection', 'scope', 'all'),
  jsonb_build_object('permission_key', 'delete_collection', 'scope', 'all'),
  jsonb_build_object('permission_key', 'manage_collection_members', 'scope', 'all')
)
WHERE name = 'Owner';

-- Manager role: Full access to all collection operations with scope "all"
UPDATE roles
SET permissions = permissions || jsonb_build_array(
  jsonb_build_object('permission_key', 'view_collections', 'scope', 'all'),
  jsonb_build_object('permission_key', 'add_collection', 'scope', 'all'),
  jsonb_build_object('permission_key', 'edit_collection', 'scope', 'all'),
  jsonb_build_object('permission_key', 'delete_collection', 'scope', 'all'),
  jsonb_build_object('permission_key', 'manage_collection_members', 'scope', 'all')
)
WHERE name = 'Manager';

-- Editor role: Can view, add, edit, delete collections they own (scope "own"), but cannot manage members
UPDATE roles
SET permissions = permissions || jsonb_build_array(
  jsonb_build_object('permission_key', 'view_collections', 'scope', 'own'),
  jsonb_build_object('permission_key', 'add_collection', 'scope', 'own'),
  jsonb_build_object('permission_key', 'edit_collection', 'scope', 'own'),
  jsonb_build_object('permission_key', 'delete_collection', 'scope', 'own')
)
WHERE name = 'Editor';

-- Viewer role: Can only view collections (no scope restriction for viewing)
UPDATE roles
SET permissions = permissions || jsonb_build_array(
  jsonb_build_object('permission_key', 'view_collections', 'scope', NULL)
)
WHERE name = 'Viewer';
