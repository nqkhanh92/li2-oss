-- Top N links by click count within a time window.
-- Returns per-link totals with channel breakdown (QR/LINK/NFC).
-- Reuses the same collection filtering + bot exclusion pattern as get_realtime_data_v3.

CREATE OR REPLACE FUNCTION public.get_realtime_top_links(
  p_organization_id uuid,
  p_last_hours integer DEFAULT 24,
  p_timezone text DEFAULT 'UTC'::text,
  p_exclude_bot boolean DEFAULT true,
  p_collection_ids uuid[] DEFAULT NULL::uuid[],
  p_include_null_collection boolean DEFAULT true,
  p_user_id uuid DEFAULT NULL::uuid,
  p_limit integer DEFAULT 5
)
RETURNS TABLE(
  touchpoint_id uuid,
  touchpoint_name text,
  short_url text,
  click_count bigint,
  qr_count bigint,
  link_count bigint,
  nfc_count bigint
)
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE
  end_local   timestamp;
  start_local timestamp;
  has_collection_filter boolean;
BEGIN
  end_local   := now() AT TIME ZONE p_timezone;
  start_local := end_local - make_interval(hours => p_last_hours);

  has_collection_filter := p_collection_ids IS NOT NULL;

  RETURN QUERY
  SELECT
    tp.id AS touchpoint_id,
    COALESCE(tp.name, 'Deleted touch point') AS touchpoint_name,
    tp.short_url,
    COUNT(*)                                    AS click_count,
    COUNT(*) FILTER (WHERE v.type = 'QR')       AS qr_count,
    COUNT(*) FILTER (WHERE v.type = 'LINK')     AS link_count,
    COUNT(*) FILTER (WHERE v.type = 'NFC')      AS nfc_count
  FROM public.visits v
  LEFT JOIN public.touch_points tp
    ON tp.id = v.tp_id
   AND tp.deleted_at IS NULL
  WHERE v.organization_id = p_organization_id
    AND v.created_at >= (start_local AT TIME ZONE p_timezone)
    AND v.created_at <  (end_local   AT TIME ZONE p_timezone)
    -- Bot filtering
    AND (NOT p_exclude_bot OR v.is_bot = FALSE)
    -- Collection filtering
    AND (
      NOT has_collection_filter
      OR tp.collection_id = ANY(p_collection_ids)
      OR (p_include_null_collection = true AND tp.collection_id IS NULL AND tp.user_id = p_user_id)
    )
  GROUP BY tp.id, tp.name, tp.short_url
  ORDER BY click_count DESC
  LIMIT p_limit;
END;
$function$;

COMMENT ON FUNCTION public.get_realtime_top_links IS
'Top N links by click count within a time window, with per-channel breakdown (QR/LINK/NFC).
Uses same collection filtering + bot exclusion pattern as get_realtime_data_v3.';
