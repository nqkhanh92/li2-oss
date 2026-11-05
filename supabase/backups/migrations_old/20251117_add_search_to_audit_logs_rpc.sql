-- Enable pg_trgm extension for trigram-based text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN indexes on searchable text fields for better performance
-- Index on target_name for faster searching
CREATE INDEX IF NOT EXISTS idx_org_audit_logs_target_name_trgm
ON logs.org_audit_logs USING gin (target_name gin_trgm_ops);

-- Index on module for faster searching
CREATE INDEX IF NOT EXISTS idx_org_audit_logs_module_trgm
ON logs.org_audit_logs USING gin (module gin_trgm_ops);

-- Index on action for faster searching
CREATE INDEX IF NOT EXISTS idx_org_audit_logs_action_trgm
ON logs.org_audit_logs USING gin (action gin_trgm_ops);

-- Add search parameter to get_audit_logs_with_users RPC function
CREATE OR REPLACE FUNCTION logs.get_audit_logs_with_users(
  p_org_id uuid,
  p_module text[] DEFAULT NULL,
  p_action text[] DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_target_id uuid DEFAULT NULL,
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL,
  p_retention_days integer DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_search text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  organization_id uuid,
  user_id uuid,
  module text,
  action text,
  target_id uuid,
  target_name text,
  target_table text,
  target_extra jsonb,
  changes jsonb,
  metadata jsonb,
  created_at timestamp with time zone,
  user_name text,
  user_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cutoff_date timestamp with time zone;
  v_search_pattern text;
BEGIN
  -- Calculate retention cutoff date if specified
  IF p_retention_days IS NOT NULL THEN
    v_cutoff_date := NOW() - (p_retention_days || ' days')::interval;
  END IF;

  -- Prepare search pattern for ILIKE queries (pg_trgm will optimize these)
  IF p_search IS NOT NULL AND p_search != '' THEN
    v_search_pattern := '%' || p_search || '%';
  END IF;

  RETURN QUERY
  SELECT
    oal.id,
    oal.organization_id,
    oal.user_id,
    oal.module,
    oal.action,
    oal.target_id,
    oal.target_name,
    oal.target_table,
    oal.target_extra,
    oal.changes,
    oal.metadata,
    oal.created_at,
    p.name as user_name,
    p.email as user_email
  FROM logs.org_audit_logs oal
  LEFT JOIN public.profiles p ON oal.user_id = p.id
  WHERE oal.organization_id = p_org_id
    AND (p_module IS NULL OR oal.module = ANY(p_module))
    AND (p_action IS NULL OR oal.action = ANY(p_action))
    AND (p_user_id IS NULL OR oal.user_id = p_user_id)
    AND (p_target_id IS NULL OR oal.target_id = p_target_id)
    AND (p_start_date IS NULL OR oal.created_at >= p_start_date)
    AND (p_end_date IS NULL OR oal.created_at <= p_end_date)
    AND (v_cutoff_date IS NULL OR oal.created_at >= v_cutoff_date)
    AND (
      v_search_pattern IS NULL OR
      oal.target_name ILIKE v_search_pattern OR
      p.name ILIKE v_search_pattern OR
      p.email ILIKE v_search_pattern OR
      oal.module ILIKE v_search_pattern OR
      oal.action ILIKE v_search_pattern
    )
  ORDER BY oal.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Add search parameter to count_audit_logs RPC function
CREATE OR REPLACE FUNCTION logs.count_audit_logs(
  p_org_id uuid,
  p_module text[] DEFAULT NULL,
  p_action text[] DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_target_id uuid DEFAULT NULL,
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL,
  p_retention_days integer DEFAULT NULL,
  p_search text DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cutoff_date timestamp with time zone;
  v_search_pattern text;
  v_count bigint;
BEGIN
  -- Calculate retention cutoff date if specified
  IF p_retention_days IS NOT NULL THEN
    v_cutoff_date := NOW() - (p_retention_days || ' days')::interval;
  END IF;

  -- Prepare search pattern for ILIKE queries (pg_trgm will optimize these)
  IF p_search IS NOT NULL AND p_search != '' THEN
    v_search_pattern := '%' || p_search || '%';
  END IF;

  SELECT COUNT(*)
  INTO v_count
  FROM logs.org_audit_logs oal
  LEFT JOIN public.profiles p ON oal.user_id = p.id
  WHERE oal.organization_id = p_org_id
    AND (p_module IS NULL OR oal.module = ANY(p_module))
    AND (p_action IS NULL OR oal.action = ANY(p_action))
    AND (p_user_id IS NULL OR oal.user_id = p_user_id)
    AND (p_target_id IS NULL OR oal.target_id = p_target_id)
    AND (p_start_date IS NULL OR oal.created_at >= p_start_date)
    AND (p_end_date IS NULL OR oal.created_at <= p_end_date)
    AND (v_cutoff_date IS NULL OR oal.created_at >= v_cutoff_date)
    AND (
      v_search_pattern IS NULL OR
      oal.target_name ILIKE v_search_pattern OR
      p.name ILIKE v_search_pattern OR
      p.email ILIKE v_search_pattern OR
      oal.module ILIKE v_search_pattern OR
      oal.action ILIKE v_search_pattern
    );

  RETURN v_count;
END;
$$;
