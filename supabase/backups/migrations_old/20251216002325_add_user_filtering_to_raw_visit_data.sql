-- Migration: Add user_id filtering to get_raw_visit_data
-- This creates get_raw_visit_data_v2 with proper collection filtering and user_id support
-- for filtering uncategorized touch-points by owner

CREATE OR REPLACE FUNCTION "public"."get_raw_visit_data_v2"(
    "p_organization_id" "uuid",
    "p_last_hours" integer,
    "p_timezone" text DEFAULT 'UTC'::text,
    "p_is_premium" boolean DEFAULT false,
    "p_tp_ids" "uuid"[] DEFAULT NULL::"uuid"[],
    "p_tag_ids" "uuid"[] DEFAULT NULL::"uuid"[],
    "p_collection_ids" "uuid"[] DEFAULT NULL::"uuid"[],
    "p_include_null_collection" boolean DEFAULT false,
    "p_exclude_bot" boolean DEFAULT false,
    "p_start_time" timestamp with time zone DEFAULT NULL::timestamp with time zone,
    "p_end_time" timestamp with time zone DEFAULT NULL::timestamp with time zone,
    "p_limit" integer DEFAULT NULL,
    "p_offset" integer DEFAULT 0,
    "p_utm_source_values" text[] DEFAULT NULL::text[],
    "p_utm_medium_values" text[] DEFAULT NULL::text[],
    "p_utm_campaign_values" text[] DEFAULT NULL::text[],
    "p_user_id" "uuid" DEFAULT NULL::"uuid"
) RETURNS TABLE(
    "touchpoint_id" "uuid",
    "touchpoint_name" "text",
    "os" "text",
    "platform" "text",
    "channel" "text",
    "country" "text",
    "city" "text",
    "ip" "text",
    "isp" "text",
    "referrer" "text",
    "created_at" timestamp with time zone,
    "id" "uuid",
    "total_count" bigint
)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    end_local timestamp;
    start_local timestamp;
    filtered_tp_ids uuid[];
    has_collection_filter boolean;
BEGIN
    -- Determine end time (use provided end_time or current time in timezone)
    end_local := coalesce(
        p_end_time at time zone p_timezone,
        now() at time zone p_timezone
    );

    -- Determine start time (use provided start_time or calculate from p_last_hours)
    start_local := coalesce(
        p_start_time at time zone p_timezone,
        end_local - make_interval(hours => p_last_hours)
    );

    -- Track if collection filtering was applied
    has_collection_filter := false;

    -- Apply collection filtering to tp_ids
    -- Fixed: Use IS NOT NULL instead of array_length check (empty array returns NULL from array_length)
    IF p_collection_ids IS NOT NULL THEN
        has_collection_filter := true;

        SELECT array_agg(DISTINCT touch_points.id) INTO filtered_tp_ids
        FROM touch_points
        WHERE touch_points.organization_id = p_organization_id
        AND touch_points.deleted_at IS NULL
        AND (
            -- Touch-points in specified collections
            collection_id = ANY(p_collection_ids)
            -- OR uncategorized touch-points owned by user (if includeNull is true)
            OR (
                p_include_null_collection = true
                AND collection_id IS NULL
                AND user_id = p_user_id
            )
        )
        -- Also apply existing tp_ids filter if present
        AND (p_tp_ids IS NULL OR p_tp_ids = '{}' OR touch_points.id = ANY(p_tp_ids));

        -- Replace tp_ids with filtered list (use empty array if null to return no results)
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
            v.id
        FROM public.visits v
        LEFT JOIN public.touch_points tp
            ON tp.id = v.tp_id
            AND tp.deleted_at is null
        WHERE v.organization_id = p_organization_id
            AND v.created_at >= (start_local at time zone p_timezone)
            AND v.created_at <  (end_local at time zone p_timezone)
            -- Filter by touch point IDs
            -- When collection filter was applied: only show visits for filtered TPs (empty = no results)
            -- When no collection filter: show all or filter by provided p_tp_ids
            AND (
                CASE
                    WHEN has_collection_filter THEN v.tp_id = ANY(p_tp_ids)
                    ELSE (p_tp_ids IS NULL OR p_tp_ids = '{}' OR v.tp_id = ANY(p_tp_ids))
                END
            )
            -- Filter by tags if provided (join with tp_tag_links through touch points)
            AND (
                p_tag_ids is null
                or p_tag_ids = '{}'
                or exists (
                    select 1 from public.tp_tag_links tl
                    where tl.tp_id = v.tp_id
                        and tl.tag_id = any(p_tag_ids)
                )
            )
            -- Exclude bots if requested
            AND (NOT p_exclude_bot OR v.is_bot = FALSE)
            -- UTM filters
            AND (p_utm_source_values IS NULL OR p_utm_source_values = '{}' OR v.utm_tags->>'utm_source' = ANY(p_utm_source_values))
            AND (p_utm_medium_values IS NULL OR p_utm_medium_values = '{}' OR v.utm_tags->>'utm_medium' = ANY(p_utm_medium_values))
            AND (p_utm_campaign_values IS NULL OR p_utm_campaign_values = '{}' OR v.utm_tags->>'utm_campaign' = ANY(p_utm_campaign_values))
    ),
    total AS (
        SELECT count(*) as total_count
        FROM filtered
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
        t.total_count
    FROM filtered f
    CROSS JOIN total t
    ORDER BY f.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;