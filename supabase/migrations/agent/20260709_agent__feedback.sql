-- Task 1b.3 — Feedback capture (👍/👎 eval signal, §17/D14).
-- Written ONLY by li2-ai's scoped role (li2_ai_agent already has SELECT/INSERT/UPDATE/DELETE
-- on `agent` via ALTER DEFAULT PRIVILEGES from the phase-0 migration — no new GRANT here).
-- org_id/user_id are NOT FK'd to public.* — the `agent` schema must not depend on `public` (D6).
-- turn_id is the response-correlation id = agent_traces.turn_id (NOT FK: agent_traces.turn_id
-- is not unique — one turn has many spans). One current vote per (turn_id, user_id): UPSERT,
-- not append-only (Decision #7) — a user flipping 👍→👎 updates the same row.
CREATE TABLE agent.agent_feedback (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid NOT NULL REFERENCES agent.agent_sessions(id) ON DELETE CASCADE,
  turn_id     uuid NOT NULL,
  org_id      uuid NOT NULL,                              -- denormalized (traces have no org_id)
  user_id     uuid NOT NULL,
  rating      smallint NOT NULL CHECK (rating IN (-1, 1)),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_agent_feedback_turn_user ON agent.agent_feedback (turn_id, user_id);
CREATE INDEX idx_agent_feedback_session ON agent.agent_feedback (session_id, created_at DESC);

-- Decision #1 — correlate feedback to the graded ANSWER, not just the trace spans.
-- end_turn already receives turn_id as a param; only the column + 2 INSERT lines were missing.
ALTER TABLE agent.agent_messages ADD COLUMN turn_id uuid;
CREATE INDEX idx_agent_messages_turn ON agent.agent_messages (turn_id);

-- Feedback rate-limit knobs (Decision #3/#3a). Cheap write → generous bucket, a floodgate
-- against scripted abuse, not a UX throttle. Mirrors agent_config.py code defaults.
INSERT INTO agent.agent_config (key, value, description) VALUES
  ('feedback_burst',          '30', 'Per-user feedback rate-limit burst (clicks per window).'),
  ('feedback_refill_per_min', '30', 'Per-user feedback rate-limit refill (clicks/min → ~2s window).')
ON CONFLICT (key) DO NOTHING;
