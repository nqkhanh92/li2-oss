-- AI Agent Platform — Phase 0
-- Plan feature flag: ai_chat
-- Gates POST /api/agent/session minting via ensureOrgPlan(org_id, AI_CHAT) — the single
-- plan-gate enforcement point for the whole agent feature (architecture §3, D4; task-0.3).
--
-- Tiers (LOCKED Kei 2026-06-23): Pro (t1) and Pro-trial (t1_trial) get ai_chat.
-- Starter (t0) does NOT.
-- ⚠️ CORRECTION (2026-06-26): the original line here read "There is NO t2/Premium tier live" —
--    that was STALE even when written. t2 (Enterprise/Business) IS a live PlanKey and already
--    carries the deep_link_attribution flag. The decision to make t2 AI-bearing was taken in
--    Phase 1a (Kei): see the follow-up grant migration 20260626_agent__grant_ai_chat_t2.sql,
--    which adds 'ai_chat' to t2. This applied migration is left as-was (t1/t1_trial only) —
--    do NOT edit its UPDATE; the t2 grant rides the new file.
--
-- Trial (t1_trial) gets the FEATURE here, but must run at LOWER AI usage than t1. That is a
-- per-tier spend cap (§11), enforceable only once the LLM lands → Phase 1, not P0 (P0 makes zero
-- Anthropic calls). No action in this migration.
--
-- Mirrors the deep_link_attribution grant in
-- supabase/migrations/deep-links/20260413_deep_link_events_and_plan_flag.sql (idempotent).
--
-- Kei applies manually (plan rows are production config).

UPDATE plans
SET advanced_features_allowed = array_append(
    COALESCE(advanced_features_allowed, ARRAY[]::text[]),
    'ai_chat'
  )
WHERE plan_key IN ('t1', 't1_trial')
  AND NOT ('ai_chat' = ANY(COALESCE(advanced_features_allowed, ARRAY[]::text[])));
