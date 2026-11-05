-- li2-app/supabase/migrations/deep-links/20260513_phase3_ios_deferred.sql
--
-- Phase 3 iOS deferred deep links — single combined migration (CT-5 lock).
-- See plans/deep-links/phase-3-ios-deferred/{README,SPEC}.md for full context.
--
-- This migration does THREE things:
--   1. Relax deep_link_events.match_method CHECK to include 'ip_ua'
--      (D-3.D + D-3.E: UA-hash tie-break produces this value on 2+
--      IP-candidate disambiguation wins).
--   2. Add deep_link_events.miss_reason TEXT column with 6-value enum
--      CHECK constraint (D-3.I — surfaces WHY deferred attribution
--      missed for Phase 5 marketer-facing analytics).
--   3. Add conversion_events.deep_link_event_id UUID FK + index
--      (CT-3 #1 carryforward — schema bridge that Phase 2.5's
--      trackLead/trackSale resolver will consume; Phase 3 only writes
--      the column, never reads it).
--
-- Two known non-actions (deliberate; documented so a future migration
-- author doesn't "fix" them):
--   - deep_link_events.click_id is already UNIQUE via
--     idx_deep_link_events_click_id from Phase 2 (see 20260413:21-22).
--     CT-5 step 1 ("verify/add UNIQUE constraint") resolves to verified-
--     present; no new constraint work. The synthetic clickId guarantee
--     of D-3.C rides on this existing index.
--   - deep_link_events.event_type CHECK already permits 'deferred_match'
--     and 'deferred_miss' from Phase 2 (see 20260413:11). No relaxation
--     needed.
--
-- Pre-flight verified 2026-05-13 (Kei):
--   constraint_name = deep_link_events_match_method_check
--   current definition = ('universal_link','app_link','clipboard','ip','install_referrer')


-- Step 1 — Relax match_method CHECK to add 'ip_ua' (D-3.D + D-3.E).
-- Phase 2 declared this CHECK inline with values
-- {'universal_link','app_link','clipboard','ip','install_referrer'}.
-- Phase 3 introduces 'ip_ua' as the match_method written when an IP-fallback
-- candidate set is disambiguated by UA-hash tie-break (per D-3.E lock).
-- Without this relaxation, /track/open would 500 on every UA-tie-break win.

ALTER TABLE public.deep_link_events
  DROP CONSTRAINT deep_link_events_match_method_check;

ALTER TABLE public.deep_link_events
  ADD CONSTRAINT deep_link_events_match_method_check
  CHECK (match_method IN (
    'universal_link',
    'app_link',
    'clipboard',
    'ip',
    'ip_ua',            -- NEW (Phase 3 D-3.E UA-tie-break wins)
    'install_referrer'
  ));


-- Step 2 — Add miss_reason TEXT column with 6-value enum CHECK (D-3.I).
-- Nullable: populated only on event_type='deferred_miss' rows. NULL on
-- 'deferred_match' and 'app_open' rows (no miss to explain).
-- Phase 5 analytics widgets read the distribution; Phase 3 only writes it.

ALTER TABLE public.deep_link_events
  ADD COLUMN miss_reason TEXT
  CHECK (miss_reason IN (
    'no_candidate',          -- HSet empty (clipboard) OR sorted set empty (IP)
    'ambiguous_candidate',   -- 2+ candidates remained after UA-hash tie-break
    'ua_mismatch',           -- 1 candidate at IP, stored UA != incoming UA (CGNAT catch)
    'clipboard_denied',      -- SDK reports paste permission denied
    'clipboard_empty',       -- SDK reports clipboard had no li2 URL
    'cross_tenant_blocked'   -- Tenant check failed (security signal, rare)
  ));

COMMENT ON COLUMN public.deep_link_events.miss_reason IS
  'Reason for deferred_miss. NULL on deferred_match and app_open rows. '
  'See plans/deep-links/phase-3-ios-deferred/README.md D-3.I for the enum semantics.';


-- Step 3 — conversion_events.deep_link_event_id FK + index (CT-3 #1).
-- Schema bridge for Phase 2.5's trackLead/trackSale deferred-clickId
-- resolver. Phase 3 does NOT populate this column; Phase 2.5 will, by
-- looking up the deep_link_events row that minted the clickId in the
-- conversion request.
--
-- ON DELETE SET NULL mirrors the established pattern from
-- deep_link_events.touch_point_id (see 20260413:9): losing the
-- attribution FK should not delete the conversion event itself.

ALTER TABLE public.conversion_events
  ADD COLUMN deep_link_event_id UUID
  REFERENCES public.deep_link_events(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────────────────────────
-- DOC-2 (2026-05-13) — INTENTIONALLY NOT CONCURRENTLY. Reasoning:
--   1. Supabase web SQL editor wraps statements in BEGIN/COMMIT by default,
--      which is incompatible with CREATE INDEX CONCURRENTLY ("cannot run
--      inside a transaction block").
--   2. `deep_link_event_id` is a brand-new column added in the ALTER TABLE
--      above. All existing rows have NULL. The partial-index predicate
--      `WHERE deep_link_event_id IS NOT NULL` means the index is built
--      over ZERO rows → lock duration is sub-millisecond → no production
--      impact.
-- DO NOT "fix" this by adding CONCURRENTLY — it will fail to apply via the
-- Supabase web editor that Kei uses for migrations.
-- ─────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_conversion_events_deep_link_event_id
  ON public.conversion_events(deep_link_event_id)
  WHERE deep_link_event_id IS NOT NULL;

COMMENT ON COLUMN public.conversion_events.deep_link_event_id IS
  'Phase 2.5+ resolver-populated. Links a conversion (lead/sale) back to '
  'the deep_link_events row whose click_id was carried through SDK persistence. '
  'NULL for all rows pre-Phase-2.5 and for conversions not originating from a deep link.';
