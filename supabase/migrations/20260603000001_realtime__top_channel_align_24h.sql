-- Align the realtime hero "Top Channel" card with its headline sibling (24h engagements).
-- Previously top_channel was computed over the last 1 HOUR while the rest of the visible
-- context (and the 24h engagements card) covers 24h, so the card showed "—" whenever there
-- was activity in the last 24h but none in the last hour. This widens ONLY the top_channel
-- subquery to 24 hours. Return shape is unchanged (no gen:types needed). All other windows
-- (active_visitors_5min = 5min, clicks_1hr = 1h, clicks_24hr / clicks_prev_24hr) are untouched.

CREATE OR REPLACE FUNCTION public.get_realtime_summary(
  p_organization_id uuid,
  p_last_hours integer DEFAULT 24,
  p_timezone text DEFAULT 'UTC'::text,
  p_exclude_bot boolean DEFAULT true,
  p_collection_ids uuid[] DEFAULT NULL::uuid[],
  p_include_null_collection boolean DEFAULT true,
  p_user_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(
  active_visitors_5min bigint,
  clicks_1hr bigint,
  clicks_24hr bigint,
  clicks_prev_24hr bigint,
  top_channel text
)
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE
  has_collection_filter boolean;
  now_utc timestamptz;
BEGIN
  now_utc := now();
  has_collection_filter := p_collection_ids IS NOT NULL;

  RETURN QUERY
  SELECT
    -- Unique IPs in last 5 minutes as proxy for "active visitors"
    COUNT(DISTINCT v.ip) FILTER (
      WHERE v.created_at >= now_utc - interval '5 minutes'
    ) AS active_visitors_5min,

    -- Clicks in last 1 hour
    COUNT(*) FILTER (
      WHERE v.created_at >= now_utc - interval '1 hour'
    ) AS clicks_1hr,

    -- Clicks in last 24 hours
    COUNT(*) FILTER (
      WHERE v.created_at >= now_utc - interval '24 hours'
    ) AS clicks_24hr,

    -- Clicks in the previous 24-hour window (24h-48h ago) for trend comparison
    COUNT(*) FILTER (
      WHERE v.created_at >= now_utc - interval '48 hours'
        AND v.created_at < now_utc - interval '24 hours'
    ) AS clicks_prev_24hr,

    -- Most common channel in last 24 hours (aligned with the 24h engagements card)
    (
      SELECT v2.type
      FROM public.visits v2
      LEFT JOIN public.touch_points tp2
        ON tp2.id = v2.tp_id
       AND tp2.deleted_at IS NULL
      WHERE v2.organization_id = p_organization_id
        AND v2.created_at >= now_utc - interval '24 hours'
        AND (NOT p_exclude_bot OR v2.is_bot = FALSE)
        AND (
          NOT has_collection_filter
          OR tp2.collection_id = ANY(p_collection_ids)
          OR (p_include_null_collection = true AND tp2.collection_id IS NULL AND tp2.user_id = p_user_id)
        )
      GROUP BY v2.type
      ORDER BY COUNT(*) DESC
      LIMIT 1
    ) AS top_channel

  FROM public.visits v
  LEFT JOIN public.touch_points tp
    ON tp.id = v.tp_id
   AND tp.deleted_at IS NULL
  WHERE v.organization_id = p_organization_id
    AND v.created_at >= now_utc - interval '48 hours'
    AND (NOT p_exclude_bot OR v.is_bot = FALSE)
    AND (
      NOT has_collection_filter
      OR tp.collection_id = ANY(p_collection_ids)
      OR (p_include_null_collection = true AND tp.collection_id IS NULL AND tp.user_id = p_user_id)
    );
END;
$function$;

COMMENT ON FUNCTION public.get_realtime_summary IS
'Aggregated real-time summary for dashboard hero metrics bar.
Returns active visitors (5min), click counts (1hr/24hr), previous 24hr for trend, and top channel (24hr).
Uses same collection filtering + bot exclusion pattern as get_realtime_data_v3.';
