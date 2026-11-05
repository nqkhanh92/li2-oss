CREATE OR REPLACE FUNCTION public.get_raw_visit_data_v4(
    p_organization_id uuid,
    p_last_hours integer,
    p_timezone text DEFAULT 'UTC',
    p_is_premium boolean DEFAULT false,
    p_tp_ids uuid[] DEFAULT NULL,
    p_tag_ids uuid[] DEFAULT NULL,
    p_collection_ids uuid[] DEFAULT NULL,
    p_include_null_collection boolean DEFAULT false,
    p_exclude_bot boolean DEFAULT false,
    p_start_time timestamp with time zone DEFAULT NULL,
    p_end_time timestamp with time zone DEFAULT NULL,
    p_limit integer DEFAULT NULL,
    p_offset integer DEFAULT 0,
    p_utm_source_values text[] DEFAULT NULL,
    p_utm_medium_values text[] DEFAULT NULL,
    p_utm_campaign_values text[] DEFAULT NULL,
    p_user_id uuid DEFAULT NULL,
    p_interaction_types text[] DEFAULT NULL
)
RETURNS TABLE(
    touchpoint_id uuid,
    touchpoint_name text,
    os text,
    platform text,
    channel text,
    country text,
    city text,
    ip text,
    isp text,
    referrer text,
    created_at timestamp with time zone,
    id uuid,
    total_count bigint,
    visitor_id character varying,
    customer_profile_id uuid,
    customer_name text,
    customer_email text
)
LANGUAGE plpgsql
AS $function$
DECLARE
    end_local timestamp;
    start_local timestamp;
    filtered_tp_ids uuid[];
    has_collection_filter boolean;
BEGIN
    end_local := coalesce(
        p_end_time at time zone p_timezone,
        now() at time zone p_timezone
    );

    start_local := coalesce(
        p_start_time at time zone p_timezone,
        end_local - make_interval(hours => p_last_hours)
    );

    has_collection_filter := false;

    IF p_collection_ids IS NOT NULL THEN
        has_collection_filter := true;

        SELECT array_agg(DISTINCT touch_points.id) INTO filtered_tp_ids
        FROM touch_points
        WHERE touch_points.organization_id = p_organization_id
          AND touch_points.deleted_at IS NULL
          AND (
              collection_id = ANY(p_collection_ids)
              OR (p_include_null_collection = true AND collection_id IS NULL AND user_id = p_user_id)
          )
          AND (p_tp_ids IS NULL OR p_tp_ids = '{}' OR touch_points.id = ANY(p_tp_ids));

        p_tp_ids := COALESCE(filtered_tp_ids, ARRAY[]::uuid[]);
    END IF;

    RETURN QUERY
    WITH filtered AS (
        SELECT
            v.tp_id,
            coalesce(tp.name, 'Touch point has been deleted') as touchpoint_name,
            v.os,
            v.platform,
            v.type as channel,
            v.country,
            v.referrer,
            v.city,
            v.ip::text as ip,
            v.isp,
            v.created_at,
            v.id,
            v.li2_cid
        FROM public.visits v
        LEFT JOIN public.touch_points tp
            ON tp.id = v.tp_id
            AND tp.deleted_at IS NULL
        WHERE v.organization_id = p_organization_id
          AND v.created_at >= (start_local at time zone p_timezone)
          AND v.created_at <  (end_local at time zone p_timezone)
          AND (
              CASE
                  WHEN has_collection_filter THEN v.tp_id = ANY(p_tp_ids)
                  ELSE (p_tp_ids IS NULL OR p_tp_ids = '{}' OR v.tp_id = ANY(p_tp_ids))
              END
          )
          AND (
              p_tag_ids IS NULL
              OR p_tag_ids = '{}'
              OR EXISTS (
                  SELECT 1 FROM public.tp_tag_links tl
                  WHERE tl.tp_id = v.tp_id
                    AND tl.tag_id = ANY(p_tag_ids)
              )
          )
          AND (NOT p_exclude_bot OR v.is_bot = FALSE)
          AND (p_interaction_types IS NULL OR p_interaction_types = '{}' OR v.type = ANY(p_interaction_types))
          AND (p_utm_source_values IS NULL OR p_utm_source_values = '{}' OR v.utm_tags->>'utm_source' = ANY(p_utm_source_values))
          AND (p_utm_medium_values IS NULL OR p_utm_medium_values = '{}' OR v.utm_tags->>'utm_medium' = ANY(p_utm_medium_values))
          AND (p_utm_campaign_values IS NULL OR p_utm_campaign_values = '{}' OR v.utm_tags->>'utm_campaign' = ANY(p_utm_campaign_values))
    ),
    total AS (
        SELECT count(*) as total_count FROM filtered
    )
    SELECT
        f.tp_id as touchpoint_id,
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
        t.total_count,
        s.visitor_id,
        ce.customer_profile_id,
        cp.name as customer_name,
        cp.email as customer_email
    FROM filtered f
    CROSS JOIN total t
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
    ORDER BY f.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$function$;
