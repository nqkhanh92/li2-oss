-- Get per-page session stats for site analytics
-- Joins pageviews → sessions to associate sessions with specific pages visited

CREATE OR REPLACE FUNCTION get_site_page_sessions(
  _org_id uuid,
  _from timestamptz,
  _to timestamptz,
  _limit int DEFAULT 500
)
RETURNS jsonb AS $$
BEGIN
  RETURN coalesce(
    (SELECT jsonb_agg(row_to_json(p))
     FROM (
       SELECT
         scheme,
         hostname,
         page_path,
         count(DISTINCT session_id)  AS total_sessions,
         count(DISTINCT visitor_id)  AS unique_visitors,
         round(
           count(DISTINCT session_id) FILTER (WHERE is_bounce = true)::numeric
           / nullif(count(DISTINCT session_id), 0) * 100,
           1
         )                           AS bounce_rate,
         round(
           avg(duration_ms) FILTER (WHERE duration_ms > 0) / 1000.0,
           1
         )                           AS avg_duration_sec
       FROM (
         SELECT
           regexp_replace(pv.page_url, '^(https?)://.*', '\1')      AS scheme,
           regexp_replace(pv.page_url, '^https?://([^/]+).*', '\1') AS hostname,
           pv.page_path,
           s.id          AS session_id,
           s.visitor_id,
           s.is_bounce,
           s.duration_ms
         FROM pageviews pv
         JOIN sessions s
           ON s.session_id = pv.session_id
          AND s.organization_id = pv.organization_id
         WHERE pv.organization_id = _org_id
           AND pv.timestamp >= _from AND pv.timestamp < _to + interval '1 day'
           AND pv.is_bot  = false
           AND s.is_bot   = false
           AND pv.page_url IS NOT NULL
       ) raw
       GROUP BY scheme, hostname, page_path
       ORDER BY total_sessions DESC
       LIMIT _limit
     ) p),
    '[]'::jsonb
  );
END;
$$ LANGUAGE plpgsql STABLE;
