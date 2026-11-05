CREATE OR REPLACE FUNCTION public.get_scroll_heatmap(
  p_organization_id uuid,
  p_page_path text DEFAULT NULL::text,
  p_from timestamp with time zone DEFAULT NULL,
  p_to timestamp with time zone DEFAULT NULL,
  p_device_type text DEFAULT NULL::text,
  p_hostname text DEFAULT NULL::text
)
RETURNS TABLE(scroll_depth_percent smallint, sessions_reached bigint, avg_time_at_depth numeric)
LANGUAGE sql
STABLE
AS $function$
  SELECT
    i.scroll_depth_percent,
    COUNT(DISTINCT i.session_id)              AS sessions_reached,
    ROUND(AVG(i.time_at_depth)::numeric, 0)  AS avg_time_at_depth
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
  GROUP BY i.scroll_depth_percent
  ORDER BY i.scroll_depth_percent;
$function$
