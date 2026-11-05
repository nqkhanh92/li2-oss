-- Deep-link universe: require d.is_verified = true (defensive hardening).
--
-- WHY: today, the only path that flips domains.deep_link_apps.enabled = true on a
-- domain is the verify-deep-link route, which runs AFTER successful domain
-- verification. So `enabled = true` implies `is_verified = true` in practice and
-- this change is a no-op against current data. We still want the predicate to
-- hold *independent* of the write path — a future bug, manual SQL fix, or new
-- writer that flips `enabled` on an unverified domain must NOT leak into deep-link
-- analytics. This is also the predicate the new dropdown filter will share, so it
-- needs to be the same shape across the dropdown and the 3 RPCs.
--
-- AFFECTED RPCs (the only ones that gate by the deep-link universe — the
-- *_events-side RPCs don't, because every deep_link_events row is by definition
-- already deep-link):
--   1. get_deep_link_click_summary (over visits)
--   2. get_deep_link_click_timeseries (over visits)
--   3. get_deep_link_ranking        (Card A per-tp ⟕ events, Card B clicks-only)
--
-- Pure CREATE OR REPLACE — no signature change, no DROPs needed. Bodies are
-- copied VERBATIM from their source migrations; the ONLY diff is the added
-- `AND d.is_verified = true` line in the universe SELECT (placed first so the
-- cheap boolean check fires before the two JSONB ops). If those source files are
-- re-applied later, this migration must be re-applied after them to keep the
-- predicate in sync — see the deep-link-only dropdown route for the matching
-- TypeScript-side predicate.
--
-- Manual-apply: Kei applies on dev, then Claude runs `yarn gen:types` (no type
-- change expected — function signatures are unchanged).

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. get_deep_link_click_summary — verbatim from 20260526_phase5_6_deep_link_click_summary.sql
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_deep_link_click_summary(
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
    _exclude_bot     boolean     DEFAULT false
)
RETURNS TABLE(
    clicks          bigint,
    by_channel      jsonb,
    by_segment_type jsonb
)
LANGUAGE plpgsql
AS $function$
DECLARE
    dl_tp_ids               uuid[];
    final_tp_ids            uuid[];
    tp_ids_from_tags        uuid[];
    tp_ids_from_collections uuid[];
BEGIN
    SELECT array_agg(DISTINCT tp.id) INTO dl_tp_ids
    FROM touch_points tp
    JOIN domains d ON d.id = tp.domain_id
    WHERE tp.organization_id = _organization_id
      AND d.is_verified = true
      AND d.deep_link_apps->>'enabled' = 'true'
      AND jsonb_array_length(d.deep_link_apps->'apps') > 0;

    IF dl_tp_ids IS NULL THEN
        dl_tp_ids := '{}';
    END IF;

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

    RETURN QUERY
    WITH v AS (
        SELECT vi.channel, vi.segment_type
        FROM visits vi
        WHERE vi.organization_id = _organization_id
          AND vi.tp_id = ANY(final_tp_ids)
          AND (_start_date IS NULL OR vi.created_at >= _start_date)
          AND (_end_date   IS NULL OR vi.created_at <= _end_date)
          AND (_exclude_bot = false OR vi.is_bot = false)
          AND (_utm_sources   IS NULL OR array_length(_utm_sources,   1) IS NULL OR vi.utm_tags->>'utm_source'   = ANY(_utm_sources))
          AND (_utm_mediums   IS NULL OR array_length(_utm_mediums,   1) IS NULL OR vi.utm_tags->>'utm_medium'   = ANY(_utm_mediums))
          AND (_utm_campaigns IS NULL OR array_length(_utm_campaigns, 1) IS NULL OR vi.utm_tags->>'utm_campaign' = ANY(_utm_campaigns))
    )
    SELECT
        count(*)::bigint,
        (SELECT COALESCE(jsonb_object_agg(k, c), '{}'::jsonb)
           FROM (SELECT COALESCE(channel, 'Unknown') AS k, count(*) AS c FROM v GROUP BY 1) s),
        (SELECT COALESCE(jsonb_object_agg(k, c), '{}'::jsonb)
           FROM (SELECT COALESCE(segment_type, 'default') AS k, count(*) AS c FROM v GROUP BY 1) s)
    FROM v;
END;
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. get_deep_link_click_timeseries — verbatim from
--    20260527_phase5_6_timeseries_user_timezone.sql
-- ─────────────────────────────────────────────────────────────────────────────
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
    SELECT array_agg(DISTINCT tp.id) INTO dl_tp_ids
    FROM touch_points tp
    JOIN domains d ON d.id = tp.domain_id
    WHERE tp.organization_id = _organization_id
      AND d.is_verified = true
      AND d.deep_link_apps->>'enabled' = 'true'
      AND jsonb_array_length(d.deep_link_apps->'apps') > 0;

    IF dl_tp_ids IS NULL THEN
        dl_tp_ids := '{}';
    END IF;

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

    _trunc := CASE WHEN _bucket = 'hour' THEN 'hour' ELSE 'day' END;
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

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. get_deep_link_ranking — verbatim from 20260528_phase7_deep_link_ranking.sql
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_deep_link_ranking(
    _organization_id uuid,
    _group_by        text,
    _viewable_tp_ids uuid[]      DEFAULT NULL::uuid[],
    _tp_ids          uuid[]      DEFAULT NULL::uuid[],
    _tag_ids         uuid[]      DEFAULT NULL::uuid[],
    _collection_ids  uuid[]      DEFAULT NULL::uuid[],
    _start_date      timestamptz DEFAULT NULL::timestamptz,
    _end_date        timestamptz DEFAULT NULL::timestamptz,
    _utm_sources     text[]      DEFAULT NULL::text[],
    _utm_mediums     text[]      DEFAULT NULL::text[],
    _utm_campaigns   text[]      DEFAULT NULL::text[],
    _exclude_bot     boolean     DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
    dl_tp_ids               uuid[];
    final_tp_ids            uuid[];
    tp_ids_from_tags        uuid[];
    tp_ids_from_collections uuid[];
BEGIN
    SELECT array_agg(DISTINCT tp.id) INTO dl_tp_ids
    FROM touch_points tp
    JOIN domains d ON d.id = tp.domain_id
    WHERE tp.organization_id = _organization_id
      AND d.is_verified = true
      AND d.deep_link_apps->>'enabled' = 'true'
      AND jsonb_array_length(d.deep_link_apps->'apps') > 0;
    IF dl_tp_ids IS NULL THEN dl_tp_ids := '{}'; END IF;

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

    IF _group_by IN ('referrer', 'utm_source', 'utm_medium', 'utm_campaign') THEN
        RETURN (
            WITH v AS (
                SELECT CASE _group_by
                           WHEN 'referrer'     THEN COALESCE(NULLIF(vi.referrer, ''), 'direct')
                           WHEN 'utm_source'   THEN vi.utm_tags->>'utm_source'
                           WHEN 'utm_medium'   THEN vi.utm_tags->>'utm_medium'
                           WHEN 'utm_campaign' THEN vi.utm_tags->>'utm_campaign'
                       END AS k
                FROM visits vi
                WHERE vi.organization_id = _organization_id
                  AND vi.tp_id = ANY(final_tp_ids)
                  AND (_start_date IS NULL OR vi.created_at >= _start_date)
                  AND (_end_date   IS NULL OR vi.created_at <= _end_date)
                  AND (_exclude_bot = false OR vi.is_bot = false)
                  AND (_utm_sources   IS NULL OR array_length(_utm_sources,1)   IS NULL OR vi.utm_tags->>'utm_source'   = ANY(_utm_sources))
                  AND (_utm_mediums   IS NULL OR array_length(_utm_mediums,1)   IS NULL OR vi.utm_tags->>'utm_medium'   = ANY(_utm_mediums))
                  AND (_utm_campaigns IS NULL OR array_length(_utm_campaigns,1) IS NULL OR vi.utm_tags->>'utm_campaign' = ANY(_utm_campaigns))
            ),
            g AS (
                SELECT k, count(*) AS clicks
                FROM v WHERE k IS NOT NULL AND k <> ''
                GROUP BY k
                ORDER BY clicks DESC, k
                LIMIT 500
            )
            SELECT jsonb_build_object(
                'group_by', _group_by,
                'data', COALESCE(jsonb_agg(jsonb_build_object(
                            'key', g.k, 'name', g.k,
                            'clicks', g.clicks, 'direct_opens', 0, 'matched', 0)
                            ORDER BY g.clicks DESC, g.k), '[]'::jsonb),
                'total', (SELECT count(*) FROM v WHERE k IS NOT NULL AND k <> '')
            )
            FROM g
        );
    END IF;

    RETURN (
        WITH tp_clicks AS (
            SELECT vi.tp_id, count(*) AS clicks
            FROM visits vi
            WHERE vi.organization_id = _organization_id
              AND vi.tp_id = ANY(final_tp_ids)
              AND (_start_date IS NULL OR vi.created_at >= _start_date)
              AND (_end_date   IS NULL OR vi.created_at <= _end_date)
              AND (_exclude_bot = false OR vi.is_bot = false)
              AND (_utm_sources   IS NULL OR array_length(_utm_sources,1)   IS NULL OR vi.utm_tags->>'utm_source'   = ANY(_utm_sources))
              AND (_utm_mediums   IS NULL OR array_length(_utm_mediums,1)   IS NULL OR vi.utm_tags->>'utm_medium'   = ANY(_utm_mediums))
              AND (_utm_campaigns IS NULL OR array_length(_utm_campaigns,1) IS NULL OR vi.utm_tags->>'utm_campaign' = ANY(_utm_campaigns))
            GROUP BY vi.tp_id
        ),
        tp_events AS (
            SELECT e.touch_point_id,
                   count(*) FILTER (WHERE e.event_type = 'app_open')       AS direct_opens,
                   count(*) FILTER (WHERE e.event_type = 'deferred_match') AS matched
            FROM deep_link_events e
            WHERE e.organization_id = _organization_id
              AND e.touch_point_id = ANY(final_tp_ids)
              AND (_start_date IS NULL OR e.created_at >= _start_date)
              AND (_end_date   IS NULL OR e.created_at <= _end_date)
            GROUP BY e.touch_point_id
        ),
        tp_base AS (
            SELECT tp.id, tp.short_url, tp.collection_id,
                   COALESCE(c.clicks, 0)        AS clicks,
                   COALESCE(ev.direct_opens, 0) AS direct_opens,
                   COALESCE(ev.matched, 0)      AS matched
            FROM touch_points tp
            LEFT JOIN tp_clicks c  ON c.tp_id = tp.id
            LEFT JOIN tp_events ev ON ev.touch_point_id = tp.id
            WHERE tp.id = ANY(final_tp_ids)
        ),
        rows AS (
            SELECT b.id::text AS key, b.short_url AS name,
                   b.clicks::bigint, b.direct_opens::bigint, b.matched::bigint
            FROM tp_base b
            WHERE _group_by = 'link'
              AND (b.clicks > 0 OR b.direct_opens > 0 OR b.matched > 0)

            UNION ALL
            SELECT t.id::text, t.name,
                   sum(b.clicks)::bigint, sum(b.direct_opens)::bigint, sum(b.matched)::bigint
            FROM tp_base b
            JOIN tp_tag_links ttl ON ttl.tp_id = b.id
            JOIN tags t ON t.id = ttl.tag_id
            WHERE _group_by = 'tag'
            GROUP BY t.id, t.name
            HAVING sum(b.clicks) > 0 OR sum(b.direct_opens) > 0 OR sum(b.matched) > 0

            UNION ALL
            SELECT c.id::text, c.name,
                   sum(b.clicks)::bigint, sum(b.direct_opens)::bigint, sum(b.matched)::bigint
            FROM tp_base b
            JOIN collections c ON c.id = b.collection_id
            WHERE _group_by = 'space'
            GROUP BY c.id, c.name
            HAVING sum(b.clicks) > 0 OR sum(b.direct_opens) > 0 OR sum(b.matched) > 0
        ),
        ordered AS (
            SELECT * FROM rows ORDER BY clicks DESC, key LIMIT 500
        )
        SELECT jsonb_build_object(
            'group_by', _group_by,
            'data', COALESCE(jsonb_agg(jsonb_build_object(
                        'key', key, 'name', name,
                        'clicks', clicks, 'direct_opens', direct_opens, 'matched', matched)
                        ORDER BY clicks DESC, key), '[]'::jsonb),
            'total', (SELECT COALESCE(sum(r.clicks), 0) FROM rows r)
        )
        FROM ordered
    );
END;
$function$;
