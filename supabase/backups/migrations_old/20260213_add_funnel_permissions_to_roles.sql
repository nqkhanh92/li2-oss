-- Add funnel permissions to default roles
-- Funnel permissions are org-wide (no OWN/ALL distinction), stored with scope 'all'

-- Owner role: Full CRUD access
UPDATE roles
SET permissions = permissions
  || '{"permission_key": "view_funnels", "scope": "all"}'::jsonb
  || '{"permission_key": "add_funnel", "scope": "all"}'::jsonb
  || '{"permission_key": "edit_funnel", "scope": "all"}'::jsonb
  || '{"permission_key": "delete_funnel", "scope": "all"}'::jsonb
WHERE name = 'Owner';

-- Manager role: Full CRUD access
UPDATE roles
SET permissions = permissions
  || '{"permission_key": "view_funnels", "scope": "all"}'::jsonb
  || '{"permission_key": "add_funnel", "scope": "all"}'::jsonb
  || '{"permission_key": "edit_funnel", "scope": "all"}'::jsonb
  || '{"permission_key": "delete_funnel", "scope": "all"}'::jsonb
WHERE name = 'Manager';

-- Editor role: Can view, add, and edit funnels (no delete)
UPDATE roles
SET permissions = permissions
  || '{"permission_key": "view_funnels", "scope": "all"}'::jsonb
  || '{"permission_key": "add_funnel", "scope": "all"}'::jsonb
  || '{"permission_key": "edit_funnel", "scope": "all"}'::jsonb
WHERE name = 'Editor';

-- Viewer role: Can only view funnels
UPDATE roles
SET permissions = permissions
  || '{"permission_key": "view_funnels", "scope": "all"}'::jsonb
WHERE name = 'Viewer';
