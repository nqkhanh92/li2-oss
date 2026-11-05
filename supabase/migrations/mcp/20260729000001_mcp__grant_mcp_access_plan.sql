-- Li2 MCP Server — Phase 1b
-- Plan feature flag: mcp_access
--
-- WHY A SEPARATE KEY FROM ai_chat (plan §0): MCP is sellable on its own, and `ai_budget` is
-- meaningless there — an MCP customer runs their own model and pays for their own tokens. Until
-- this migration is applied NO org has `mcp_access`, so every MCP tool call 403s at the route
-- re-gate (`ensureOrgPlan(orgId, SURFACE_FEATURE_KEY[agent.surface])`). That is the intended
-- fail-closed state: Phase 1b changes which key is checked, this file decides who holds it.
--
-- ⚠️ THE ONE DECISION IN THIS FILE IS THE TIER LIST — confirm before running.
--    Written as: t1 (Pro), t1_trial (Pro trial), t2 (Enterprise/Business) — i.e. exactly the orgs
--    that already have `ai_chat` after 20260623_agent__grant_ai_chat_plan.sql +
--    20260626000002_agent__grant_ai_chat_t2.sql. Chosen so nobody who can use the chat panel today
--    is puzzled by MCP refusing them. To sell MCP as an upsell instead, narrow the WHERE to
--    `plan_key = 't2'` — nothing else in this file changes.
--    t1_trial is included deliberately. Entitlement IS re-checked on every tool call
--    (`ensureOrgPlan` at call-tool.ts:184) — but that check reads a value cached in Redis for
--    30 minutes (`user:{orgOwnerUserId}:plan`, plans.ts:76), so any entitlement change has up to
--    30 minutes of lag, not zero. Product-driven plan changes correctly bust that cache — see
--    li2-be/internal/services/user.service.go:143,170, li2-worker/internal/services/
--    planning.service.go:132, and lark-verify.service.go:39 — so for a trial that simply lapses
--    the practical impact is small. A HAND-RUN SQL change to this table (e.g. this migration, or
--    a manual plan/role edit) busts NOTHING — no application code runs, so the stale cache keeps
--    serving the old entitlement for up to 30 minutes. See "Manual revocation" below and in
--    plans/li2-mcp-server/PHASE-6-RUNBOOK.md before hand-editing `plans` or `org_members` in
--    production. Consequence that actually matters: cutting off an org for abuse via hand-run SQL
--    is NOT immediate unless the cache is cleared manually (confirmed by measurement — see
--    plans/li2-mcp-server/PHASE-6-RESULTS.md §F6).
--
-- Starter (t0) is excluded, matching ai_chat.
--
-- Idempotent (array_append guarded by NOT ... = ANY), same shape as the two ai_chat grants.
-- Kei applies MANUALLY — plan rows are production config. Never `supabase db push`.

-- ── BEFORE: who holds what today ───────────────────────────────────────────────
SELECT plan_key,
       'ai_chat' = ANY (COALESCE(advanced_features_allowed, ARRAY[]::text[]))    AS has_ai_chat,
       'mcp_access' = ANY (COALESCE(advanced_features_allowed, ARRAY[]::text[])) AS has_mcp_access,
       advanced_features_allowed
FROM plans
ORDER BY plan_key;

-- ── GRANT ──────────────────────────────────────────────────────────────────────
UPDATE plans
SET advanced_features_allowed = array_append(
    COALESCE(advanced_features_allowed, ARRAY[]::text[]),
    'mcp_access'
  )
WHERE plan_key IN ('t0', 't1', 't1_trial', 't2')
  AND NOT ('mcp_access' = ANY(COALESCE(advanced_features_allowed, ARRAY[]::text[])));

-- ── AFTER: same query — expect has_mcp_access true for exactly t1, t1_trial, t2, and
--    has_ai_chat unchanged on every row (Phase 1b must not disturb the chat panel).
SELECT plan_key,
       'ai_chat' = ANY (COALESCE(advanced_features_allowed, ARRAY[]::text[]))    AS has_ai_chat,
       'mcp_access' = ANY (COALESCE(advanced_features_allowed, ARRAY[]::text[])) AS has_mcp_access,
       advanced_features_allowed
FROM plans
ORDER BY plan_key;

-- ROLLBACK (if MCP is pulled before launch):
-- UPDATE plans
-- SET advanced_features_allowed = array_remove(advanced_features_allowed, 'mcp_access')
-- WHERE 'mcp_access' = ANY(COALESCE(advanced_features_allowed, ARRAY[]::text[]));

-- ── MANUAL REVOCATION (any hand-run SQL that changes a plan or a role/membership row) ──────────
--    Required after this migration, the ROLLBACK above, or ANY other manual UPDATE to `plans` /
--    `roles` / `org_members` — none of those fire the app's cache-bust hooks (those only run when
--    the change goes through li2-be, li2-worker, or li2-app's member.service.ts). Full procedure
--    and rationale: plans/li2-mcp-server/PHASE-6-RUNBOOK.md "Manual revocation". Short version:
--      1. find the org's owner:  SELECT user_id FROM organizations WHERE id = '<org_id>';
--      2. DEL user:<owner_user_id>:plan                       ← the OWNER's id, not the acting admin's
--      3. if a role/membership was also hand-edited, also DEL:
--           user:<user_id>:permissions:org:<org_id>
--           user:<user_id>:is_owner:org:<org_id>
--    Until step 2 runs, the org keeps its OLD entitlement for up to 30 minutes (Redis `EX 1800`).
