CREATE OR REPLACE FUNCTION public.get_ranking_by_destinations(
    _organization_id uuid,
    _type text, -- 'full_urls' or 'base_urls'
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
    -- Handle tag_ids
    IF _tag_ids IS NOT NULL AND array_length(_tag_ids, 1) > 0 THEN
        SELECT array_agg(DISTINCT tp_id)
        INTO tp_ids_from_tags
        FROM tp_tag_links
        WHERE tag_id = ANY(_tag_ids);

        IF _tp_ids IS NOT NULL AND array_length(_tp_ids, 1) > 0 THEN
            _tp_ids := _tp_ids || tp_ids_from_tags;
        ELSE
            _tp_ids := tp_ids_from_tags;
        END IF;
    END IF;

    -- Collection filtering
    IF _collection_ids IS NOT NULL THEN
        has_collection_filter := true;

        SELECT array_agg(DISTINCT tp.id)
        INTO filtered_tp_ids
        FROM touch_points tp
        WHERE (
            tp.collection_id = ANY(_collection_ids)
            OR (_include_null_collection = true AND tp.collection_id IS NULL AND tp.user_id = _user_id)
        )
        AND (
            _tp_ids IS NULL
            OR array_length(_tp_ids, 1) IS NULL
            OR tp.id = ANY(_tp_ids)
        );

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
          AND content_value IS NOT NULL
          AND content_value != ''
    ),

    ranking_by_full_urls AS (
        SELECT
            v.content_value AS destination,
            'full' AS segment,
            COUNT(v.id) AS count,
            COUNT(DISTINCT v.fp) FILTER (WHERE v.fp IS NOT NULL) AS unique_count
        FROM filtered_visits v
        GROUP BY v.content_value
        ORDER BY count DESC
    ),

    ranking_by_base_urls AS (
        SELECT
            CASE 
                WHEN v.content_value ~ '^https?://' THEN
                    -- Extract domain + path (without query params or hash)
                    regexp_replace(
                        regexp_replace(v.content_value, '^(https?://[^?#]+).*$', '\1'),
                        '^(https?://)www\.', '\1'
                    )
                ELSE
                    v.content_value
            END AS destination,
            'base' AS segment,
            COUNT(v.id) AS count,
            COUNT(DISTINCT v.fp) FILTER (WHERE v.fp IS NOT NULL) AS unique_count
        FROM filtered_visits v
        GROUP BY 
            CASE 
                WHEN v.content_value ~ '^https?://' THEN
                    -- Extract domain + path (without query params or hash)
                    regexp_replace(
                        regexp_replace(v.content_value, '^(https?://[^?#]+).*$', '\1'),
                        '^(https?://)www\.', '\1'
                    )
                ELSE
                    v.content_value
            END
        ORDER BY count DESC
    )

    SELECT 
        CASE 
            WHEN _type = 'full_urls' THEN
                jsonb_build_object(
                    'data', (SELECT jsonb_agg(jsonb_build_object('destination', destination, 'segment', segment, 'count', count, 'unique_count', unique_count)) FROM ranking_by_full_urls),
                    'type', 'full_urls',
                    'total', (SELECT COUNT(*) FROM filtered_visits),
                    'total_unique', (SELECT COUNT(DISTINCT fp) FROM filtered_visits WHERE fp IS NOT NULL)
                )
            WHEN _type = 'base_urls' THEN
                jsonb_build_object(
                    'data', (SELECT jsonb_agg(jsonb_build_object('destination', destination, 'segment', segment, 'count', count, 'unique_count', unique_count)) FROM ranking_by_base_urls),
                    'type', 'base_urls',
                    'total', (SELECT COUNT(*) FROM filtered_visits),
                    'total_unique', (SELECT COUNT(DISTINCT fp) FROM filtered_visits WHERE fp IS NOT NULL)
                )
            ELSE
                jsonb_build_object(
                    'data', '[]'::jsonb,
                    'type', _type,
                    'total', 0,
                    'total_unique', 0
                )
        END
    INTO result;

    RETURN COALESCE(result, '{}'::jsonb);
END;
$function$;
