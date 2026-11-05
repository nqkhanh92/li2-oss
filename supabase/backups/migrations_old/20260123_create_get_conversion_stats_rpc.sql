-- Create RPC function for conversion statistics with filtering
CREATE OR REPLACE FUNCTION public.get_conversion_stats(
    _organization_id uuid,
    _viewable_tp_ids uuid[] DEFAULT NULL,
    _tp_ids uuid[] DEFAULT NULL,
    _tag_ids uuid[] DEFAULT NULL,
    _collection_ids uuid[] DEFAULT NULL,
    _start_date timestamp without time zone DEFAULT NULL,
    _end_date timestamp without time zone DEFAULT NULL,
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
    leads_count bigint;
    customers_count bigint;
    sales_count bigint;
    revenue_data jsonb;
    default_currency text;
BEGIN
    -- Start with viewable touch points as the base
    final_tp_ids := _viewable_tp_ids;

    -- Apply tp_ids filter if provided
    IF _tp_ids IS NOT NULL AND array_length(_tp_ids, 1) > 0 THEN
        IF final_tp_ids IS NOT NULL THEN
            -- Intersect with viewable
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
            -- Intersect with current filter
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
            -- Intersect with current filter
            SELECT array_agg(DISTINCT tp_id)
            INTO final_tp_ids
            FROM unnest(final_tp_ids) AS tp_id
            WHERE tp_id = ANY(tp_ids_from_collections);
        ELSE
            final_tp_ids := tp_ids_from_collections;
        END IF;
    END IF;

    -- Get organization's default currency
    SELECT COALESCE(o.default_currency, 'USD')
    INTO default_currency
    FROM organizations o
    WHERE o.id = _organization_id;

    -- Count leads with filters
    SELECT COUNT(*)
    INTO leads_count
    FROM conversion_events
    WHERE organization_id = _organization_id
      AND event_type = 'lead'
      AND (final_tp_ids IS NULL OR touch_point_id = ANY(final_tp_ids))
      AND (_start_date IS NULL OR created_at >= _start_date)
      AND (_end_date IS NULL OR created_at <= _end_date);

    -- Count customers (org-wide, no date/touchpoint filter - customers persist)
    SELECT COUNT(*)
    INTO customers_count
    FROM customer_profiles
    WHERE organization_id = _organization_id;

    -- Count sales with filters
    SELECT COUNT(*)
    INTO sales_count
    FROM conversion_events
    WHERE organization_id = _organization_id
      AND event_type = 'sale'
      AND (final_tp_ids IS NULL OR touch_point_id = ANY(final_tp_ids))
      AND (_start_date IS NULL OR created_at >= _start_date)
      AND (_end_date IS NULL OR created_at <= _end_date);

    -- Calculate revenue grouped by currency
    WITH revenue_by_currency AS (
        SELECT
            COALESCE(ce.currency, default_currency) AS currency,
            SUM(COALESCE(ce.amount, 0)) AS total_amount
        FROM conversion_events ce
        WHERE ce.organization_id = _organization_id
          AND ce.event_type = 'sale'
          AND ce.amount IS NOT NULL
          AND (final_tp_ids IS NULL OR ce.touch_point_id = ANY(final_tp_ids))
          AND (_start_date IS NULL OR ce.created_at >= _start_date)
          AND (_end_date IS NULL OR ce.created_at <= _end_date)
        GROUP BY ce.currency
    )
    SELECT jsonb_object_agg(
        COALESCE(UPPER(currency), UPPER(default_currency)),
        total_amount
    )
    INTO revenue_data
    FROM revenue_by_currency;

    -- Build result object
    SELECT jsonb_build_object(
        'leads', leads_count,
        'customers', customers_count,
        'sales', sales_count,
        'revenue_by_currency', COALESCE(revenue_data, '{}'::jsonb),
        'default_currency', default_currency
    )
    INTO result;

    RETURN result;
END;
$function$;
