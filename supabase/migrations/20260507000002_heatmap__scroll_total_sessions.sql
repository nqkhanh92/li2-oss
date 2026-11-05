CREATE OR REPLACE FUNCTION public.get_scroll_heatmap_v2(
  p_organization_id uuid,
  p_page_path text DEFAULT NULL::text,
  p_from timestamp with time zone DEFAULT NULL,
  p_to timestamp with time zone DEFAULT NULL,
  p_device_type text DEFAULT NULL::text,
  p_hostname text DEFAULT NULL::text
)
RETURNS TABLE(scroll_depth_percent smallint, sessions_reached bigint, avg_time_at_depth numeric, total_sessions bigint)
LANGUAGE sql
STABLE
AS $function$
  WITH base AS (
    SELECT
      i.scroll_depth_percent,
      i.session_id,
      i.time_at_depth
    FROM interactions i
    WHERE i.organization_id  = p_organization_id
      AND (p_page_path IS NULL OR i.page_path = p_page_path)
      AND i.interaction_type = 'scroll'
      AND i.timestamp        >= p_from
      AND i.timestamp        < (p_to::date + interval '1 day')
      AND i.is_bot           = false
      AND (p_device_type IS NULL OR i.device_type = p_device_type)
      AND (p_hostname IS NULL OR i.page_url LIKE '%' || p_hostname || '%')
      AND i.scroll_depth_percent IS NOT NULL
  ),
  totals AS (
    SELECT COUNT(DISTINCT session_id) AS total_sessions FROM base
  )
  SELECT
    b.scroll_depth_percent,
    COUNT(DISTINCT b.session_id)             AS sessions_reached,
    ROUND(AVG(b.time_at_depth)::numeric, 0) AS avg_time_at_depth,
    t.total_sessions
  FROM base b, totals t
  GROUP BY b.scroll_depth_percent, t.total_sessions
  ORDER BY b.scroll_depth_percent;
$function$
