-- RPC function to get audit logs with user information
CREATE OR REPLACE FUNCTION logs.get_audit_logs_with_users(
  p_org_id uuid,
  p_module text DEFAULT NULL,
  p_action text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_target_id uuid DEFAULT NULL,
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL,
  p_retention_days integer DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
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
BEGIN
  -- Calculate retention cutoff date if specified
  IF p_retention_days IS NOT NULL THEN
    v_cutoff_date := NOW() - (p_retention_days || ' days')::interval;
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
    p.display_name as user_name,
    p.email as user_email
  FROM logs.org_audit_logs oal
  LEFT JOIN public.profiles p ON oal.user_id = p.id
  WHERE oal.organization_id = p_org_id
    AND (p_module IS NULL OR oal.module = p_module)
    AND (p_action IS NULL OR oal.action = p_action)
    AND (p_user_id IS NULL OR oal.user_id = p_user_id)
    AND (p_target_id IS NULL OR oal.target_id = p_target_id)
    AND (p_start_date IS NULL OR oal.created_at >= p_start_date)
    AND (p_end_date IS NULL OR oal.created_at <= p_end_date)
    AND (v_cutoff_date IS NULL OR oal.created_at >= v_cutoff_date)
  ORDER BY oal.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- RPC function to count audit logs (for pagination)
CREATE OR REPLACE FUNCTION logs.count_audit_logs(
  p_org_id uuid,
  p_module text DEFAULT NULL,
  p_action text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_target_id uuid DEFAULT NULL,
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL,
  p_retention_days integer DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cutoff_date timestamp with time zone;
  v_count bigint;
BEGIN
  -- Calculate retention cutoff date if specified
  IF p_retention_days IS NOT NULL THEN
    v_cutoff_date := NOW() - (p_retention_days || ' days')::interval;
  END IF;

  SELECT COUNT(*)
  INTO v_count
  FROM logs.org_audit_logs oal
  WHERE oal.organization_id = p_org_id
    AND (p_module IS NULL OR oal.module = p_module)
    AND (p_action IS NULL OR oal.action = p_action)
    AND (p_user_id IS NULL OR oal.user_id = p_user_id)
    AND (p_target_id IS NULL OR oal.target_id = p_target_id)
    AND (p_start_date IS NULL OR oal.created_at >= p_start_date)
    AND (p_end_date IS NULL OR oal.created_at <= p_end_date)
    AND (v_cutoff_date IS NULL OR oal.created_at >= v_cutoff_date);

  RETURN v_count;
END;
$$;

-- RPC function to get a single audit log by ID with user information
CREATE OR REPLACE FUNCTION logs.get_audit_log_by_id(
  p_log_id uuid,
  p_org_id uuid
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
BEGIN
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
  WHERE oal.id = p_log_id
    AND oal.organization_id = p_org_id;
END;
$$;
