-- AI Agent Platform — Phase 0 (Walking Skeleton)
-- Creates the dedicated `agent` schema (NOT public, per architecture D6/§6) holding durable
-- chat-history + audit + trace tables, memory-structure tables (built now, populated in Phase 1),
-- the PageIndex ToC slot (Phase 2), and a Postgres LOGIN role scoped to `agent` ONLY so li2-ai
-- cannot read public org tables even via SQL injection.
--
-- APPLY ORDER (Kei, manual — see plans/ai-agent-platform/phase-0-walking-skeleton/task-0.2.md):
--   1. Generate a password:  openssl rand -base64 18
--   2. Replace 'REPLACE_WITH_GENERATED_PASSWORD' in the CREATE ROLE block (§6) with that value.
--   3. Paste the whole file into the Supabase SQL editor and run (or psql -f).
--   4. Expose `agent` in Supabase: Project Settings → API → Exposed schemas → add `agent`.
--   5. Put the password into li2-ai's AGENT_DB_URL secret (the direct Postgres DSN).
--   6. Verify isolation (see the bottom of this file).
--   ⚠️ Do NOT commit the file with the real password substituted — keep the placeholder in git.
--
-- NOTE: There is no in-repo precedent for CREATE SCHEMA / CREATE ROLE in supabase/migrations
-- (the `logs` schema was provisioned outside migrations). This migration is new ground by design —
-- the scoped role is the security keystone of D6.

-- =============================================================================
-- 1. Schema
-- =============================================================================
CREATE SCHEMA IF NOT EXISTS agent;

-- =============================================================================
-- 2. Core tables (§6) — durable history + the audit trail
-- =============================================================================

-- Chat sessions. org_id/user_id are intentionally NOT FK'd to public.* — the `agent` schema must
-- not depend on `public` (keeps a future physical DB split clean). The back hop already
-- authenticated the org/user; integrity is enforced at the app layer.
CREATE TABLE agent.agent_sessions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL,
  user_id    uuid NOT NULL,
  title      text,
  status     text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_agent_sessions_org ON agent.agent_sessions (org_id, created_at DESC);

-- Durable message history (survives Redis flush). model is NULL in P0 (no LLM).
CREATE TABLE agent.agent_messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES agent.agent_sessions(id) ON DELETE CASCADE,
  role       text NOT NULL,                 -- 'user' | 'assistant' | 'tool'
  content    text,
  model      text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_agent_messages_session ON agent.agent_messages (session_id, created_at);

-- THE audit trail. input/output are POST-redaction (§14, written by li2-ai task-0.6).
CREATE TABLE agent.agent_tool_calls (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id   uuid NOT NULL REFERENCES agent.agent_messages(id) ON DELETE CASCADE,
  tool_name    text NOT NULL,
  input        jsonb,                        -- redacted
  output       jsonb,                        -- redacted
  is_write     boolean NOT NULL DEFAULT false,
  status       text NOT NULL DEFAULT 'ok',
  confirmed_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Long-running-task tracking. UNUSED in P0 — created so the transport contract (§4 item 4) has a
-- home and the long-task tier is additive later, not a schema churn.
CREATE TABLE agent.agent_tasks (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES agent.agent_sessions(id) ON DELETE CASCADE,
  type       text NOT NULL,
  status     text NOT NULL DEFAULT 'pending',
  result_ref text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- 3. Trace table (§14) — session → turn → span. attributes are POST-redaction.
-- =============================================================================
CREATE TABLE agent.agent_traces (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     uuid NOT NULL REFERENCES agent.agent_sessions(id) ON DELETE CASCADE,
  turn_id        uuid NOT NULL,
  span_name      text NOT NULL,
  parent_span_id uuid,                       -- NULL for the turn root span
  attributes     jsonb,                      -- redacted
  status         text NOT NULL DEFAULT 'ok',
  started_at     timestamptz NOT NULL DEFAULT now(),
  ended_at       timestamptz
);
CREATE INDEX idx_agent_traces_turn ON agent.agent_traces (turn_id, started_at);

-- =============================================================================
-- 4. Memory-structure tables (§16) — STRUCTURE ONLY, not populated in P0.
--    MVP writes only tier='summary', and not until Phase 1 (needs an LLM).
-- =============================================================================
CREATE TABLE agent.agent_memory (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL,
  user_id    uuid NOT NULL,
  tier       text NOT NULL
             CHECK (tier IN ('summary','preferences','facts','task_history','business_context')),
  content    jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_agent_memory_scope ON agent.agent_memory (org_id, user_id, tier);

-- =============================================================================
-- 5. PageIndex ToC slot (§9) — unused in P0, empty until Phase 2.
-- =============================================================================
CREATE TABLE agent.kb_toc (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tree       jsonb,
  source_rev text,
  built_at   timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- 6. Scoped DB role — the security keystone of D6.
--    li2-ai connects as THIS role over a direct Postgres DSN (AGENT_DB_URL),
--    NEVER the Supabase service role. No grant on schema public.
-- =============================================================================

-- Create the LOGIN role idempotently.
-- ⚠️ BEFORE RUNNING: replace the placeholder literal below with the real password
--    (e.g. the output of `openssl rand -base64 18`). This file is applied manually via the
--    Supabase SQL editor, so the password is pasted inline here — do NOT commit the real value.
-- A plain DO block works in the Supabase SQL editor (psql :'var' / \gexec meta-commands do NOT).
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'li2_ai_agent') THEN
    CREATE ROLE li2_ai_agent LOGIN PASSWORD 'REPLACE_WITH_GENERATED_PASSWORD';
  END IF;
END
$$;

GRANT USAGE ON SCHEMA agent TO li2_ai_agent;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA agent TO li2_ai_agent;

-- Future tables created in `agent` automatically get the same grants.
ALTER DEFAULT PRIVILEGES IN SCHEMA agent
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO li2_ai_agent;
ALTER DEFAULT PRIVILEGES IN SCHEMA agent
  GRANT USAGE ON SEQUENCES TO li2_ai_agent;

-- Belt-and-suspenders: drop any direct grant on schema public for this role.
-- NOTE: this does NOT remove the USAGE that the built-in PUBLIC pseudo-role grants on `public` by
-- default — that lives on PUBLIC, not on li2_ai_agent, and we are deliberately NOT touching the
-- global PUBLIC grant (that would affect every role). The real isolation is that li2_ai_agent is
-- NEVER granted table privileges on public.* — so reads fail at the TABLE level regardless of
-- schema USAGE. Verified by the isolation check below.
REVOKE ALL ON SCHEMA public FROM li2_ai_agent;

ALTER ROLE li2_ai_agent SET search_path = agent;

-- =============================================================================
-- 7. ISOLATION CHECK (Kei, run manually after apply — must behave exactly as noted)
-- =============================================================================
--   SET ROLE li2_ai_agent;
--   SELECT * FROM agent.agent_sessions LIMIT 1;   -- MUST SUCCEED (empty result is fine)
--   SELECT * FROM public.organizations LIMIT 1;   -- MUST FAIL: "permission denied for table
--                                                 --   organizations" (table-level — role has no
--                                                 --   grant). The point is it FAILS; the exact
--                                                 --   wording (table vs schema) doesn't matter.
--   RESET ROLE;
-- If you want the failure to read "permission denied for schema public" instead, you'd have to
-- REVOKE USAGE ON SCHEMA public FROM PUBLIC globally — do NOT do that here (affects all roles).
