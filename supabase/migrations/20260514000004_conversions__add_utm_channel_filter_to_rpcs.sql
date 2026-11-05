-- v3 variants of the three conversion aggregate RPCs.
--
-- KEY DESIGN CHANGE vs the naive approach:
--   Instead of accepting pre-resolved _click_ids/_session_ids arrays from JS
--   (which can contain millions of entries for large orgs), these functions
--   accept the raw _utm_sources text[] and _channels text[] values and resolve
--   matching IDs exactly ONCE inside the function using indexed DB queries.
--
--   Benefits:
--     • JS only passes small arrays (['google','facebook']) instead of millions of IDs
--     • Resolution runs in-DB with indexes — no round-trip overhead
--     • matched_click_ids / matched_session_ids computed once, reused across all
--       COUNT queries in the same function call
--     • visits/sessions tables filtered directly by UTM/channel (most efficient)
--     • conversion_events filtered via resolved arrays (no UTM columns there)
--
-- Convention: NULL = no filter; empty array = same as NULL (no active filter).

-- ─────────────────────────────────────────────────────────────────────────────
-- Supporting indexes (IF NOT EXISTS — safe to re-run)
-- Note: non-CONCURRENT — may briefly lock table on very large datasets.
-- ─────────────────────────────────────────────────────────────────────────────

-- visits: li2_cid lookup (click_id → visit)
CREATE INDEX IF NOT EXISTS idx_visits_org_li2_cid
    ON visits (organization_id, li2_cid)
    WHERE li2_cid IS NOT NULL;

-- visits: UTM source expression index
CREATE INDEX IF NOT EXISTS idx_visits_org_utm_source
    ON visits (organization_id, (utm_tags->>'utm_source'))
    WHERE utm_tags->>'utm_source' IS NOT NULL;

-- visits: channel
CREATE INDEX IF NOT EXISTS idx_visits_org_channel
    ON visits (organization_id, channel)
    WHERE channel IS NOT NULL;

-- sessions: session_id lookup
CREATE INDEX IF NOT EXISTS idx_sessions_org_session_id
    ON sessions (organization_id, session_id);

-- sessions: UTM source
CREATE INDEX IF NOT EXISTS idx_sessions_org_utm_source
    ON sessions (organization_id, utm_source)
    WHERE utm_source IS NOT NULL;

-- sessions: channel
CREATE INDEX IF NOT EXISTS idx_sessions_org_channel
    ON sessions (organization_id, channel)
    WHERE channel IS NOT NULL;

-- conversion_events: click_id lookup
CREATE INDEX IF NOT EXISTS idx_ce_org_click_id
    ON conversion_events (organization_id, click_id);

-- conversion_events: session_id lookup
CREATE INDEX IF NOT EXISTS idx_ce_org_session_id
    ON conversion_events (organization_id, session_id)
    WHERE session_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. get_conversion_stats_v3
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_conversion_stats_v3(
    _organization_id   uuid,
    _viewable_tp_ids   uuid[]                      DEFAULT NULL::uuid[],
    _tp_ids            uuid[]                      DEFAULT NULL::uuid[],
    _tag_ids           uuid[]                      DEFAULT NULL::uuid[],
    _collection_ids    uuid[]                      DEFAULT NULL::uuid[],
    _start_date        timestamp without time zone DEFAULT NULL::timestamp without time zone,
    _end_date          timestamp without time zone DEFAULT NULL::timestamp without time zone,
    _exclude_bot       boolean                     DEFAULT false,
    _source            text                        DEFAULT NULL::text,
    _event_names       text[]                      DEFAULT NULL::text[],
    _utm_sources       text[]                      DEFAULT NULL::text[],
    _channels          text[]                      DEFAULT NULL::text[]
)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
    result              jsonb;
    tp_ids_from_tags    uuid[];
    tp_ids_from_collections uuid[];
    final_tp_ids        uuid[];
    leads_count         bigint;
    customers_count     bigint;
    sales_count         bigint;
    revenue_data        jsonb;
    default_currency    text;
    utm_filter_active   boolean;
    matched_click_ids   text[];
    matched_session_ids text[];
BEGIN
    -- ── touch-point resolution (unchanged from v2) ──────────────────────────
    final_tp_ids := _viewable_tp_ids;

    IF _tp_ids IS NOT NULL AND array_length(_tp_ids, 1) > 0 THEN
        IF final_tp_ids IS NOT NULL THEN
            SELECT array_agg(DISTINCT tp_id) INTO final_tp_ids
            FROM unnest(final_tp_ids) AS tp_id WHERE tp_id = ANY(_tp_ids);
        ELSE
            final_tp_ids := _tp_ids;
        END IF;
    END IF;

    IF _tag_ids IS NOT NULL AND array_length(_tag_ids, 1) > 0 THEN
        SELECT array_agg(DISTINCT tp_id) INTO tp_ids_from_tags
        FROM tp_tag_links WHERE tag_id = ANY(_tag_ids);
        IF final_tp_ids IS NOT NULL THEN
            SELECT array_agg(DISTINCT tp_id) INTO final_tp_ids
            FROM unnest(final_tp_ids) AS tp_id WHERE tp_id = ANY(tp_ids_from_tags);
        ELSE
            final_tp_ids := tp_ids_from_tags;
        END IF;
    END IF;

    IF _collection_ids IS NOT NULL AND array_length(_collection_ids, 1) > 0 THEN
        SELECT array_agg(DISTINCT id) INTO tp_ids_from_collections
        FROM touch_points WHERE collection_id = ANY(_collection_ids);
        IF final_tp_ids IS NOT NULL THEN
            SELECT array_agg(DISTINCT tp_id) INTO final_tp_ids
            FROM unnest(final_tp_ids) AS tp_id WHERE tp_id = ANY(tp_ids_from_collections);
        ELSE
            final_tp_ids := tp_ids_from_collections;
        END IF;
    END IF;

    SELECT COALESCE(o.default_currency, 'USD') INTO default_currency
    FROM organizations o WHERE o.id = _organization_id;

    -- ── UTM/channel: resolve once, reuse across all queries ─────────────────
    utm_filter_active := (
        (_utm_sources IS NOT NULL AND array_length(_utm_sources, 1) > 0)
        OR (_channels  IS NOT NULL AND array_length(_channels,  1) > 0)
    );

    IF utm_filter_active THEN
        -- click_id path: conversion came via a short-link visit
        SELECT array_agg(DISTINCT li2_cid) INTO matched_click_ids
        FROM visits
        WHERE organization_id = _organization_id
          AND li2_cid IS NOT NULL
          AND (_utm_sources IS NULL OR array_length(_utm_sources, 1) IS NULL OR utm_tags->>'utm_source' = ANY(_utm_sources))
          AND (_channels    IS NULL OR array_length(_channels,    1) IS NULL OR channel                = ANY(_channels));

        -- session_id path: direct conversion (no short-link click)
        SELECT array_agg(DISTINCT session_id) INTO matched_session_ids
        FROM sessions
        WHERE organization_id = _organization_id
          AND session_id IS NOT NULL
          AND (_utm_sources IS NULL OR array_length(_utm_sources, 1) IS NULL OR utm_source = ANY(_utm_sources))
          AND (_channels    IS NULL OR array_length(_channels,    1) IS NULL OR channel    = ANY(_channels));

        -- ensure empty arrays rather than NULL so zero-match returns 0 counts
        IF matched_click_ids   IS NULL THEN matched_click_ids   := '{}'; END IF;
        IF matched_session_ids IS NULL THEN matched_session_ids := '{}'; END IF;
    END IF;

    -- ── counts ───────────────────────────────────────────────────────────────
    SELECT COUNT(*) INTO leads_count
    FROM conversion_events
    WHERE organization_id = _organization_id
      AND event_type = 'lead'
      AND (
          final_tp_ids IS NULL
          OR touch_point_id = ANY(final_tp_ids)
          OR (COALESCE(_source, 'all') IN ('direct', 'all') AND touch_point_id IS NULL)
      )
      AND (_start_date IS NULL OR created_at >= _start_date)
      AND (_end_date   IS NULL OR created_at <= _end_date)
      AND (
          _source IS NULL OR _source = 'all'
          OR (_source = 'direct'     AND touch_point_id IS NULL)
          OR (_source = 'attributed' AND touch_point_id IS NOT NULL)
      )
      AND (_event_names IS NULL OR array_length(_event_names, 1) IS NULL OR event_name = ANY(_event_names))
      AND (
          NOT utm_filter_active
          OR click_id   = ANY(matched_click_ids)
          OR session_id = ANY(matched_session_ids)
      );

    -- customer_profiles has no click_id/session_id; not filtered by UTM/channel
    SELECT COUNT(*) INTO customers_count
    FROM customer_profiles
    WHERE organization_id = _organization_id
      AND (
          final_tp_ids IS NULL
          OR first_touch_point_id = ANY(final_tp_ids)
          OR (COALESCE(_source, 'all') IN ('direct', 'all') AND first_touch_point_id IS NULL)
      )
      AND (_start_date IS NULL OR created_at >= _start_date)
      AND (_end_date   IS NULL OR created_at <= _end_date)
      AND (
          _source IS NULL OR _source = 'all'
          OR (_source = 'direct'     AND first_touch_point_id IS NULL)
          OR (_source = 'attributed' AND first_touch_point_id IS NOT NULL)
      );

    SELECT COUNT(*) INTO sales_count
    FROM conversion_events
    WHERE organization_id = _organization_id
      AND event_type = 'sale'
      AND (
          final_tp_ids IS NULL
          OR touch_point_id = ANY(final_tp_ids)
          OR (COALESCE(_source, 'all') IN ('direct', 'all') AND touch_point_id IS NULL)
      )
      AND (_start_date IS NULL OR created_at >= _start_date)
      AND (_end_date   IS NULL OR created_at <= _end_date)
      AND (
          _source IS NULL OR _source = 'all'
          OR (_source = 'direct'     AND touch_point_id IS NULL)
          OR (_source = 'attributed' AND touch_point_id IS NOT NULL)
      )
      AND (_event_names IS NULL OR array_length(_event_names, 1) IS NULL OR event_name = ANY(_event_names))
      AND (
          NOT utm_filter_active
          OR click_id   = ANY(matched_click_ids)
          OR session_id = ANY(matched_session_ids)
      );

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
          AND (_end_date   IS NULL OR ce.created_at <= _end_date)
          AND (
              _source IS NULL OR _source = 'all'
              OR (_source = 'direct'     AND ce.touch_point_id IS NULL)
              OR (_source = 'attributed' AND ce.touch_point_id IS NOT NULL)
          )
          AND (_event_names IS NULL OR array_length(_event_names, 1) IS NULL OR ce.event_name = ANY(_event_names))
          AND (
              NOT utm_filter_active
              OR ce.click_id   = ANY(matched_click_ids)
              OR ce.session_id = ANY(matched_session_ids)
          )
        GROUP BY ce.currency
    )
    SELECT jsonb_object_agg(COALESCE(UPPER(currency), UPPER(default_currency)), total_amount)
    INTO revenue_data FROM revenue_by_currency;

    SELECT jsonb_build_object(
        'leads',              leads_count,
        'customers',          customers_count,
        'sales',              sales_count,
        'revenue_by_currency', COALESCE(revenue_data, '{}'::jsonb),
        'default_currency',   default_currency
    ) INTO result;

    RETURN result;
END;
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. get_funnel_data_v3
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_funnel_data_v3(
    _organization_id   uuid,
    _viewable_tp_ids   uuid[]                      DEFAULT NULL::uuid[],
    _tp_ids            uuid[]                      DEFAULT NULL::uuid[],
    _tag_ids           uuid[]                      DEFAULT NULL::uuid[],
    _collection_ids    uuid[]                      DEFAULT NULL::uuid[],
    _start_date        timestamp without time zone DEFAULT NULL::timestamp without time zone,
    _end_date          timestamp without time zone DEFAULT NULL::timestamp without time zone,
    _exclude_bot       boolean                     DEFAULT false,
    _event_names       text[]                      DEFAULT NULL::text[],
    _utm_sources       text[]                      DEFAULT NULL::text[],
    _channels          text[]                      DEFAULT NULL::text[]
)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
    result                jsonb;
    tp_ids_from_tags      uuid[];
    tp_ids_from_collections uuid[];
    final_tp_ids          uuid[];
    clicks_count          bigint;
    leads_count           bigint;
    sales_count           bigint;
    direct_visits_count   bigint;
    direct_leads_count    bigint;
    direct_sales_count    bigint;
    total_visits_count    bigint;
    utm_filter_active     boolean;
    matched_click_ids     text[];
    matched_session_ids   text[];
BEGIN
    final_tp_ids := _viewable_tp_ids;

    IF _tp_ids IS NOT NULL AND array_length(_tp_ids, 1) > 0 THEN
        IF final_tp_ids IS NOT NULL THEN
            SELECT array_agg(DISTINCT tp_id) INTO final_tp_ids
            FROM unnest(final_tp_ids) AS tp_id WHERE tp_id = ANY(_tp_ids);
        ELSE
            final_tp_ids := _tp_ids;
        END IF;
    END IF;

    IF _tag_ids IS NOT NULL AND array_length(_tag_ids, 1) > 0 THEN
        SELECT array_agg(DISTINCT tp_id) INTO tp_ids_from_tags
        FROM tp_tag_links WHERE tag_id = ANY(_tag_ids);
        IF final_tp_ids IS NOT NULL THEN
            SELECT array_agg(DISTINCT tp_id) INTO final_tp_ids
            FROM unnest(final_tp_ids) AS tp_id WHERE tp_id = ANY(tp_ids_from_tags);
        ELSE
            final_tp_ids := tp_ids_from_tags;
        END IF;
    END IF;

    IF _collection_ids IS NOT NULL AND array_length(_collection_ids, 1) > 0 THEN
        SELECT array_agg(DISTINCT id) INTO tp_ids_from_collections
        FROM touch_points WHERE collection_id = ANY(_collection_ids);
        IF final_tp_ids IS NOT NULL THEN
            SELECT array_agg(DISTINCT tp_id) INTO final_tp_ids
            FROM unnest(final_tp_ids) AS tp_id WHERE tp_id = ANY(tp_ids_from_collections);
        ELSE
            final_tp_ids := tp_ids_from_collections;
        END IF;
    END IF;

    -- ── UTM/channel: resolve once ────────────────────────────────────────────
    utm_filter_active := (
        (_utm_sources IS NOT NULL AND array_length(_utm_sources, 1) > 0)
        OR (_channels  IS NOT NULL AND array_length(_channels,  1) > 0)
    );

    IF utm_filter_active THEN
        SELECT array_agg(DISTINCT li2_cid) INTO matched_click_ids
        FROM visits
        WHERE organization_id = _organization_id
          AND li2_cid IS NOT NULL
          AND (_utm_sources IS NULL OR array_length(_utm_sources, 1) IS NULL OR utm_tags->>'utm_source' = ANY(_utm_sources))
          AND (_channels    IS NULL OR array_length(_channels,    1) IS NULL OR channel                = ANY(_channels));

        SELECT array_agg(DISTINCT session_id) INTO matched_session_ids
        FROM sessions
        WHERE organization_id = _organization_id
          AND session_id IS NOT NULL
          AND (_utm_sources IS NULL OR array_length(_utm_sources, 1) IS NULL OR utm_source = ANY(_utm_sources))
          AND (_channels    IS NULL OR array_length(_channels,    1) IS NULL OR channel    = ANY(_channels));

        IF matched_click_ids   IS NULL THEN matched_click_ids   := '{}'; END IF;
        IF matched_session_ids IS NULL THEN matched_session_ids := '{}'; END IF;
    END IF;

    -- ── attributed visits: filter visits table directly by UTM/channel ───────
    SELECT COUNT(*) INTO clicks_count
    FROM visits
    WHERE organization_id = _organization_id
      AND (_exclude_bot = false OR is_bot = false)
      AND (final_tp_ids IS NULL OR tp_id = ANY(final_tp_ids))
      AND (_start_date IS NULL OR created_at >= _start_date)
      AND (_end_date   IS NULL OR created_at <= _end_date)
      AND (
          NOT utm_filter_active
          OR (
              (_utm_sources IS NULL OR array_length(_utm_sources, 1) IS NULL OR utm_tags->>'utm_source' = ANY(_utm_sources))
              AND (_channels IS NULL OR array_length(_channels, 1) IS NULL OR channel = ANY(_channels))
          )
      );

    SELECT COUNT(*) INTO leads_count
    FROM conversion_events
    WHERE organization_id = _organization_id
      AND event_type = 'lead' AND click_id != ''
      AND (final_tp_ids IS NULL OR touch_point_id = ANY(final_tp_ids))
      AND (_start_date IS NULL OR created_at >= _start_date)
      AND (_end_date   IS NULL OR created_at <= _end_date)
      AND (_event_names IS NULL OR array_length(_event_names, 1) IS NULL OR event_name = ANY(_event_names))
      AND (NOT utm_filter_active OR click_id = ANY(matched_click_ids));

    SELECT COUNT(*) INTO sales_count
    FROM conversion_events
    WHERE organization_id = _organization_id
      AND event_type = 'sale' AND click_id != ''
      AND (final_tp_ids IS NULL OR touch_point_id = ANY(final_tp_ids))
      AND (_start_date IS NULL OR created_at >= _start_date)
      AND (_end_date   IS NULL OR created_at <= _end_date)
      AND (_event_names IS NULL OR array_length(_event_names, 1) IS NULL OR event_name = ANY(_event_names))
      AND (NOT utm_filter_active OR click_id = ANY(matched_click_ids));

    -- ── direct visits: filter sessions table directly by UTM/channel ─────────
    SELECT COUNT(*) INTO direct_visits_count
    FROM sessions
    WHERE organization_id = _organization_id
      AND li2_cid IS NULL
      AND (_exclude_bot = false OR is_bot = false)
      AND (_start_date IS NULL OR started_at >= _start_date)
      AND (_end_date   IS NULL OR started_at <= _end_date)
      AND (
          NOT utm_filter_active
          OR (
              (_utm_sources IS NULL OR array_length(_utm_sources, 1) IS NULL OR utm_source = ANY(_utm_sources))
              AND (_channels IS NULL OR array_length(_channels, 1) IS NULL OR channel = ANY(_channels))
          )
      );

    SELECT COUNT(*) INTO direct_leads_count
    FROM conversion_events
    WHERE organization_id = _organization_id
      AND event_type = 'lead' AND click_id = ''
      AND (_start_date IS NULL OR created_at >= _start_date)
      AND (_end_date   IS NULL OR created_at <= _end_date)
      AND (_event_names IS NULL OR array_length(_event_names, 1) IS NULL OR event_name = ANY(_event_names))
      AND (NOT utm_filter_active OR session_id = ANY(matched_session_ids));

    SELECT COUNT(*) INTO direct_sales_count
    FROM conversion_events
    WHERE organization_id = _organization_id
      AND event_type = 'sale' AND click_id = ''
      AND (_start_date IS NULL OR created_at >= _start_date)
      AND (_end_date   IS NULL OR created_at <= _end_date)
      AND (_event_names IS NULL OR array_length(_event_names, 1) IS NULL OR event_name = ANY(_event_names))
      AND (NOT utm_filter_active OR session_id = ANY(matched_session_ids));

    total_visits_count := clicks_count + direct_visits_count;

    SELECT jsonb_build_object(
        'clicks',        clicks_count,
        'leads',         leads_count,
        'sales',         sales_count,
        'direct_visits', direct_visits_count,
        'direct_leads',  direct_leads_count,
        'direct_sales',  direct_sales_count,
        'clicks_to_leads_rate', CASE WHEN total_visits_count > 0 THEN ROUND(((leads_count + direct_leads_count)::numeric / total_visits_count::numeric * 100)::numeric, 2) ELSE 0 END,
        'leads_to_sales_rate',  CASE WHEN (leads_count + direct_leads_count) > 0 THEN ROUND(((sales_count + direct_sales_count)::numeric / (leads_count + direct_leads_count)::numeric * 100)::numeric, 2) ELSE 0 END,
        'overall_rate',         CASE WHEN total_visits_count > 0 THEN ROUND(((sales_count + direct_sales_count)::numeric / total_visits_count::numeric * 100)::numeric, 2) ELSE 0 END
    ) INTO result;

    RETURN result;
END;
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. get_touchpoint_attribution_full_v3
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_touchpoint_attribution_full_v3(
    _organization_id   uuid,
    _viewable_tp_ids   uuid[],
    _tag_ids           uuid[]                      DEFAULT NULL::uuid[],
    _tp_ids            uuid[]                      DEFAULT NULL::uuid[],
    _collection_ids    uuid[]                      DEFAULT NULL::uuid[],
    _start_time        timestamp without time zone DEFAULT NULL::timestamp without time zone,
    _end_time          timestamp without time zone DEFAULT NULL::timestamp without time zone,
    _exclude_bot       boolean                     DEFAULT true,
    _event_names       text[]                      DEFAULT NULL::text[],
    _utm_sources       text[]                      DEFAULT NULL::text[],
    _channels          text[]                      DEFAULT NULL::text[]
)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
    result                  jsonb;
    tp_ids_from_tags        uuid[];
    tp_ids_from_collections uuid[];
    final_tp_ids            uuid[];
    utm_filter_active       boolean;
    matched_click_ids       text[];
    matched_session_ids     text[];
BEGIN
    final_tp_ids := _viewable_tp_ids;

    IF _tp_ids IS NOT NULL AND array_length(_tp_ids, 1) > 0 THEN
        IF final_tp_ids IS NOT NULL THEN
            SELECT array_agg(DISTINCT tp_id) INTO final_tp_ids
            FROM unnest(final_tp_ids) AS tp_id WHERE tp_id = ANY(_tp_ids);
        ELSE
            final_tp_ids := _tp_ids;
        END IF;
    END IF;

    IF _tag_ids IS NOT NULL AND array_length(_tag_ids, 1) > 0 THEN
        SELECT array_agg(DISTINCT tp_id) INTO tp_ids_from_tags
        FROM tp_tag_links WHERE tag_id = ANY(_tag_ids) AND tp_id = ANY(_viewable_tp_ids);
        IF final_tp_ids IS NOT NULL THEN
            SELECT array_agg(DISTINCT tp_id) INTO final_tp_ids
            FROM unnest(final_tp_ids) AS tp_id WHERE tp_id = ANY(tp_ids_from_tags);
        ELSE
            final_tp_ids := tp_ids_from_tags;
        END IF;
    END IF;

    IF _collection_ids IS NOT NULL AND array_length(_collection_ids, 1) > 0 THEN
        SELECT array_agg(DISTINCT id) INTO tp_ids_from_collections
        FROM touch_points WHERE collection_id = ANY(_collection_ids) AND id = ANY(_viewable_tp_ids);
        IF final_tp_ids IS NOT NULL THEN
            SELECT array_agg(DISTINCT tp_id) INTO final_tp_ids
            FROM unnest(final_tp_ids) AS tp_id WHERE tp_id = ANY(tp_ids_from_collections);
        ELSE
            final_tp_ids := tp_ids_from_collections;
        END IF;
    END IF;

    -- ── UTM/channel: resolve once ────────────────────────────────────────────
    utm_filter_active := (
        (_utm_sources IS NOT NULL AND array_length(_utm_sources, 1) > 0)
        OR (_channels  IS NOT NULL AND array_length(_channels,  1) > 0)
    );

    IF utm_filter_active THEN
        SELECT array_agg(DISTINCT li2_cid) INTO matched_click_ids
        FROM visits
        WHERE organization_id = _organization_id
          AND li2_cid IS NOT NULL
          AND (_utm_sources IS NULL OR array_length(_utm_sources, 1) IS NULL OR utm_tags->>'utm_source' = ANY(_utm_sources))
          AND (_channels    IS NULL OR array_length(_channels,    1) IS NULL OR channel                = ANY(_channels));

        SELECT array_agg(DISTINCT session_id) INTO matched_session_ids
        FROM sessions
        WHERE organization_id = _organization_id
          AND session_id IS NOT NULL
          AND (_utm_sources IS NULL OR array_length(_utm_sources, 1) IS NULL OR utm_source = ANY(_utm_sources))
          AND (_channels    IS NULL OR array_length(_channels,    1) IS NULL OR channel    = ANY(_channels));

        IF matched_click_ids   IS NULL THEN matched_click_ids   := '{}'; END IF;
        IF matched_session_ids IS NULL THEN matched_session_ids := '{}'; END IF;
    END IF;

    WITH filtered_visits AS (
        -- Filter visits directly by UTM/channel — visits already has the columns
        SELECT v.tp_id, v.fp, v.created_at
        FROM visits v
        WHERE v.organization_id = _organization_id
          AND (final_tp_ids IS NULL OR array_length(final_tp_ids, 1) IS NULL OR v.tp_id = ANY(final_tp_ids))
          AND (_start_time IS NULL OR v.created_at >= _start_time)
          AND (_end_time   IS NULL OR v.created_at <= _end_time)
          AND (NOT _exclude_bot OR v.is_bot = FALSE)
          AND (
              NOT utm_filter_active
              OR (
                  (_utm_sources IS NULL OR array_length(_utm_sources, 1) IS NULL OR v.utm_tags->>'utm_source' = ANY(_utm_sources))
                  AND (_channels IS NULL OR array_length(_channels, 1) IS NULL OR v.channel = ANY(_channels))
              )
          )
    ),
    filtered_conversions AS (
        -- conversion_events has no UTM columns — use resolved IDs
        SELECT ce.touch_point_id, ce.event_type, ce.amount, ce.currency
        FROM conversion_events ce
        WHERE ce.organization_id = _organization_id
          AND ce.touch_point_id IS NOT NULL
          AND (final_tp_ids IS NULL OR array_length(final_tp_ids, 1) IS NULL OR ce.touch_point_id = ANY(final_tp_ids))
          AND (_start_time IS NULL OR ce.created_at >= _start_time)
          AND (_end_time   IS NULL OR ce.created_at <= _end_time)
          AND (_event_names IS NULL OR array_length(_event_names, 1) IS NULL OR ce.event_name = ANY(_event_names))
          AND (
              NOT utm_filter_active
              OR ce.click_id   = ANY(matched_click_ids)
              OR ce.session_id = ANY(matched_session_ids)
          )
    ),
    visit_counts AS (
        SELECT tp_id,
               COUNT(*) as visit_count,
               COUNT(DISTINCT fp) FILTER (WHERE fp IS NOT NULL) as unique_visit_count
        FROM filtered_visits WHERE tp_id IS NOT NULL GROUP BY tp_id
    ),
    lead_counts AS (
        SELECT touch_point_id, COUNT(*) as lead_count
        FROM filtered_conversions WHERE event_type = 'lead' GROUP BY touch_point_id
    ),
    sale_by_currency AS (
        SELECT touch_point_id,
               UPPER(COALESCE(currency, 'USD')) as currency,
               COUNT(*) as sale_count,
               SUM(COALESCE(amount, 0)) as revenue
        FROM filtered_conversions WHERE event_type = 'sale'
        GROUP BY touch_point_id, UPPER(COALESCE(currency, 'USD'))
    ),
    sale_metrics AS (
        SELECT touch_point_id,
               SUM(sale_count) as sale_count,
               jsonb_object_agg(currency, revenue) as revenue_by_currency
        FROM sale_by_currency GROUP BY touch_point_id
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
          AND (final_tp_ids IS NULL OR array_length(final_tp_ids, 1) IS NULL OR tp.id = ANY(final_tp_ids))
          AND (
              COALESCE(vc.visit_count, 0) > 0
              OR COALESCE(lc.lead_count, 0) > 0
              OR COALESCE(sm.sale_count, 0) > 0
          )
    ),
    org_currency AS (
        SELECT default_currency FROM organizations WHERE id = _organization_id LIMIT 1
    )
    SELECT jsonb_build_object(
        'touchpoints', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'touchPointId',       touchpoint_id,
                    'touchPointName',     touchpoint_name,
                    'touchPointShortUrl', touchpoint_short_url,
                    'visitCount',         visit_count,
                    'uniqueVisitCount',   unique_visit_count,
                    'leadCount',          lead_count,
                    'saleCount',          sale_count,
                    'conversionRate',     conversion_rate,
                    'revenueByCurrency',  revenue_by_currency
                )
                ORDER BY sale_count DESC, lead_count DESC
            ), '[]'::jsonb)
            FROM touchpoint_data
        ),
        'currency', COALESCE((SELECT default_currency FROM org_currency), 'USD')
    ) INTO result;

    RETURN COALESCE(result, '{}'::jsonb);
END;
$function$;
