CREATE OR REPLACE FUNCTION public.get_realtime_data_v4(p_organization_id uuid, p_last_hours integer, p_timezone text DEFAULT 'UTC'::text, p_is_premium boolean DEFAULT false, p_collection_ids uuid[] DEFAULT NULL::uuid[], p_include_null_collection boolean DEFAULT true, p_user_id uuid DEFAULT NULL::uuid, p_exclude_bot boolean DEFAULT true)
 RETURNS TABLE(touchpoint_id uuid, touchpoint_name text, os text, platform text, channel text, country text, city text, ip text, isp text, referrer text, created_at timestamp with time zone, id uuid, visitor_id character varying, customer_profile_id uuid, customer_name text, customer_email text)
 LANGUAGE plpgsql
AS $function$
DECLARE
  end_local   timestamp;
  start_local timestamp;
  has_collection_filter boolean;
BEGIN
  end_local   := now() at time zone p_timezone;
  start_local := end_local - make_interval(hours => p_last_hours);

  has_collection_filter := p_collection_ids IS NOT NULL;

  RETURN QUERY
  WITH filtered AS (
    SELECT
      v.tp_id,
      coalesce(tp.name, 'Touch point has been deleted') AS touchpoint_name,
      v.os,
      v.platform,
      v.type      AS channel,
      v.country,
      v.referrer,
      v.city,
      v.ip::text  AS ip,
      v.isp,
      v.created_at,
      v.id,
      v.li2_cid,
      v.fp
    FROM public.visits v
    LEFT JOIN public.touch_points tp
      ON tp.id = v.tp_id
     AND tp.deleted_at IS NULL
    WHERE v.organization_id = p_organization_id
      AND v.created_at >= (start_local AT TIME ZONE p_timezone)
      AND v.created_at <  (end_local   AT TIME ZONE p_timezone)
      AND (
        NOT has_collection_filter
        OR tp.collection_id = ANY(p_collection_ids)
        OR (p_include_null_collection = true AND tp.collection_id IS NULL AND tp.user_id = p_user_id)
      )
      AND (NOT p_exclude_bot OR v.is_bot = FALSE)
  )
  SELECT
    f.tp_id               AS touchpoint_id,
    f.touchpoint_name,
    f.os,
    f.platform,
    f.channel,
    f.country,
    f.city,
    f.ip,
    f.isp,
    f.referrer,
    f.created_at,
    f.id,
    COALESCE(
      s.visitor_id,
      CASE WHEN f.fp IS NOT NULL
        THEN ('vis_' || left(encode(sha256((f.fp || ':' || p_organization_id::text)::bytea), 'hex'), 16))::character varying
      END
    ) AS visitor_id,
    ce.customer_profile_id,
    cp.name   AS customer_name,
    cp.email  AS customer_email
  FROM filtered f
  LEFT JOIN LATERAL (
    SELECT s.visitor_id
    FROM public.sessions s
    WHERE s.li2_cid = f.li2_cid
      AND s.organization_id = p_organization_id
    LIMIT 1
  ) s ON true
  LEFT JOIN LATERAL (
    SELECT ce.customer_profile_id
    FROM public.conversion_events ce
    WHERE ce.visitor_id = s.visitor_id
    ORDER BY ce.created_at ASC
    LIMIT 1
  ) ce ON true
  LEFT JOIN public.customer_profiles cp ON cp.id = ce.customer_profile_id
  ORDER BY f.created_at DESC;
END;
$function$
