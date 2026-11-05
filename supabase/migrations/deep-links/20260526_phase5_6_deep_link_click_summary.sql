-- Phase 5 (Task 5.6) — Clicks side of the deep-link funnel, over `visits`.
--
-- get_deep_link_click_summary : org-wide / filterable count of clicks on deep-link
--   links (the top of the Clicks → App Opens funnel). Pairs with get_deep_link_summary
--   (Task 5.1) as TWO independent funnel stages — never summed (decision D-A).
--
-- WHY a separate RPC over `visits` (not an extension of get_deep_link_summary):
--   keeps the by_miss_reason keystone RPC isolated, and `visits` (all clicks/scans) is
--   a different base table from deep_link_events (app-opens only). This is the only
--   deep-link source populated in prod today — App Opens stay near-empty until the SDK.
--
-- DEEP-LINK UNIVERSE: `visits` has no domain_id, so "deep-link clicks" are scoped via
--   visits.tp_id → touch_points.domain_id → domains where the domain has deep linking
--   ENABLED with ≥1 app: deep_link_apps->>'enabled' = 'true'
--   AND jsonb_array_length(deep_link_apps->'apps') > 0
--   (shape {enabled, apps:[{platform}]}, verified dev DB 2026-05-26).
--
-- Conventions identical to get_deep_link_summary (Task 5.1 migration): plain
-- plpgsql / default SECURITY INVOKER; NULL/empty array = no filter; _viewable_tp_ids
-- added per the sibling analytics convention. UTM here is a DIRECT visits.utm_tags
-- predicate (snake_case keys) — the simplest form of the same per-link UTM the App
-- Opens side reaches via touch_points (no click_id join anywhere; deferred-issues #7).
-- _exclude_bot DOES apply here (visits.is_bot exists), unlike the App Opens side.
--
-- Manual-apply: Kei applies on dev, then Claude runs `yarn gen:types`.

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
    -- final_tp_ids is ALWAYS the deep-link universe ∩ filters (never NULL/"all"),
    -- which is what scopes `visits` (an all-clicks table) to deep-link links.
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
