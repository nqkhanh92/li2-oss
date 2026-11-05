-- Migration: Add UTM filter functionality
-- Description: Add RPC functions to support filtering analytics by UTM parameters (utm_source, utm_medium, utm_campaign)
-- Date: 2025-12-07

-- =====================================================
-- 1. CREATE FUNCTION: get_distinct_utm_values
-- =====================================================
-- Extracts distinct UTM parameter values from visit data
-- Supports filtering by organization, tags, touchpoints, collections, date range, and bot exclusion
-- Returns JSONB with arrays of distinct values for utm_source, utm_medium, and utm_campaign

CREATE OR REPLACE FUNCTION "public"."get_distinct_utm_values"(
    "_organization_id" "uuid",
    "_campaign_ids" "uuid"[] DEFAULT NULL::"uuid"[],
    "_tp_ids" "uuid"[] DEFAULT NULL::"uuid"[],
    "_tag_ids" "uuid"[] DEFAULT NULL::"uuid"[],
    "_collection_ids" "uuid"[] DEFAULT NULL::"uuid"[],
    "_include_null_collection" BOOLEAN DEFAULT FALSE,
    "_start_time" timestamp without time zone DEFAULT NULL::timestamp without time zone,
    "_end_time" timestamp without time zone DEFAULT NULL::timestamp without time zone,
    "_exclude_bot" BOOLEAN DEFAULT FALSE
) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$DECLARE
    result JSONB;
    tp_ids_from_tags UUID[];
    filtered_tp_ids UUID[];
BEGIN
    -- If tag_ids are provided, get all touch points linked to those tags
    IF _tag_ids IS NOT NULL AND array_length(_tag_ids, 1) > 0 THEN
        SELECT array_agg(DISTINCT tp_id) INTO tp_ids_from_tags
        FROM tp_tag_links
        WHERE tag_id = ANY(_tag_ids);

        -- Combine with explicitly provided tp_ids if any
        IF _tp_ids IS NOT NULL AND array_length(_tp_ids, 1) > 0 THEN
            _tp_ids := _tp_ids || tp_ids_from_tags;
        ELSE
            _tp_ids := tp_ids_from_tags;
        END IF;
    END IF;

    -- Apply collection filtering to tp_ids
    IF _collection_ids IS NOT NULL AND array_length(_collection_ids, 1) > 0 THEN
        SELECT array_agg(DISTINCT touch_points.id) INTO filtered_tp_ids
        FROM touch_points
        WHERE (
            collection_id = ANY(_collection_ids)
            OR (
                _include_null_collection = true
                AND collection_id IS NULL
            )
        )
        AND (_tp_ids IS NULL OR array_length(_tp_ids, 1) IS NULL OR touch_points.id = ANY(_tp_ids));

        _tp_ids := filtered_tp_ids;
    END IF;

    -- Extract distinct UTM values from filtered visits
    WITH filtered_visits AS (
        SELECT DISTINCT utm_tags
        FROM visits
        WHERE
            organization_id = _organization_id
            AND utm_tags IS NOT NULL
            AND (_campaign_ids IS NULL OR array_length(_campaign_ids, 1) IS NULL OR campaign_id = ANY(_campaign_ids))
            AND (_tp_ids IS NULL OR array_length(_tp_ids, 1) IS NULL OR tp_id = ANY(_tp_ids))
            AND (_start_time IS NULL OR created_at >= _start_time)
            AND (_end_time IS NULL OR created_at <= _end_time)
            AND (NOT _exclude_bot OR is_bot = FALSE)
    ),
    utm_sources AS (
        SELECT DISTINCT utm_tags->>'utm_source' AS value
        FROM filtered_visits
        WHERE utm_tags->>'utm_source' IS NOT NULL
          AND utm_tags->>'utm_source' != ''
        ORDER BY value
    ),
    utm_mediums AS (
        SELECT DISTINCT utm_tags->>'utm_medium' AS value
        FROM filtered_visits
        WHERE utm_tags->>'utm_medium' IS NOT NULL
          AND utm_tags->>'utm_medium' != ''
        ORDER BY value
    ),
    utm_campaigns AS (
        SELECT DISTINCT utm_tags->>'utm_campaign' AS value
        FROM filtered_visits
        WHERE utm_tags->>'utm_campaign' IS NOT NULL
          AND utm_tags->>'utm_campaign' != ''
        ORDER BY value
    )
    SELECT jsonb_build_object(
        'utm_source', COALESCE((SELECT jsonb_agg(value) FROM utm_sources), '[]'::jsonb),
        'utm_medium', COALESCE((SELECT jsonb_agg(value) FROM utm_mediums), '[]'::jsonb),
        'utm_campaign', COALESCE((SELECT jsonb_agg(value) FROM utm_campaigns), '[]'::jsonb)
    ) INTO result;

    RETURN COALESCE(result, '{}'::jsonb);
END;$$;

ALTER FUNCTION "public"."get_distinct_utm_values"(
    "_organization_id" "uuid",
    "_campaign_ids" "uuid"[],
    "_tp_ids" "uuid"[],
    "_tag_ids" "uuid"[],
    "_collection_ids" "uuid"[],
    "_include_null_collection" boolean,
    "_start_time" timestamp without time zone,
    "_end_time" timestamp without time zone,
    "_exclude_bot" boolean
) OWNER TO "postgres";

-- =====================================================
-- 2. UPDATE FUNCTION: get_visits_analytics
-- =====================================================
-- Add UTM filter parameters to existing analytics function

DROP FUNCTION IF EXISTS "public"."get_visits_analytics"(
    "_organization_id" "uuid",
    "_campaign_ids" "uuid"[],
    "_tp_ids" "uuid"[],
    "_tag_ids" "uuid"[],
    "_collection_ids" "uuid"[],
    "_include_null_collection" boolean,
    "_start_time" timestamp without time zone,
    "_end_time" timestamp without time zone,
    "_exclude_bot" boolean
);

CREATE OR REPLACE FUNCTION "public"."get_visits_analytics"(
    "_organization_id" "uuid",
    "_campaign_ids" "uuid"[] DEFAULT NULL::"uuid"[],
    "_tp_ids" "uuid"[] DEFAULT NULL::"uuid"[],
    "_tag_ids" "uuid"[] DEFAULT NULL::"uuid"[],
    "_collection_ids" "uuid"[] DEFAULT NULL::"uuid"[],
    "_include_null_collection" BOOLEAN DEFAULT FALSE,
    "_start_time" timestamp without time zone DEFAULT NULL::timestamp without time zone,
    "_end_time" timestamp without time zone DEFAULT NULL::timestamp without time zone,
    "_exclude_bot" BOOLEAN DEFAULT FALSE,
    "_utm_source_values" text[] DEFAULT NULL::text[],
    "_utm_medium_values" text[] DEFAULT NULL::text[],
    "_utm_campaign_values" text[] DEFAULT NULL::text[]
) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$DECLARE
    result JSONB;
    tp_ids_from_tags UUID[];
    filtered_tp_ids UUID[];
BEGIN
    -- If tag_ids are provided, get all touch points linked to those tags
    IF _tag_ids IS NOT NULL AND array_length(_tag_ids, 1) > 0 THEN
        SELECT array_agg(DISTINCT tp_id) INTO tp_ids_from_tags
        FROM tp_tag_links
        WHERE tag_id = ANY(_tag_ids);

        -- Combine with explicitly provided tp_ids if any
        IF _tp_ids IS NOT NULL AND array_length(_tp_ids, 1) > 0 THEN
            _tp_ids := _tp_ids || tp_ids_from_tags;
        ELSE
            _tp_ids := tp_ids_from_tags;
        END IF;
    END IF;

    -- Apply collection filtering to tp_ids
    IF _collection_ids IS NOT NULL AND array_length(_collection_ids, 1) > 0 THEN
        SELECT array_agg(DISTINCT touch_points.id) INTO filtered_tp_ids
        FROM touch_points
        WHERE (
            collection_id = ANY(_collection_ids)
            OR (
                _include_null_collection = true
                AND collection_id IS NULL
            )
        )
        AND (_tp_ids IS NULL OR array_length(_tp_ids, 1) IS NULL OR touch_points.id = ANY(_tp_ids));

        _tp_ids := filtered_tp_ids;
    END IF;

    WITH filtered_visits AS (
        SELECT *
        FROM visits
        WHERE
            organization_id = _organization_id
            AND (_campaign_ids IS NULL OR array_length(_campaign_ids, 1) IS NULL OR campaign_id = ANY(_campaign_ids))
            AND (_tp_ids IS NULL OR array_length(_tp_ids, 1) IS NULL OR tp_id = ANY(_tp_ids))
            AND (_start_time IS NULL OR created_at >= _start_time)
            AND (_end_time IS NULL OR created_at <= _end_time)
            AND (NOT _exclude_bot OR is_bot = FALSE)
            -- UTM filters
            AND (_utm_source_values IS NULL OR array_length(_utm_source_values, 1) IS NULL OR utm_tags->>'utm_source' = ANY(_utm_source_values))
            AND (_utm_medium_values IS NULL OR array_length(_utm_medium_values, 1) IS NULL OR utm_tags->>'utm_medium' = ANY(_utm_medium_values))
            AND (_utm_campaign_values IS NULL OR array_length(_utm_campaign_values, 1) IS NULL OR utm_tags->>'utm_campaign' = ANY(_utm_campaign_values))
    ),
    -- Group by referrer
    referrer_counts AS (
        SELECT
            COALESCE(referrer, 'unknown') AS referrer,
            COUNT(*) AS count
        FROM filtered_visits
        GROUP BY referrer
        ORDER BY count DESC
    ),
    -- Group by type
    type_counts AS (
        SELECT
            COALESCE(type, 'unknown') AS type,
            COUNT(*) AS count
        FROM filtered_visits
        GROUP BY type
        ORDER BY count DESC
    ),
    -- Group by OS
    os_counts AS (
        SELECT
            COALESCE(os, 'unknown') AS os,
            COUNT(*) AS count
        FROM filtered_visits
        GROUP BY os
        ORDER BY count DESC
    ),
    -- Group by platform
    platform_counts AS (
        SELECT
            COALESCE(platform, 'unknown') AS platform,
            COUNT(*) AS count
        FROM filtered_visits
        GROUP BY platform
        ORDER BY count DESC
    ),
    -- Group by country
    country_counts AS (
        SELECT
            COALESCE(country, 'unknown') AS country,
            COUNT(*) AS count
        FROM filtered_visits
        GROUP BY country
        ORDER BY count DESC
    ),
    -- Group by country and city
    country_city_counts AS (
        SELECT
            COALESCE(country, 'unknown') AS country,
            COALESCE(city, 'unknown') AS city,
            COUNT(*) AS count
        FROM filtered_visits
        GROUP BY country, city
        ORDER BY country, count DESC
    ),
    -- Format country and city data
    countries_formatted AS (
        SELECT
            cc.country,
            cnt.count AS total_count,
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'city', city,
                        'count', count
                    )
                )
                FROM country_city_counts cc2
                WHERE cc2.country = cc.country
            ) AS cities
        FROM country_counts cnt
        JOIN country_city_counts cc ON cnt.country = cc.country
        GROUP BY cc.country, cnt.count
        ORDER BY cnt.count DESC
    ),
    -- Get top 3 days with most visits
    top_dates AS (
        SELECT
            DATE(created_at) AS visit_date,
            COUNT(*) AS count
        FROM filtered_visits
        GROUP BY DATE(created_at)
        ORDER BY count DESC
        LIMIT 3
    )

    SELECT jsonb_build_object(
        'referrers', (SELECT jsonb_agg(jsonb_build_object('name', referrer, 'count', count)) FROM referrer_counts),
        'types', (SELECT jsonb_agg(jsonb_build_object('name', type, 'count', count)) FROM type_counts),
        'os', (SELECT jsonb_agg(jsonb_build_object('name', os, 'count', count)) FROM os_counts),
        'platforms', (SELECT jsonb_agg(jsonb_build_object('name', platform, 'count', count)) FROM platform_counts),
        'countries', (SELECT jsonb_agg(
                          jsonb_build_object(
                              'name', country,
                              'count', total_count,
                              'cities', cities
                          )
                      ) FROM countries_formatted),
        'topPerformingDates', (SELECT jsonb_agg(
                                  jsonb_build_object(
                                      'name', to_char(visit_date, 'YYYY-MM-DD'),
                                      'count', count
                                  )
                              ) FROM top_dates),
        'totalVisits', (SELECT COUNT(*) FROM filtered_visits)        
    ) INTO result;

    RETURN COALESCE(result, '{}'::jsonb);
END;$$;

ALTER FUNCTION "public"."get_visits_analytics"(
    "_organization_id" "uuid",
    "_campaign_ids" "uuid"[],
    "_tp_ids" "uuid"[],
    "_tag_ids" "uuid"[],
    "_collection_ids" "uuid"[],
    "_include_null_collection" boolean,
    "_start_time" timestamp without time zone,
    "_end_time" timestamp without time zone,
    "_exclude_bot" boolean,
    "_utm_source_values" text[],
    "_utm_medium_values" text[],
    "_utm_campaign_values" text[]
) OWNER TO "postgres";

-- =====================================================
-- 3. UPDATE FUNCTION: get_raw_visit_data
-- =====================================================
-- Add UTM filter parameters to raw visit data function

DROP FUNCTION IF EXISTS "public"."get_raw_visit_data"(
    "p_organization_id" "uuid",
    "p_last_hours" integer,
    "p_timezone" text,
    "p_is_premium" boolean,
    "p_tp_ids" "uuid"[],
    "p_tag_ids" "uuid"[],
    "p_collection_ids" "uuid"[],
    "p_include_null_collection" boolean,
    "p_exclude_bot" boolean,
    "p_start_time" timestamp with time zone,
    "p_end_time" timestamp with time zone,
    "p_limit" integer,
    "p_offset" integer
);

CREATE OR REPLACE FUNCTION "public"."get_raw_visit_data"(
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
    "p_utm_campaign_values" text[] DEFAULT NULL::text[]
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

    -- Apply collection filtering to tp_ids
    IF p_collection_ids IS NOT NULL AND array_length(p_collection_ids, 1) > 0 THEN
        SELECT array_agg(DISTINCT touch_points.id) INTO filtered_tp_ids
        FROM touch_points
        WHERE (
            -- Touch-points in specified collections
            collection_id = ANY(p_collection_ids)

            -- OR uncategorized touch-points (if includeNull is true)
            OR (
                p_include_null_collection = true
                AND collection_id IS NULL
            )
        )
        -- Also apply existing tp_ids filter if present
        AND (p_tp_ids IS NULL OR p_tp_ids = '{}' OR touch_points.id = ANY(p_tp_ids));

        -- Replace tp_ids with filtered list
        p_tp_ids := filtered_tp_ids;
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
            -- Filter by touch point IDs if provided
            AND (p_tp_ids is null or p_tp_ids = '{}' or v.tp_id = any(p_tp_ids))
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
            -- AND v.is_bot != p_exclude_bot
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

ALTER FUNCTION "public"."get_raw_visit_data"(
    "p_organization_id" "uuid",
    "p_tp_ids" "uuid"[],
    "p_tag_ids" "uuid"[],
    "p_collection_ids" "uuid"[],
    "p_include_null_collection" boolean,
    "p_start_time" timestamp without time zone,
    "p_end_time" timestamp without time zone,
    "p_exclude_bot" boolean,
    "p_utm_source_values" text[],
    "p_utm_medium_values" text[],
    "p_utm_campaign_values" text[]
) OWNER TO "postgres";

-- =====================================================
-- 4. UPDATE FUNCTION: get_visits_by_destinations_v2
-- =====================================================
-- Add UTM filter parameters to destination visits function

DROP FUNCTION IF EXISTS "public"."get_visits_by_destinations_v2"(
    "p_tp_id" "uuid",
    "p_org_id" "uuid",
    "p_start_time" timestamp with time zone,
    "p_end_time" timestamp with time zone,
    "p_timezone" text,
    "p_exclude_bot" boolean,
    "p_collection_ids" "uuid"[],
    "p_include_null_collection" boolean
);

CREATE OR REPLACE FUNCTION "public"."get_visits_by_destinations_v2"(
    "p_tp_id" "uuid",
    "p_org_id" "uuid",
    "p_start_time" timestamp with time zone DEFAULT NULL::timestamp with time zone,
    "p_end_time" timestamp with time zone DEFAULT NULL::timestamp with time zone,
    "p_timezone" text DEFAULT 'UTC'::text,
    "p_exclude_bot" boolean DEFAULT false,
    "p_collection_ids" "uuid"[] DEFAULT NULL::"uuid"[],
    "p_include_null_collection" boolean DEFAULT false,
    "p_utm_source_values" text[] DEFAULT NULL::text[],
    "p_utm_medium_values" text[] DEFAULT NULL::text[],
    "p_utm_campaign_values" text[] DEFAULT NULL::text[]
) RETURNS TABLE(
    "destination" text,
    "segment_type" text,
    "total_visits" bigint,
    "unique_visits" bigint
)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    tp_allowed boolean;
BEGIN
    -- Check if the touch-point passes collection filtering
    -- If collection_ids is NULL or empty, allow all touch-points (no filtering)
    IF p_collection_ids IS NULL OR array_length(p_collection_ids, 1) IS NULL THEN
        tp_allowed := true;
    ELSE
        -- Check if the touch-point is in an allowed collection or is uncategorized
        SELECT EXISTS (
            SELECT 1
            FROM touch_points tp
            WHERE tp.id = p_tp_id
            AND (
                tp.collection_id = ANY(p_collection_ids)
                OR (
                    p_include_null_collection = true
                    AND tp.collection_id IS NULL
                )
            )
        ) INTO tp_allowed;
    END IF;

    -- If touch-point is not allowed, return empty result
    IF NOT tp_allowed THEN
        RETURN;
    END IF;

    -- Return visit data for allowed touch-point
    RETURN QUERY
    SELECT
        v.content_value AS destination,
        v.segment_type AS segment_type,
        COUNT(v.fp) AS total_visits,
        COUNT(DISTINCT v.fp) AS unique_visits
    FROM public.visits v
    WHERE v.organization_id = p_org_id
        AND v.tp_id = p_tp_id
        AND (p_start_time IS NULL OR v.created_at >= p_start_time)
        AND (p_end_time IS NULL OR v.created_at <= p_end_time)
        AND (NOT p_exclude_bot OR v.is_bot = FALSE)
        -- UTM filters
        AND (p_utm_source_values IS NULL OR p_utm_source_values = '{}' OR v.utm_tags->>'utm_source' = ANY(p_utm_source_values))
        AND (p_utm_medium_values IS NULL OR p_utm_medium_values = '{}' OR v.utm_tags->>'utm_medium' = ANY(p_utm_medium_values))
        AND (p_utm_campaign_values IS NULL OR p_utm_campaign_values = '{}' OR v.utm_tags->>'utm_campaign' = ANY(p_utm_campaign_values))
    GROUP BY v.content_value, v.segment_type
    ORDER BY total_visits DESC;
END;
$$;

ALTER FUNCTION "public"."get_visits_by_destinations_v2"(
    "p_tp_id" "uuid",
    "p_org_id" "uuid",
    "p_start_time" timestamp with time zone,
    "p_end_time" timestamp with time zone,
    "p_timezone" text,
    "p_exclude_bot" boolean,
    "p_collection_ids" "uuid"[],
    "p_include_null_collection" boolean,
    "p_utm_source_values" text[],
    "p_utm_medium_values" text[],
    "p_utm_campaign_values" text[]
) OWNER TO "postgres";

-- =====================================================
-- 5. CREATE INDEXES FOR PERFORMANCE
-- =====================================================
-- Add indexes to optimize UTM filtering queries

-- GIN index for JSONB utm_tags column (general queries)
CREATE INDEX IF NOT EXISTS idx_visits_utm_tags_gin
ON visits USING GIN (utm_tags);

-- Expression indexes for individual UTM parameters (specific equality queries)
CREATE INDEX IF NOT EXISTS idx_visits_utm_source
ON visits ((utm_tags->>'utm_source'))
WHERE utm_tags->>'utm_source' IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_visits_utm_medium
ON visits ((utm_tags->>'utm_medium'))
WHERE utm_tags->>'utm_medium' IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_visits_utm_campaign
ON visits ((utm_tags->>'utm_campaign'))
WHERE utm_tags->>'utm_campaign' IS NOT NULL;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- This migration adds:
-- 1. get_distinct_utm_values() - Fetches distinct UTM values for filter dropdowns
-- 2. Updated get_visits_analytics() - Supports UTM filtering in analytics
-- 3. Updated get_raw_visit_data() - Supports UTM filtering in raw visit data
-- 4. Updated get_visits_by_destinations_v2() - Supports UTM filtering in destination visits
-- 5. Performance indexes on utm_tags column and individual UTM parameters
