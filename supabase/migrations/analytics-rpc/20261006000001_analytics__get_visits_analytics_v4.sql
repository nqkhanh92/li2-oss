-- Analytics RPC thiếu trên LiHi — phần 1/2: get_visits_analytics_v4
--
-- VÌ SAO: DB LiHi dựng từ snapshot cũ (không có schema_migrations), chỉ có get_visits_analytics
-- (12 tham số). Code gọi get_visits_analytics_v4 (analytic.repository.ts, route /analytics/by-tags)
-- nên tab Analytics của short link trả PGRST202 và FE hiện "NO DATA". Repo không còn định nghĩa
-- v4 ở đâu (kể cả git history) nên file này DỰNG LẠI từ:
--   - thân get_visits_analytics (backups/migrations_old/20251207164137_add_utm_filters.sql)
--   - cách lọc _user_id / _interaction_types của get_ranking_by_* (backups/functions/)
--   - hình dạng trả về AnalyticByTagDataType (app/api/organizations/[org_id]/analytics/by-tags/route.ts)
-- Khác biệt có thể có so với bản production: không xác minh được. Nếu lấy được bản gốc từ
-- Supabase production thì thay file này.
--
-- Áp tay bằng psql trên LiHi. Hoàn tác: DROP FUNCTION public.get_visits_analytics_v4(...).

CREATE OR REPLACE FUNCTION public.get_visits_analytics_v4(
    _organization_id uuid,
    _campaign_ids uuid[] DEFAULT NULL,
    _tp_ids uuid[] DEFAULT NULL,
    _tag_ids uuid[] DEFAULT NULL,
    _collection_ids uuid[] DEFAULT NULL,
    _include_null_collection boolean DEFAULT false,
    _start_time timestamp without time zone DEFAULT NULL,
    _end_time timestamp without time zone DEFAULT NULL,
    _exclude_bot boolean DEFAULT false,
    _utm_source_values text[] DEFAULT NULL,
    _utm_medium_values text[] DEFAULT NULL,
    _utm_campaign_values text[] DEFAULT NULL,
    _user_id uuid DEFAULT NULL,
    _interaction_types text[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
    result jsonb;
    tp_ids_from_tags uuid[];
    filtered_tp_ids uuid[];
    has_collection_filter boolean := false;
BEGIN
    IF _tag_ids IS NOT NULL AND array_length(_tag_ids, 1) > 0 THEN
        SELECT array_agg(DISTINCT tp_id) INTO tp_ids_from_tags
        FROM tp_tag_links
        WHERE tag_id = ANY(_tag_ids);

        IF _tp_ids IS NOT NULL AND array_length(_tp_ids, 1) > 0 THEN
            _tp_ids := _tp_ids || tp_ids_from_tags;
        ELSE
            _tp_ids := tp_ids_from_tags;
        END IF;
    END IF;

    IF _collection_ids IS NOT NULL THEN
        has_collection_filter := true;

        SELECT array_agg(DISTINCT tp.id) INTO filtered_tp_ids
        FROM touch_points tp
        WHERE (
            tp.collection_id = ANY(_collection_ids)
            OR (_include_null_collection = true AND tp.collection_id IS NULL AND tp.user_id = _user_id)
        )
        AND (_tp_ids IS NULL OR array_length(_tp_ids, 1) IS NULL OR tp.id = ANY(_tp_ids));

        _tp_ids := COALESCE(filtered_tp_ids, ARRAY[]::uuid[]);
    END IF;

    WITH filtered_visits AS (
        SELECT *
        FROM visits
        WHERE organization_id = _organization_id
          AND (_campaign_ids IS NULL OR array_length(_campaign_ids, 1) IS NULL OR campaign_id = ANY(_campaign_ids))
          AND (
              CASE
                  WHEN has_collection_filter THEN tp_id = ANY(_tp_ids)
                  ELSE (_tp_ids IS NULL OR array_length(_tp_ids, 1) IS NULL OR tp_id = ANY(_tp_ids))
              END
          )
          AND (_start_time IS NULL OR created_at >= _start_time)
          AND (_end_time IS NULL OR created_at <= _end_time)
          AND (NOT _exclude_bot OR is_bot = FALSE)
          AND (_interaction_types IS NULL OR array_length(_interaction_types, 1) IS NULL OR type = ANY(_interaction_types))
          AND (_utm_source_values IS NULL OR array_length(_utm_source_values, 1) IS NULL OR utm_tags->>'utm_source' = ANY(_utm_source_values))
          AND (_utm_medium_values IS NULL OR array_length(_utm_medium_values, 1) IS NULL OR utm_tags->>'utm_medium' = ANY(_utm_medium_values))
          AND (_utm_campaign_values IS NULL OR array_length(_utm_campaign_values, 1) IS NULL OR utm_tags->>'utm_campaign' = ANY(_utm_campaign_values))
    ),
    referrer_counts AS (
        SELECT COALESCE(referrer, 'unknown') AS referrer, COUNT(*) AS count
        FROM filtered_visits GROUP BY referrer ORDER BY count DESC
    ),
    type_counts AS (
        SELECT COALESCE(type, 'unknown') AS type, COUNT(*) AS count
        FROM filtered_visits GROUP BY type ORDER BY count DESC
    ),
    os_counts AS (
        SELECT COALESCE(os, 'unknown') AS os, COUNT(*) AS count
        FROM filtered_visits GROUP BY os ORDER BY count DESC
    ),
    platform_counts AS (
        SELECT COALESCE(platform, 'unknown') AS platform, COUNT(*) AS count
        FROM filtered_visits GROUP BY platform ORDER BY count DESC
    ),
    country_counts AS (
        SELECT COALESCE(country, 'unknown') AS country, COUNT(*) AS count
        FROM filtered_visits GROUP BY country ORDER BY count DESC
    ),
    country_city_counts AS (
        SELECT COALESCE(country, 'unknown') AS country, COALESCE(city, 'unknown') AS city, COUNT(*) AS count
        FROM filtered_visits GROUP BY country, city ORDER BY country, count DESC
    ),
    countries_formatted AS (
        SELECT
            cc.country,
            cnt.count AS total_count,
            (
                SELECT jsonb_agg(jsonb_build_object('city', city, 'count', count))
                FROM country_city_counts cc2
                WHERE cc2.country = cc.country
            ) AS cities
        FROM country_counts cnt
        JOIN country_city_counts cc ON cnt.country = cc.country
        GROUP BY cc.country, cnt.count
        ORDER BY cnt.count DESC
    ),
    by_date_type AS (
        SELECT DATE(created_at) AS visit_date, COALESCE(type, 'unknown') AS type, COUNT(*) AS count
        FROM filtered_visits
        GROUP BY DATE(created_at), type
    ),
    by_date AS (
        SELECT
            DATE(created_at) AS visit_date,
            COUNT(*) AS total,
            COUNT(DISTINCT fp) FILTER (WHERE fp IS NOT NULL) AS unique_count
        FROM filtered_visits
        GROUP BY DATE(created_at)
    ),
    performance_by_date AS (
        SELECT
            to_char(d.visit_date, 'YYYY-MM-DD') AS day,
            jsonb_build_object(
                'total', d.total,
                'unique', d.unique_count,
                'by_interaction_types', COALESCE(
                    (SELECT jsonb_object_agg(bt.type, bt.count) FROM by_date_type bt WHERE bt.visit_date = d.visit_date),
                    '{}'::jsonb
                )
            ) AS value
        FROM by_date d
        ORDER BY d.visit_date
    )
    SELECT jsonb_build_object(
        'referrers', COALESCE((SELECT jsonb_agg(jsonb_build_object('name', referrer, 'count', count)) FROM referrer_counts), '[]'::jsonb),
        'types', COALESCE((SELECT jsonb_agg(jsonb_build_object('name', type, 'count', count)) FROM type_counts), '[]'::jsonb),
        'os', COALESCE((SELECT jsonb_agg(jsonb_build_object('name', os, 'count', count)) FROM os_counts), '[]'::jsonb),
        'platforms', COALESCE((SELECT jsonb_agg(jsonb_build_object('name', platform, 'count', count)) FROM platform_counts), '[]'::jsonb),
        'countries', COALESCE((SELECT jsonb_agg(jsonb_build_object('name', country, 'count', total_count, 'cities', cities)) FROM countries_formatted), '[]'::jsonb),
        'totalVisits', (SELECT COUNT(*) FROM filtered_visits),
        'totalUniqueVisits', (SELECT COUNT(DISTINCT fp) FROM filtered_visits WHERE fp IS NOT NULL),
        'interaction_types', COALESCE((SELECT jsonb_agg(DISTINCT type) FROM filtered_visits WHERE type IS NOT NULL), '[]'::jsonb),
        'performance_by_date', COALESCE((SELECT jsonb_object_agg(day, value) FROM performance_by_date), '{}'::jsonb)
    ) INTO result;

    RETURN COALESCE(result, '{}'::jsonb);
END;
$function$;
