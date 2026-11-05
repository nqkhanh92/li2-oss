-- Phase 8: Visitor Detail View
-- Pre-computed per-session funnel walk results, populated by li2-worker during daily computation.
-- Enables drill-down into individual visitors at each funnel step.

CREATE TABLE session_funnel_results (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funnel_id         UUID NOT NULL REFERENCES funnels(id) ON DELETE CASCADE,
    organization_id   UUID NOT NULL,
    session_id        VARCHAR(64) NOT NULL,
    visitor_id        VARCHAR(64) NOT NULL,

    -- Funnel walk result
    reached_step      SMALLINT NOT NULL,      -- highest step position matched (1-based, 0 = didn't enter)
    total_steps       SMALLINT NOT NULL,      -- total steps in funnel at computation time
    dropped_off       BOOLEAN NOT NULL,       -- true if didn't complete all steps
    completed         BOOLEAN NOT NULL,       -- true if reached final step

    -- Period (matches funnel_results)
    period_start      DATE NOT NULL,
    period_end        DATE NOT NULL,

    -- Metadata
    computed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(funnel_id, session_id, period_start)
);

-- Query: visitors at step N who proceeded/dropped off
CREATE INDEX idx_sfr_step_filter ON session_funnel_results
    (funnel_id, period_start, period_end, reached_step, dropped_off);

-- Query: by organization for access control
CREATE INDEX idx_sfr_org ON session_funnel_results (organization_id, funnel_id);

-- RPC: Get visitors at a funnel step with session metadata
CREATE OR REPLACE FUNCTION get_step_visitors(
    _org_id UUID,
    _funnel_id UUID,
    _step_position SMALLINT,
    _period_start DATE,
    _period_end DATE,
    _filter TEXT DEFAULT 'all',     -- 'all' | 'proceeded' | 'dropped_off'
    _page INT DEFAULT 1,
    _limit INT DEFAULT 50
)
RETURNS TABLE (
    session_id VARCHAR(64),
    visitor_id VARCHAR(64),
    reached_step SMALLINT,
    total_steps SMALLINT,
    dropped_off BOOLEAN,
    completed BOOLEAN,
    browser VARCHAR(64),
    os VARCHAR(64),
    device_type VARCHAR(16),
    country VARCHAR(2),
    city VARCHAR(128),
    referrer_domain VARCHAR(256),
    started_at TIMESTAMPTZ,
    total_count BIGINT
)
LANGUAGE plpgsql STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        sfr.session_id,
        sfr.visitor_id,
        sfr.reached_step,
        sfr.total_steps,
        sfr.dropped_off,
        sfr.completed,
        s.browser,
        s.os,
        s.device_type,
        s.country,
        s.city,
        s.referrer_domain,
        s.started_at,
        COUNT(*) OVER() AS total_count
    FROM session_funnel_results sfr
    JOIN sessions s ON sfr.session_id = s.session_id
    WHERE sfr.organization_id = _org_id
      AND sfr.funnel_id = _funnel_id
      AND sfr.reached_step >= _step_position
      AND sfr.period_start >= _period_start
      AND sfr.period_end <= _period_end
      AND (
          _filter = 'all'
          OR (_filter = 'proceeded' AND sfr.reached_step > _step_position)
          OR (_filter = 'dropped_off' AND sfr.reached_step = _step_position)
      )
    ORDER BY s.started_at DESC
    LIMIT _limit
    OFFSET (_page - 1) * _limit;
END;
$$;
