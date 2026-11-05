-- Phase 5 (Task 5.1) — Deep Link Analytics RPCs over deep_link_events.
--
-- get_deep_link_summary  : org-wide / filterable aggregate of the App-Opens side
--                          (app_open / deferred_match / deferred_miss), incl. the
--                          by_miss_reason keystone (all 7 enum values zero-filled).
--
-- NOTE (2026-05-27 consolidation, #6): get_deep_link_timeseries used to live here too,
-- but it is now owned SOLELY by 20260527_phase5_6_timeseries_user_timezone.sql (the
-- tz-aware 13-arg version). Re-creating the 12-arg version here would resurrect a
-- duplicate overload on re-apply → ambiguous-function errors at call time. This file
-- is now summary-only and safe to re-apply on its own.
--
-- Conventions mirror get_conversion_stats_v3
-- (supabase/migrations/20260514000004_conversions__add_utm_channel_filter_to_rpcs.sql):
--   • plain LANGUAGE plpgsql, default SECURITY INVOKER (service-role app; RLS moot).
--   • NULL / empty array = no filter on that dimension.
--   • touch-point resolution = intersection of _viewable_tp_ids ∩ _tp_ids ∩ tags ∩
--     collections (tags via tp_tag_links.tp_id; collections via touch_points.collection_id).
--
-- THREE deliberate deviations from the Task 5.1 spec — verified against the dev DB
-- on 2026-05-26, see plans/deep-links/phase-5-analytics/deferred-issues.md #7:
--   1. _viewable_tp_ids — ADDED (spec omitted it). Every sibling analytics RPC takes
--      it and the service layer resolves it via getViewableTouchpointIds(orgId,userId);
--      omitting it would over-expose links to permission-scoped users.
--   2. UTM = LINK-LEVEL resolution (touch_points.utm_tags), NOT a
--      deep_link_events.click_id → visits.li2_cid join. NOTE (2026-05-27 audit):
--      that join is NO LONGER "structurally dead". Since the li2_cid unification
--      fix, deferred_match rows carry click_id = GenerateShortId(fp,tp) = the
--      originating visit's li2_cid (verified: matched rows resolve to their visit
--      on dev; the old "0/59" was the pre-fix snapshot). The join is dead ONLY for
--      app_open / deferred_miss rows, which mint a random click_id
--      (insertEventWithRetry) by design. We STILL resolve UTM link-level because
--      (a) matched rows already carry touch_point_id, so the join would yield the
--      identical answer with no join, and (b) it is the only resolution available
--      for the non-matching rows. Same filter semantics, consistent with
--      get_deep_link_click_summary. A per-click drill-down (matched open → its
--      click's visit/UTMs) is now feasible as a future enhancement.
--   3. _exclude_bot is a NO-OP here — deep_link_events has no is_bot column (/track/open
--      is an authenticated SDK surface, not a bot target). Bot exclusion applies only on
--      the Clicks side. The param is kept for a uniform signature.
--
-- Manual-apply: Kei applies this on dev, then Claude runs `yarn gen:types`.
-- 2026-05-27 revision: get_deep_link_summary drops the redundant by_event_type
-- column (the three top-level counts already carry it) — RE-APPLY this file. The
-- DROP FUNCTION below makes the re-apply safe (CREATE OR REPLACE alone cannot
-- change a function's return type).

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. get_deep_link_summary
-- ─────────────────────────────────────────────────────────────────────────────
-- Drop first: removing the by_event_type column changes the return type, which
-- CREATE OR REPLACE cannot do. The arg-type list must match the signature below.
DROP FUNCTION IF EXISTS public.get_deep_link_summary(
    uuid, uuid[], uuid[], uuid[], uuid[], timestamptz, timestamptz,
    text[], text[], text[], boolean
);

CREATE OR REPLACE FUNCTION public.get_deep_link_summary(
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
    app_opens        bigint,
    deferred_matches bigint,
    deferred_misses  bigint,
    match_rate       numeric,
    by_platform      jsonb,
    by_method        jsonb,
    by_miss_reason   jsonb
)
LANGUAGE plpgsql
AS $function$
DECLARE
    final_tp_ids            uuid[];
    tp_ids_from_tags        uuid[];
    tp_ids_from_collections uuid[];
    utm_tp_ids              uuid[];
    utm_filter_active       boolean;
BEGIN
    -- ── touch-point resolution (intersection) ───────────────────────────────
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

    -- ── UTM: link-level resolution (see header note #2) ──────────────────────
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

    RETURN QUERY
    WITH ev AS (
        SELECT e.event_type, e.platform, e.match_method, e.miss_reason
        FROM deep_link_events e
        WHERE e.organization_id = _organization_id
          AND (_start_date IS NULL OR e.created_at >= _start_date)
          AND (_end_date   IS NULL OR e.created_at <= _end_date)
          AND (final_tp_ids IS NULL OR e.touch_point_id = ANY(final_tp_ids))
          -- _exclude_bot intentionally not applied (no is_bot column — header note #3)
    )
    SELECT
        count(*) FILTER (WHERE ev.event_type = 'app_open')::bigint,
        count(*) FILTER (WHERE ev.event_type = 'deferred_match')::bigint,
        count(*) FILTER (WHERE ev.event_type = 'deferred_miss')::bigint,
        round(
            count(*) FILTER (WHERE ev.event_type = 'deferred_match')::numeric
            / nullif(count(*) FILTER (WHERE ev.event_type IN ('deferred_match','deferred_miss')), 0),
            4
        ),
        (SELECT COALESCE(jsonb_object_agg(k, c), '{}'::jsonb)
           FROM (SELECT COALESCE(platform, 'unknown') AS k, count(*) AS c FROM ev GROUP BY 1) s),
        (SELECT COALESCE(jsonb_object_agg(k, c), '{}'::jsonb)
           FROM (SELECT COALESCE(match_method, 'unknown') AS k, count(*) AS c
                   FROM ev WHERE event_type IN ('app_open','deferred_match') GROUP BY 1) s),
        (SELECT jsonb_object_agg(reason, cnt)
           FROM (
               SELECT u.reason, COALESCE(g.c, 0) AS cnt
               FROM unnest(ARRAY[
                   'clipboard_denied','clipboard_empty','opt_out','no_candidate',
                   'ambiguous_candidate','ua_mismatch','cross_tenant_blocked'
               ]) AS u(reason)
               LEFT JOIN (
                   SELECT miss_reason, count(*) AS c
                   FROM ev WHERE event_type = 'deferred_miss' AND miss_reason IS NOT NULL
                   GROUP BY 1
               ) g ON g.miss_reason = u.reason
           ) z)
    FROM ev;
END;
$function$;
