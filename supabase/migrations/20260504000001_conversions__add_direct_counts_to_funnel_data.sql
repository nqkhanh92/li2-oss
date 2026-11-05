CREATE OR REPLACE FUNCTION public.get_funnel_data(
    _organization_id uuid,
    _viewable_tp_ids uuid[] DEFAULT NULL::uuid[],
    _tp_ids uuid[] DEFAULT NULL::uuid[],
    _tag_ids uuid[] DEFAULT NULL::uuid[],
    _collection_ids uuid[] DEFAULT NULL::uuid[],
    _start_date timestamp without time zone DEFAULT NULL::timestamp without time zone,
    _end_date timestamp without time zone DEFAULT NULL::timestamp without time zone,
    _exclude_bot boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
    result jsonb;
    tp_ids_from_tags uuid[];
    tp_ids_from_collections uuid[];
    final_tp_ids uuid[];
    clicks_count bigint;
    leads_count bigint;
    sales_count bigint;
    direct_visits_count bigint;
    direct_leads_count bigint;
    direct_sales_count bigint;
    total_visits_count bigint;
BEGIN
    -- Start with viewable touch points as the base
    final_tp_ids := _viewable_tp_ids;

    -- Apply tp_ids filter if provided
    IF _tp_ids IS NOT NULL AND array_length(_tp_ids, 1) > 0 THEN
        IF final_tp_ids IS NOT NULL THEN
            SELECT array_agg(DISTINCT tp_id)
            INTO final_tp_ids
            FROM unnest(final_tp_ids) AS tp_id
            WHERE tp_id = ANY(_tp_ids);
        ELSE
            final_tp_ids := _tp_ids;
        END IF;
    END IF;

    -- Apply tag_ids filter if provided
    IF _tag_ids IS NOT NULL AND array_length(_tag_ids, 1) > 0 THEN
        SELECT array_agg(DISTINCT tp_id)
        INTO tp_ids_from_tags
        FROM tp_tag_links
        WHERE tag_id = ANY(_tag_ids);

        IF final_tp_ids IS NOT NULL THEN
            SELECT array_agg(DISTINCT tp_id)
            INTO final_tp_ids
            FROM unnest(final_tp_ids) AS tp_id
            WHERE tp_id = ANY(tp_ids_from_tags);
        ELSE
            final_tp_ids := tp_ids_from_tags;
        END IF;
    END IF;

    -- Apply collection_ids filter if provided
    IF _collection_ids IS NOT NULL AND array_length(_collection_ids, 1) > 0 THEN
        SELECT array_agg(DISTINCT id)
        INTO tp_ids_from_collections
        FROM touch_points
        WHERE collection_id = ANY(_collection_ids);

        IF final_tp_ids IS NOT NULL THEN
            SELECT array_agg(DISTINCT tp_id)
            INTO final_tp_ids
            FROM unnest(final_tp_ids) AS tp_id
            WHERE tp_id = ANY(tp_ids_from_collections);
        ELSE
            final_tp_ids := tp_ids_from_collections;
        END IF;
    END IF;

    -- Count clicks (visits) with filters
    SELECT COUNT(*)
    INTO clicks_count
    FROM visits
    WHERE organization_id = _organization_id
      AND (_exclude_bot = false OR is_bot = false)
      AND (final_tp_ids IS NULL OR tp_id = ANY(final_tp_ids))
      AND (_start_date IS NULL OR created_at >= _start_date)
      AND (_end_date IS NULL OR created_at <= _end_date);

    -- Count leads with filters (excluding direct leads with empty click_id)
    SELECT COUNT(*)
    INTO leads_count
    FROM conversion_events
    WHERE organization_id = _organization_id
      AND event_type = 'lead'
      AND click_id != ''
      AND (final_tp_ids IS NULL OR touch_point_id = ANY(final_tp_ids))
      AND (_start_date IS NULL OR created_at >= _start_date)
      AND (_end_date IS NULL OR created_at <= _end_date);

    -- Count sales with filters (excluding direct sales with empty click_id)
    SELECT COUNT(*)
    INTO sales_count
    FROM conversion_events
    WHERE organization_id = _organization_id
      AND event_type = 'sale'
      AND click_id != ''
      AND (final_tp_ids IS NULL OR touch_point_id = ANY(final_tp_ids))
      AND (_start_date IS NULL OR created_at >= _start_date)
      AND (_end_date IS NULL OR created_at <= _end_date);

    -- Count direct visits: sessions with no li2_cid (not attributed to any tracked link)
    SELECT COUNT(*)
    INTO direct_visits_count
    FROM sessions
    WHERE organization_id = _organization_id
      AND li2_cid IS NULL
      AND (_exclude_bot = false OR is_bot = false)
      AND (_start_date IS NULL OR started_at >= _start_date)
      AND (_end_date IS NULL OR started_at <= _end_date);

    -- Count direct leads: conversion events with empty click_id (no link attribution)
    SELECT COUNT(*)
    INTO direct_leads_count
    FROM conversion_events
    WHERE organization_id = _organization_id
      AND event_type = 'lead'
      AND click_id = ''
      AND (_start_date IS NULL OR created_at >= _start_date)
      AND (_end_date IS NULL OR created_at <= _end_date);

    -- Count direct sales: conversion events with empty click_id (no link attribution)
    SELECT COUNT(*)
    INTO direct_sales_count
    FROM conversion_events
    WHERE organization_id = _organization_id
      AND event_type = 'sale'
      AND click_id = ''
      AND (_start_date IS NULL OR created_at >= _start_date)
      AND (_end_date IS NULL OR created_at <= _end_date);

    -- Total visits = attributed (visits table) + direct (sessions without li2_cid)
    total_visits_count := clicks_count + direct_visits_count;

    SELECT jsonb_build_object(
        'clicks', clicks_count,
        'leads', leads_count,
        'sales', sales_count,
        'direct_visits', direct_visits_count,
        'direct_leads', direct_leads_count,
        'direct_sales', direct_sales_count,
        'clicks_to_leads_rate', CASE WHEN total_visits_count > 0 THEN ROUND(((leads_count + direct_leads_count)::numeric / total_visits_count::numeric * 100)::numeric, 2) ELSE 0 END,
        'leads_to_sales_rate', CASE WHEN (leads_count + direct_leads_count) > 0 THEN ROUND(((sales_count + direct_sales_count)::numeric / (leads_count + direct_leads_count)::numeric * 100)::numeric, 2) ELSE 0 END,
        'overall_rate', CASE WHEN total_visits_count > 0 THEN ROUND(((sales_count + direct_sales_count)::numeric / total_visits_count::numeric * 100)::numeric, 2) ELSE 0 END
    )
    INTO result;

    RETURN result;
END;
$function$;
