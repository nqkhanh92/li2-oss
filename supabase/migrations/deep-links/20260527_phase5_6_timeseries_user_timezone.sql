-- Phase 5 (Task 5.6) — timezone-aware bucketing for the deep-link time-series RPCs.
--
-- WHY: date_trunc(_bucket, created_at) ran in the session tz (UTC), so daily/hourly buckets
--   were UTC boundaries. A click at 2026-05-26 05:00 in GMT+7 (= 2026-05-25 22:00 UTC) was
--   counted under "May 25", and the chart axis showed UTC-midnight days (07:00 in GMT+7).
--   The viewer should see buckets in THEIR timezone. The app already ships the viewer tz to
--   every API call via the `x-timezone` header (axios) → getTimeZone() → here as `_timezone`,
--   matching the p_timezone convention used by the realtime/advanced analytics RPCs.
--
-- HOW: bucket = (date_trunc(_trunc, created_at AT TIME ZONE _tz) AT TIME ZONE _tz)
--   inner `AT TIME ZONE _tz` → naive local wall-clock; date_trunc to local midnight/hour;
--   outer `AT TIME ZONE _tz` → the timestamptz INSTANT of that local boundary, so the client
--   (formatting in the same tz) renders the correct local date/hour. `_tz` is validated
--   against pg_timezone_names, falling back to 'UTC' for a missing/invalid value (never errors).
--
-- Adds `_timezone text DEFAULT 'UTC'` to BOTH timeseries functions (signature change → DROP
-- the old 12-arg versions first). The summary RPCs are untouched: they filter on absolute
-- [_start, _end] instants (the client already sends local-day boundaries), no server bucketing.
--
-- CANONICAL OWNER (2026-05-27 consolidation, #6): this migration is the SOLE definition of
-- BOTH get_deep_link_timeseries and get_deep_link_click_timeseries. The earlier 12-arg
-- versions were removed from 20260526_phase5_deep_link_analytics_rpcs.sql and
-- 20260527_phase5_6_deep_link_click_timeseries.sql (now a stub) so re-applying any file in
-- this folder cannot resurrect a duplicate overload. The leading DROPs make this self-healing.
--
-- Manual-apply: Kei applies on dev, then Claude runs `yarn gen:types`.

DROP FUNCTION IF EXISTS public.get_deep_link_timeseries(
    uuid, uuid[], uuid[], uuid[], uuid[], timestamptz, timestamptz,
    text[], text[], text[], boolean, text
);
DROP FUNCTION IF EXISTS public.get_deep_link_click_timeseries(
    uuid, uuid[], uuid[], uuid[], uuid[], timestamptz, timestamptz,
    text[], text[], text[], boolean, text
);

-- ── App-Opens time-series (deep_link_events) ────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_deep_link_timeseries(
    _organization_id uuid,
    _viewable_tp_ids uuid[]      DEFAULT NULL::uuid[],
    _tp_ids          uuid[]      DEFAULT NULL::uuid[],
    _tag_ids         uuid[]      DEFAULT NULL::uuid[],
    _collection_ids  uuid[]      DEFAULT NULL::uuid[],
    _start_date      timestamptz DEFAULT NULL::timestamptz,
    _end_date        timestamptz DEFAULT NULL::timestamptz,
    _utm_sources     text[]      DEFAULT NULL::text[],
    _utm_mediums     text[]      DEFAULT NULL::text[],
    _utm_campaigns   text[]      DEFAULT NULL::text[],
    _exclude_bot     boolean     DEFAULT false,
    _bucket          text        DEFAULT 'day',
    _timezone        text        DEFAULT 'UTC'
)
RETURNS TABLE(
    bucket           timestamptz,
    app_opens        bigint,
    deferred_matches bigint,
    deferred_misses  bigint
)
LANGUAGE plpgsql
AS $function$
DECLARE
    final_tp_ids            uuid[];
    tp_ids_from_tags        uuid[];
    tp_ids_from_collections uuid[];
    utm_tp_ids              uuid[];
    utm_filter_active       boolean;
    _trunc                  text;
    _tz                     text;
BEGIN
    -- touch-point resolution (identical to get_deep_link_summary)
    final_tp_ids := _viewable_tp_ids;

    IF _tp_ids IS NOT NULL AND array_length(_tp_ids, 1) > 0 THEN
        IF final_tp_ids IS NOT NULL THEN
            SELECT array_agg(DISTINCT t) INTO final_tp_ids
            FROM unnest(final_tp_ids) AS t WHERE t = ANY(_tp_ids);
        ELSE
            final_tp_ids := _tp_ids;
        END IF;
    END IF;

    IF _tag_ids IS NOT NULL AND array_length(_tag_ids, 1) > 0 THEN
        SELECT array_agg(DISTINCT tp_id) INTO tp_ids_from_tags
        FROM tp_tag_links WHERE tag_id = ANY(_tag_ids);
        IF final_tp_ids IS NOT NULL THEN
            SELECT array_agg(DISTINCT t) INTO final_tp_ids
            FROM unnest(final_tp_ids) AS t WHERE t = ANY(COALESCE(tp_ids_from_tags, '{}'));
        ELSE
            final_tp_ids := COALESCE(tp_ids_from_tags, '{}');
        END IF;
    END IF;

    IF _collection_ids IS NOT NULL AND array_length(_collection_ids, 1) > 0 THEN
        SELECT array_agg(DISTINCT id) INTO tp_ids_from_collections
        FROM touch_points WHERE collection_id = ANY(_collection_ids);
        IF final_tp_ids IS NOT NULL THEN
            SELECT array_agg(DISTINCT t) INTO final_tp_ids
            FROM unnest(final_tp_ids) AS t WHERE t = ANY(COALESCE(tp_ids_from_collections, '{}'));
        ELSE
            final_tp_ids := COALESCE(tp_ids_from_collections, '{}');
        END IF;
    END IF;

    utm_filter_active := (
           (_utm_sources   IS NOT NULL AND array_length(_utm_sources,   1) > 0)
        OR (_utm_mediums   IS NOT NULL AND array_length(_utm_mediums,   1) > 0)
        OR (_utm_campaigns IS NOT NULL AND array_length(_utm_campaigns, 1) > 0)
    );
    IF utm_filter_active THEN
        SELECT array_agg(DISTINCT id) INTO utm_tp_ids
        FROM touch_points
        WHERE organization_id = _organization_id
          AND (_utm_sources   IS NULL OR array_length(_utm_sources,   1) IS NULL OR utm_tags->>'utm_source'   = ANY(_utm_sources))
          AND (_utm_mediums   IS NULL OR array_length(_utm_mediums,   1) IS NULL OR utm_tags->>'utm_medium'   = ANY(_utm_mediums))
          AND (_utm_campaigns IS NULL OR array_length(_utm_campaigns, 1) IS NULL OR utm_tags->>'utm_campaign' = ANY(_utm_campaigns));
        IF final_tp_ids IS NOT NULL THEN
            SELECT array_agg(DISTINCT t) INTO final_tp_ids
            FROM unnest(final_tp_ids) AS t WHERE t = ANY(COALESCE(utm_tp_ids, '{}'));
        ELSE
            final_tp_ids := COALESCE(utm_tp_ids, '{}');
        END IF;
    END IF;

    _trunc := CASE WHEN _bucket = 'hour' THEN 'hour' ELSE 'day' END;  -- anything else → day
    _tz := COALESCE((SELECT name FROM pg_timezone_names WHERE name = _timezone), 'UTC');

    RETURN QUERY
    SELECT
        (date_trunc(_trunc, e.created_at AT TIME ZONE _tz) AT TIME ZONE _tz),
        count(*) FILTER (WHERE e.event_type = 'app_open')::bigint,
        count(*) FILTER (WHERE e.event_type = 'deferred_match')::bigint,
        count(*) FILTER (WHERE e.event_type = 'deferred_miss')::bigint
    FROM deep_link_events e
    WHERE e.organization_id = _organization_id
      AND (_start_date IS NULL OR e.created_at >= _start_date)
      AND (_end_date   IS NULL OR e.created_at <= _end_date)
      AND (final_tp_ids IS NULL OR e.touch_point_id = ANY(final_tp_ids))
    GROUP BY 1
    ORDER BY 1;
END;
$function$;

-- ── Clicks time-series (visits) ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_deep_link_click_timeseries(
    _organization_id uuid,
    _viewable_tp_ids uuid[]      DEFAULT NULL::uuid[],
    _tp_ids          uuid[]      DEFAULT NULL::uuid[],
    _tag_ids         uuid[]      DEFAULT NULL::uuid[],
    _collection_ids  uuid[]      DEFAULT NULL::uuid[],
    _start_date      timestamptz DEFAULT NULL::timestamptz,
    _end_date        timestamptz DEFAULT NULL::timestamptz,
    _utm_sources     text[]      DEFAULT NULL::text[],
    _utm_mediums     text[]      DEFAULT NULL::text[],
    _utm_campaigns   text[]      DEFAULT NULL::text[],
    _exclude_bot     boolean     DEFAULT false,
    _bucket          text        DEFAULT 'day',
    _timezone        text        DEFAULT 'UTC'
)
RETURNS TABLE(
    bucket timestamptz,
    clicks bigint
)
LANGUAGE plpgsql
AS $function$
DECLARE
    dl_tp_ids               uuid[];
    final_tp_ids            uuid[];
    tp_ids_from_tags        uuid[];
    tp_ids_from_collections uuid[];
    _trunc                  text;
    _tz                     text;
BEGIN
    -- ── deep-link link universe: tps on ENABLED deep-link domains ────────────
    SELECT array_agg(DISTINCT tp.id) INTO dl_tp_ids
    FROM touch_points tp
    JOIN domains d ON d.id = tp.domain_id
    WHERE tp.organization_id = _organization_id
      AND d.deep_link_apps->>'enabled' = 'true'
      AND jsonb_array_length(d.deep_link_apps->'apps') > 0;

    IF dl_tp_ids IS NULL THEN
        dl_tp_ids := '{}';  -- org has no enabled deep-link domains → zero clicks
    END IF;

    -- ── narrow by viewable, then explicit filters (intersection) ─────────────
    final_tp_ids := dl_tp_ids;

    IF _viewable_tp_ids IS NOT NULL THEN
        SELECT array_agg(DISTINCT t) INTO final_tp_ids
        FROM unnest(final_tp_ids) AS t WHERE t = ANY(_viewable_tp_ids);
    END IF;

    IF _tp_ids IS NOT NULL AND array_length(_tp_ids, 1) > 0 THEN
        SELECT array_agg(DISTINCT t) INTO final_tp_ids
        FROM unnest(COALESCE(final_tp_ids, '{}')) AS t WHERE t = ANY(_tp_ids);
    END IF;

    IF _tag_ids IS NOT NULL AND array_length(_tag_ids, 1) > 0 THEN
        SELECT array_agg(DISTINCT tp_id) INTO tp_ids_from_tags
        FROM tp_tag_links WHERE tag_id = ANY(_tag_ids);
        SELECT array_agg(DISTINCT t) INTO final_tp_ids
        FROM unnest(COALESCE(final_tp_ids, '{}')) AS t WHERE t = ANY(COALESCE(tp_ids_from_tags, '{}'));
    END IF;

    IF _collection_ids IS NOT NULL AND array_length(_collection_ids, 1) > 0 THEN
        SELECT array_agg(DISTINCT id) INTO tp_ids_from_collections
        FROM touch_points WHERE collection_id = ANY(_collection_ids);
        SELECT array_agg(DISTINCT t) INTO final_tp_ids
        FROM unnest(COALESCE(final_tp_ids, '{}')) AS t WHERE t = ANY(COALESCE(tp_ids_from_collections, '{}'));
    END IF;

    IF final_tp_ids IS NULL THEN final_tp_ids := '{}'; END IF;

    _trunc := CASE WHEN _bucket = 'hour' THEN 'hour' ELSE 'day' END;  -- anything else → day
    _tz := COALESCE((SELECT name FROM pg_timezone_names WHERE name = _timezone), 'UTC');

    RETURN QUERY
    SELECT
        (date_trunc(_trunc, vi.created_at AT TIME ZONE _tz) AT TIME ZONE _tz),
        count(*)::bigint
    FROM visits vi
    WHERE vi.organization_id = _organization_id
      AND vi.tp_id = ANY(final_tp_ids)
      AND (_start_date IS NULL OR vi.created_at >= _start_date)
      AND (_end_date   IS NULL OR vi.created_at <= _end_date)
      AND (_exclude_bot = false OR vi.is_bot = false)
      AND (_utm_sources   IS NULL OR array_length(_utm_sources,   1) IS NULL OR vi.utm_tags->>'utm_source'   = ANY(_utm_sources))
      AND (_utm_mediums   IS NULL OR array_length(_utm_mediums,   1) IS NULL OR vi.utm_tags->>'utm_medium'   = ANY(_utm_mediums))
      AND (_utm_campaigns IS NULL OR array_length(_utm_campaigns, 1) IS NULL OR vi.utm_tags->>'utm_campaign' = ANY(_utm_campaigns))
    GROUP BY 1
    ORDER BY 1;
END;
$function$;
