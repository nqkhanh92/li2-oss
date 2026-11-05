-- RPC function to get full touchpoint attribution data with filters
-- Similar to get_visits_analytics_v4 but returns per-touchpoint metrics
CREATE OR REPLACE FUNCTION public.get_touchpoint_attribution_full(
    _organization_id uuid,
    _tag_ids uuid[] DEFAULT NULL,
    _tp_ids uuid[] DEFAULT NULL,
    _collection_ids uuid[] DEFAULT NULL,
    _include_null_collection boolean DEFAULT false,
    _start_time timestamp without time zone DEFAULT NULL,
    _end_time timestamp without time zone DEFAULT NULL,
    _exclude_bot boolean DEFAULT true,
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
    -- Handle tag_ids to get associated touchpoint IDs
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

    -- Get touchpoint attribution data
    WITH filtered_visits AS (
        SELECT 
            v.tp_id,
            v.fp,
            v.created_at
        FROM visits v
        WHERE v.organization_id = _organization_id
          AND (
              CASE
                  WHEN has_collection_filter THEN v.tp_id = ANY(_tp_ids)
                  ELSE (_tp_ids IS NULL OR array_length(_tp_ids, 1) IS NULL OR v.tp_id = ANY(_tp_ids))
              END
          )
          AND (_start_time IS NULL OR v.created_at >= _start_time)
          AND (_end_time IS NULL OR v.created_at <= _end_time)
          AND (NOT _exclude_bot OR v.is_bot = FALSE)
          AND (_interaction_types IS NULL OR array_length(_interaction_types, 1) IS NULL OR v.type = ANY(_interaction_types))
          AND (_utm_source_values IS NULL OR array_length(_utm_source_values, 1) IS NULL OR v.utm_tags->>'utm_source' = ANY(_utm_source_values))
          AND (_utm_medium_values IS NULL OR array_length(_utm_medium_values, 1) IS NULL OR v.utm_tags->>'utm_medium' = ANY(_utm_medium_values))
          AND (_utm_campaign_values IS NULL OR array_length(_utm_campaign_values, 1) IS NULL OR v.utm_tags->>'utm_campaign' = ANY(_utm_campaign_values))
    ),
    
    filtered_conversions AS (
        SELECT 
            ce.touch_point_id,
            ce.event_type,
            ce.amount,
            ce.currency
        FROM conversion_events ce
        WHERE ce.organization_id = _organization_id
          AND ce.touch_point_id IS NOT NULL
          AND (
              CASE
                  WHEN has_collection_filter THEN ce.touch_point_id = ANY(_tp_ids)
                  ELSE (_tp_ids IS NULL OR array_length(_tp_ids, 1) IS NULL OR ce.touch_point_id = ANY(_tp_ids))
              END
          )
          AND (_start_time IS NULL OR ce.created_at >= _start_time)
          AND (_end_time IS NULL OR ce.created_at <= _end_time)
    ),
    
    visit_counts AS (
        SELECT 
            tp_id,
            COUNT(*) as visit_count,
            COUNT(DISTINCT fp) FILTER (WHERE fp IS NOT NULL) as unique_visit_count
        FROM filtered_visits
        WHERE tp_id IS NOT NULL
        GROUP BY tp_id
    ),
    
    lead_counts AS (
        SELECT 
            touch_point_id,
            COUNT(*) as lead_count
        FROM filtered_conversions
        WHERE event_type = 'lead'
        GROUP BY touch_point_id
    ),
    
    -- Group sales by touchpoint AND currency to preserve currency info
    sale_by_currency AS (
        SELECT 
            touch_point_id,
            UPPER(COALESCE(currency, 'USD')) as currency,
            COUNT(*) as sale_count,
            SUM(COALESCE(amount, 0)) as revenue
        FROM filtered_conversions
        WHERE event_type = 'sale'
        GROUP BY touch_point_id, UPPER(COALESCE(currency, 'USD'))
    ),
    
    -- Aggregate sales data per touchpoint with currency breakdown
    sale_metrics AS (
        SELECT 
            touch_point_id,
            SUM(sale_count) as sale_count,
            jsonb_object_agg(currency, revenue) as revenue_by_currency
        FROM sale_by_currency
        GROUP BY touch_point_id
    ),
    
    touchpoint_data AS (
        SELECT 
            tp.id as touchpoint_id,
            tp.name as touchpoint_name,
            tp.short_url as touchpoint_short_url,
            COALESCE(vc.visit_count, 0) as visit_count,
            COALESCE(vc.unique_visit_count, 0) as unique_visit_count,
            COALESCE(lc.lead_count, 0) as lead_count,
            COALESCE(sm.sale_count, 0) as sale_count,
            COALESCE(sm.revenue_by_currency, '{}'::jsonb) as revenue_by_currency,
            CASE 
                WHEN COALESCE(lc.lead_count, 0) > 0 
                THEN ROUND((COALESCE(sm.sale_count, 0)::numeric / lc.lead_count::numeric * 100), 1)
                ELSE 0 
            END as conversion_rate
        FROM touch_points tp
        LEFT JOIN visit_counts vc ON tp.id = vc.tp_id
        LEFT JOIN lead_counts lc ON tp.id = lc.touch_point_id
        LEFT JOIN sale_metrics sm ON tp.id = sm.touch_point_id
        WHERE tp.organization_id = _organization_id
          AND (
              CASE
                  WHEN has_collection_filter THEN tp.id = ANY(_tp_ids)
                  ELSE (_tp_ids IS NULL OR array_length(_tp_ids, 1) IS NULL OR tp.id = ANY(_tp_ids))
              END
          )
          -- Only include touchpoints with some activity
          AND (
              COALESCE(vc.visit_count, 0) > 0 
              OR COALESCE(lc.lead_count, 0) > 0 
              OR COALESCE(sm.sale_count, 0) > 0
          )
    ),
    
    org_currency AS (
        SELECT default_currency
        FROM organizations
        WHERE id = _organization_id
        LIMIT 1
    )
    
    SELECT jsonb_build_object(
        'touchpoints', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'touchPointId', touchpoint_id,
                    'touchPointName', touchpoint_name,
                    'touchPointShortUrl', touchpoint_short_url,
                    'visitCount', visit_count,
                    'uniqueVisitCount', unique_visit_count,
                    'leadCount', lead_count,
                    'saleCount', sale_count,
                    'conversionRate', conversion_rate,
                    'revenueByCurrency', revenue_by_currency
                )
                ORDER BY sale_count DESC, lead_count DESC
            ), '[]'::jsonb)
            FROM touchpoint_data
        ),
        'currency', COALESCE((SELECT default_currency FROM org_currency), 'USD')
    )
    INTO result;

    RETURN COALESCE(result, '{}'::jsonb);
END;
$function$;
