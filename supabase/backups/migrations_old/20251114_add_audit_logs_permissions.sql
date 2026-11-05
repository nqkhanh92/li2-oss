-- Add audit logs permissions to default roles
-- This migration adds the new audit log permissions to existing default roles

-- Owner role: Full access to view and export audit logs (scope: null for no-scope permissions)
UPDATE roles
SET permissions = permissions || jsonb_build_array(
  jsonb_build_object('permission_key', 'view_audit_logs', 'scope', null),
  jsonb_build_object('permission_key', 'export_audit_logs', 'scope', null)
)
WHERE name = 'Owner';

-- Manager role: Full access to view and export audit logs
UPDATE roles
SET permissions = permissions || jsonb_build_array(
  jsonb_build_object('permission_key', 'view_audit_logs', 'scope', null),
  jsonb_build_object('permission_key', 'export_audit_logs', 'scope', null)
)
WHERE name = 'Manager';

-- Editor role: Can view audit logs but cannot export
UPDATE roles
SET permissions = permissions || jsonb_build_array(
  jsonb_build_object('permission_key', 'view_audit_logs', 'scope', null)
)
WHERE name = 'Editor';

-- Viewer role: Can view audit logs but cannot export
UPDATE roles
SET permissions = permissions || jsonb_build_array(
  jsonb_build_object('permission_key', 'view_audit_logs', 'scope', null)
)
WHERE name = 'Viewer';

-- Add audit_logs_retention_days column to plans table if it doesn't exist
ALTER TABLE plans ADD COLUMN IF NOT EXISTS audit_logs_retention_days smallint DEFAULT 7;

-- PREMIUM plan: 180 days retention
UPDATE plans
SET advanced_features_allowed = array_append(
  COALESCE(advanced_features_allowed, ARRAY[]::text[]),
  'audit_logs'
),
audit_logs_retention_days = 180
WHERE name = 'PREMIUM'
AND NOT ('audit_logs' = ANY(COALESCE(advanced_features_allowed, ARRAY[]::text[])));

-- PREMIUM TRIAL plan: 180 days retention (same as Premium)
UPDATE plans
SET advanced_features_allowed = array_append(
  COALESCE(advanced_features_allowed, ARRAY[]::text[]),
  'audit_logs'
),
audit_logs_retention_days = 180
WHERE name = 'PREMIUM TRIAL'
AND NOT ('audit_logs' = ANY(COALESCE(advanced_features_allowed, ARRAY[]::text[])));

-- Pro plan (future): 90 days retention
UPDATE plans
SET advanced_features_allowed = array_append(
  COALESCE(advanced_features_allowed, ARRAY[]::text[]),
  'audit_logs'
),
audit_logs_retention_days = 90
WHERE name = 'PRO'
AND NOT ('audit_logs' = ANY(COALESCE(advanced_features_allowed, ARRAY[]::text[])));

-- FREE plan: No audit logs access
UPDATE plans
SET audit_logs_retention_days = 7,
advanced_features_allowed = array_remove(COALESCE(advanced_features_allowed, ARRAY[]::text[]), 'audit_logs')
WHERE name = 'FREE';
