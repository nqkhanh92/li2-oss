-- Dynamic operational knobs for the agent service.
-- Lives in the `agent` schema — the li2_ai_agent scoped role already has
-- SELECT/INSERT/UPDATE/DELETE via ALTER DEFAULT PRIVILEGES (phase0 migration).
-- No new GRANT needed.

CREATE TABLE IF NOT EXISTS agent.agent_config (
  key         text PRIMARY KEY,
  value       jsonb NOT NULL,
  description text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Seed the Phase-1a owned knobs. Values are JSON scalars so the typed loader
-- in li2-ai can validate per-key. Code defaults in agent_config.py mirror these.
-- call_timeout_s is a placeholder — confirmed against claude-api latency in task-1a.1.
INSERT INTO agent.agent_config (key, value, description) VALUES
  ('global_daily_cents',       '10000', 'Global daily circuit breaker ceiling, cents ($100/day).'),
  ('global_pause',             'false', 'Manual kill-switch. true halts ALL agent traffic. Read UNCACHED.'),
  ('velocity_burst',           '10',    'Per-org token-bucket burst capacity (turns).'),
  ('velocity_refill_per_min',  '7.5',   'Per-org token-bucket refill rate (turns/min).'),
  ('call_timeout_s',           '60',    'Per-call wall-clock timeout, seconds. TODO confirm vs claude-api latency in 1a.1.'),
  ('config_cache_ttl_s',       '60',    'How fast cached agent_config edits go live.'),
  ('verbatim_turns',           '6',     'Last-K turns kept verbatim in the context window.')
ON CONFLICT (key) DO NOTHING;
