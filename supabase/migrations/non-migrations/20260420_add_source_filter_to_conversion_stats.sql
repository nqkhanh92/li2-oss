-- Add _source filter to get_conversion_stats RPC + drop orphan overload.
--
-- Motivation: ConversionFilters exposes Source (All / Attributed / Direct) and
-- the conversions list query honours it, but the stats KPI cards above the
-- list still show all-source totals regardless of filter. This migration
-- threads _source through the RPC so the cards stay in sync.
--
-- Semantic change for Total Customers: previously org-wide "customers
-- persist" count. Now counts customers acquired within the active date
-- range whose first_touch_point_id matches the filters. Consistent with
-- Leads / Sales / Revenue.
--
-- Non-owner visibility: conversion.service.getStats always resolves
-- _viewable_tp_ids. For a scoped array, the tp guard
--   (final_tp_ids IS NULL OR touch_point_id = ANY(final_tp_ids))
-- would drop rows with NULL touch_point_id (since NULL = ANY(arr) is NULL).
-- When _source allows direct rows, we OR-in `IS NULL` so direct conversions
-- remain visible. This mirrors the OR(touch_point_id.is.null) shape used by
-- conversion.service.findAllConversions for the list query.

-- 1. Drop the orphan overload (never called; signature has
--    _include_null_collection + _user_id, no _viewable_tp_ids).
DROP FUNCTION IF EXISTS public.get_conversion_stats(
  uuid, uuid[], uuid[], uuid[], boolean, timestamp without time zone,
  timestamp without time zone, boolean, uuid
);

-- 2. Replace the live overload with the _source-aware version.
CREATE OR REPLACE FUNCTION public.get_conversion_stats(
    _organization_id uuid,
    _viewable_tp_ids uuid[] DEFAULT NULL,
    _tp_ids uuid[] DEFAULT NULL,
    _tag_ids uuid[] DEFAULT NULL,
    _collection_ids uuid[] DEFAULT NULL,
    _start_date timestamp without time zone DEFAULT NULL,
    _end_date timestamp without time zone DEFAULT NULL,
    _exclude_bot boolean DEFAULT false,
    _source text DEFAULT NULL
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

    -- Get organization's default currency
    SELECT COALESCE(o.default_currency, 'USD')
    INTO default_currency
    FROM organizations o
    WHERE o.id = _organization_id;

    -- Count leads with filters.
    -- tp visibility guard OR-with-NULL when source allows direct, so that a
    -- non-owner viewer with scoped tp_ids still sees direct leads. Mirrors
    -- conversion.service.findAllConversions' OR(touch_point_id.is.null).
    SELECT COUNT(*)
    INTO leads_count
    FROM conversion_events
    WHERE organization_id = _organization_id
      AND event_type = 'lead'
      AND (
          final_tp_ids IS NULL
          OR touch_point_id = ANY(final_tp_ids)
          OR (COALESCE(_source, 'all') IN ('direct', 'all') AND touch_point_id IS NULL)
      )
      AND (_start_date IS NULL OR created_at >= _start_date)
      AND (_end_date IS NULL OR created_at <= _end_date)
      AND (
          _source IS NULL OR _source = 'all'
          OR (_source = 'direct'     AND touch_point_id IS NULL)
          OR (_source = 'attributed' AND touch_point_id IS NOT NULL)
      );

    -- Count customers acquired within window whose attribution matches filters.
    -- For Direct source, first_touch_point_id IS NULL bypasses the tp_ids
    -- filter (mirrors the OR-with-NULL convention used elsewhere).
    SELECT COUNT(*)
    INTO customers_count
    FROM customer_profiles
    WHERE organization_id = _organization_id
      AND (
          final_tp_ids IS NULL
          OR first_touch_point_id = ANY(final_tp_ids)
          OR (COALESCE(_source, 'all') IN ('direct', 'all') AND first_touch_point_id IS NULL)
      )
      AND (_start_date IS NULL OR created_at >= _start_date)
      AND (_end_date IS NULL OR created_at <= _end_date)
      AND (
          _source IS NULL OR _source = 'all'
          OR (_source = 'direct'     AND first_touch_point_id IS NULL)
          OR (_source = 'attributed' AND first_touch_point_id IS NOT NULL)
      );

    -- Count sales with filters (same OR-with-NULL tp guard as leads).
    SELECT COUNT(*)
    INTO sales_count
    FROM conversion_events
    WHERE organization_id = _organization_id
      AND event_type = 'sale'
      AND (
          final_tp_ids IS NULL
          OR touch_point_id = ANY(final_tp_ids)
          OR (COALESCE(_source, 'all') IN ('direct', 'all') AND touch_point_id IS NULL)
      )
      AND (_start_date IS NULL OR created_at >= _start_date)
      AND (_end_date IS NULL OR created_at <= _end_date)
      AND (
          _source IS NULL OR _source = 'all'
          OR (_source = 'direct'     AND touch_point_id IS NULL)
          OR (_source = 'attributed' AND touch_point_id IS NOT NULL)
      );

    -- Revenue grouped by currency (same OR-with-NULL tp guard).
    WITH revenue_by_currency AS (
        SELECT
            COALESCE(ce.currency, default_currency) AS currency,
            SUM(COALESCE(ce.amount, 0)) AS total_amount
        FROM conversion_events ce
        WHERE ce.organization_id = _organization_id
          AND ce.event_type = 'sale'
          AND ce.amount IS NOT NULL
          AND (
              final_tp_ids IS NULL
              OR ce.touch_point_id = ANY(final_tp_ids)
              OR (COALESCE(_source, 'all') IN ('direct', 'all') AND ce.touch_point_id IS NULL)
          )
          AND (_start_date IS NULL OR ce.created_at >= _start_date)
          AND (_end_date IS NULL OR ce.created_at <= _end_date)
          AND (
              _source IS NULL OR _source = 'all'
              OR (_source = 'direct'     AND ce.touch_point_id IS NULL)
              OR (_source = 'attributed' AND ce.touch_point_id IS NOT NULL)
          )
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
