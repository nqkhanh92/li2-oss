CREATE OR REPLACE FUNCTION public.get_ranking_by_utm_parameters(
    _organization_id uuid,
    _type text,
    _tag_ids uuid[] DEFAULT NULL,
    _tp_ids uuid[] DEFAULT NULL,
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
    utm_field text;
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

    -- Determine which UTM field to query based on type
    utm_field := CASE _type
        WHEN 'by_source' THEN 'utm_source'
        WHEN 'by_medium' THEN 'utm_medium'
        WHEN 'by_campaign' THEN 'utm_campaign'
        WHEN 'by_term' THEN 'utm_term'
        WHEN 'by_content' THEN 'utm_content'
        ELSE 'utm_source'
    END;

    WITH filtered_visits AS (
        SELECT *
        FROM visits
        WHERE organization_id = _organization_id
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
          AND utm_tags->>utm_field IS NOT NULL
          AND utm_tags->>utm_field != ''
    ),

    total_counts AS (
        SELECT 
            COUNT(id) AS total,
            COUNT(DISTINCT fp) FILTER (WHERE fp IS NOT NULL) AS total_unique
        FROM filtered_visits
    ),

    ranking_data AS (
        SELECT
            v.utm_tags->>utm_field AS utm_value,
            COUNT(v.id) AS count,
            COUNT(DISTINCT v.fp) FILTER (WHERE v.fp IS NOT NULL) AS unique_count
        FROM filtered_visits v
        GROUP BY v.utm_tags->>utm_field
        ORDER BY count DESC
        LIMIT 100
    )

    SELECT jsonb_build_object(
        'data', COALESCE((SELECT jsonb_agg(jsonb_build_object('utm_value', utm_value, 'count', count, 'unique_count', unique_count)) FROM ranking_data), '[]'::jsonb),
        'type', _type,
        'total', (SELECT total FROM total_counts),
        'total_unique', (SELECT total_unique FROM total_counts)
    )
    INTO result;

    RETURN COALESCE(result, '{}'::jsonb);
END;
$function$;
