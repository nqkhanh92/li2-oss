-- AI Agent Platform — Phase 1a
-- Plan feature flag: ai_chat — extend the grant to t2 (Enterprise/Business).
--
-- WHY (Kei 2026-06-26, task-1a.0 Finding 1, option a): t2 is a live PlanKey (it already carries
-- deep_link_attribution) and is intended to run the agent. The Phase-0 grant
-- (20260623_agent__grant_ai_chat_plan.sql) only granted t1 + t1_trial; its comment wrongly said
-- "There is NO t2/Premium tier live" (corrected in that file). This migration makes t2 AI-bearing
-- so a t2 org passes ensureOrgPlan(AI_CHAT) and can reach the mint route.
--
-- t2's resolved monthly budget = TIER_DEFAULT['t2'] = 1000 cents ($10), same as Pro t1
-- (plan-permission.ts; Kei 2026-06-26). Per-org override via org_quotas.ai_monthly_budget_cents.
--
-- Idempotent — mirrors the Phase-0 grant pattern. Kei applies manually (plan rows are prod config).

UPDATE plans
SET advanced_features_allowed = array_append(
    COALESCE(advanced_features_allowed, ARRAY[]::text[]),
    'ai_chat'
  )
WHERE plan_key = 't2'
  AND NOT ('ai_chat' = ANY(COALESCE(advanced_features_allowed, ARRAY[]::text[])));
