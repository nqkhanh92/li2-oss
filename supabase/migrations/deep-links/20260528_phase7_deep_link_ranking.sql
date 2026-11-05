-- Phase 7 (Task 7.1) — get_deep_link_ranking
-- Per-link/tag/space ranking (Clicks · Direct opens · Matched) + per-referrer/utm ranking
-- (clicks-only) over the deep-link universe. Powers Card A "Top deep links" and Card B
-- "Click sources" on the deep-link analytics page.
--
-- Conventions mirror get_deep_link_click_summary (20260526_phase5_6_deep_link_click_summary.sql):
--   • plain LANGUAGE plpgsql, default SECURITY INVOKER (service-role app; RLS moot).
--   • DEEP-LINK UNIVERSE = touch_points whose domain has deep_link_apps enabled w/ >=1 app,
--     intersected with _viewable_tp_ids ∩ _tp_ids ∩ tags ∩ collections.
--   • RETURNS jsonb (like get_ranking_by_links) — variable row shape per _group_by.
--   • NO server pagination: returns all active rows ORDER BY clicks DESC, cap 500. The card
--     sorts (clicks|matched|direct_opens) + paginates 10/page client-side.
--   • Misses are NOT per-link rankable (deferred_miss has NULL touch_point_id by design) — only
--     app_open + deferred_match are grouped per touch point. No match-rate column.
--   • _exclude_bot defaults true and applies to the visits/clicks side only.
--   • tag/space table refs confirmed against get_ranking_by_links.sql: tags(t.id, t.name) via
--     tp_tag_links; collections(c.id, c.name) via touch_points.collection_id.
--
-- Manual-apply: Kei applies this on dev, then Claude runs `yarn gen:types`.

DROP FUNCTION IF EXISTS public.get_deep_link_ranking(
    uuid, text, uuid[], uuid[], uuid[], uuid[], timestamptz, timestamptz,
    text[], text[], text[], boolean
);

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
    -- ── deep-link universe ∩ filters ∩ viewable (mirrors get_deep_link_click_summary) ──────
    SELECT array_agg(DISTINCT tp.id) INTO dl_tp_ids
    FROM touch_points tp
    JOIN domains d ON d.id = tp.domain_id
    WHERE tp.organization_id = _organization_id
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

    -- ── clicks-only group-bys: referrer / utm_* (Card B) ───────────────────────────────────
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

    -- ── per-tp base (clicks ⟕ events) for link / tag / space (Card A) ───────────────────────
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
              AND e.touch_point_id = ANY(final_tp_ids)   -- NULL-tp misses excluded by the predicate
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
            -- link: one row per touch point
            SELECT b.id::text AS key, b.short_url AS name,
                   b.clicks::bigint, b.direct_opens::bigint, b.matched::bigint
            FROM tp_base b
            WHERE _group_by = 'link'
              AND (b.clicks > 0 OR b.direct_opens > 0 OR b.matched > 0)

            UNION ALL
            -- tag: roll up per tag (a tp can belong to many tags → counted in each)
            SELECT t.id::text, t.name,
                   sum(b.clicks)::bigint, sum(b.direct_opens)::bigint, sum(b.matched)::bigint
            FROM tp_base b
            JOIN tp_tag_links ttl ON ttl.tp_id = b.id
            JOIN tags t ON t.id = ttl.tag_id
            WHERE _group_by = 'tag'
            GROUP BY t.id, t.name
            HAVING sum(b.clicks) > 0 OR sum(b.direct_opens) > 0 OR sum(b.matched) > 0

            UNION ALL
            -- space: roll up per collection
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
            -- total = clicks across ALL active rows, not just the 500-capped page (mirrors the
            -- referrer/utm branch, which totals pre-cap).
            'total', (SELECT COALESCE(sum(r.clicks), 0) FROM rows r)
        )
        FROM ordered
    );
END;
$function$;
