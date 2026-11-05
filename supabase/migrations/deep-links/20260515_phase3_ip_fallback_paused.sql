-- Migration: 20260515_phase3_ip_fallback_paused
-- Purpose:   Add 'opt_out' to deep_link_events.miss_reason enum to support the
--            IP-fallback pause introduced by D-3.D-revision.md.
--
--            When LI2_IP_FALLBACK_ENABLED=false (default after this revision),
--            /track/open requests with li2Domains only short-circuit to a
--            deferred_miss row with miss_reason='opt_out' rather than running
--            the Redis IP-fallback resolver. The five other miss_reason values
--            remain valid; rows written before 2026-05-15 keep their original
--            classification.
--
-- See:       plans/deep-links/phase-3-ios-deferred/D-3.D-revision.md
--
-- Pre-flight:
--   The constraint was added inline in 20260513_phase3_ios_deferred.sql step 2
--   with the auto-generated name deep_link_events_miss_reason_check. This
--   migration drops + re-adds it under that same name with 'opt_out' included.
--
-- Rollback:
--   Drop 'opt_out' from the CHECK list. Any deferred_miss rows written during
--   the paused interval would then violate the constraint, so rollback must
--   either re-classify those rows or accept the cleanup. The intent is to
--   re-flip the flag (no schema change) when unpause criteria are met — see
--   D-3.D-revision.md "What it takes to unpause".

ALTER TABLE public.deep_link_events DROP CONSTRAINT IF EXISTS deep_link_events_miss_reason_check;

ALTER TABLE public.deep_link_events
  ADD CONSTRAINT deep_link_events_miss_reason_check
  CHECK (miss_reason IN (
    'no_candidate',
    'ambiguous_candidate',
    'ua_mismatch',
    'clipboard_denied',
    'clipboard_empty',
    'cross_tenant_blocked',
    'opt_out'                -- NEW (D-3.D-revision 2026-05-15): IP fallback paused
  ));

COMMENT ON COLUMN public.deep_link_events.miss_reason IS
  'Reason for deferred_miss. NULL on deferred_match and app_open rows. '
  'See plans/deep-links/phase-3-ios-deferred/README.md D-3.I for enum semantics '
  'and D-3.D-revision.md for opt_out (added 2026-05-15).';
