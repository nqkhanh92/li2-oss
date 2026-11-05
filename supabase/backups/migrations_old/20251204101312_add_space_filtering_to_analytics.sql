CREATE OR REPLACE FUNCTION public.get_visits_analytics(_organization_id uuid, _campaign_ids uuid[] DEFAULT NULL::uuid[], _tp_ids uuid[] DEFAULT NULL::uuid[], _tag_ids uuid[] DEFAULT NULL::uuid[], _collection_ids uuid[] DEFAULT NULL::uuid[], _include_null_collection boolean DEFAULT false, _start_time timestamp without time zone DEFAULT NULL::timestamp without time zone, _end_time timestamp without time zone DEFAULT NULL::timestamp without time zone, _exclude_bot boolean DEFAULT false, _utm_source_values text[] DEFAULT NULL::text[], _utm_medium_values text[] DEFAULT NULL::text[], _utm_campaign_values text[] DEFAULT NULL::text[])
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$DECLARE
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
        'totalVisits', (SELECT COUNT(*) FROM filtered_visits),
        'totalUniqueVisits', (
            SELECT COUNT(DISTINCT fp)
            FROM filtered_visits
            WHERE fp IS NOT NULL
        )
    ) INTO result;

    RETURN COALESCE(result, '{}'::jsonb);
END;$function$
