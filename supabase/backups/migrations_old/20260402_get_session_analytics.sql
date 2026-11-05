-- Session analytics breakdowns for site analytics tab
-- Returns multiple breakdowns (by date, device, browser, OS, country, referrer, UTM)
-- Joins pageviews to filter sessions by hostname/page_path

CREATE OR REPLACE FUNCTION get_session_analytics(
  _org_id    uuid,
  _from      date,
  _to        date,
  _hostname  text DEFAULT NULL,
  _page_path text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  _result jsonb;
BEGIN
  WITH filtered_sessions AS (
    SELECT DISTINCT ON (s.session_id)
      s.session_id,
      s.visitor_id,
      s.device_type,
      s.browser,
      s.os,
      s.country,
      s.referrer_domain,
      s.utm_source,
      s.started_at
    FROM sessions s
    INNER JOIN pageviews pv
      ON  pv.session_id      = s.session_id
      AND pv.organization_id = s.organization_id
      AND pv.timestamp       >= _from::timestamptz
      AND pv.timestamp       <  _to::timestamptz + interval '1 day'
    WHERE s.organization_id = _org_id
      AND s.started_at::date BETWEEN _from AND _to
      AND s.is_bot  = false
      AND pv.is_bot = false
      AND (
        _hostname IS NULL
        OR regexp_replace(pv.page_url, '^https?://([^/]+).*', '\1') = _hostname
      )
      AND (
        _page_path IS NULL
        OR pv.page_path = _page_path
      )
  ),
  by_date AS (
    SELECT
      started_at::date                    AS date,
      count(*)::int                       AS sessions,
      count(DISTINCT visitor_id)::int     AS visitors
    FROM filtered_sessions
    GROUP BY 1
    ORDER BY 1
  ),
  by_device AS (
    SELECT COALESCE(device_type, 'Unknown') AS device_type, count(*)::int AS count
    FROM filtered_sessions
    GROUP BY 1
    ORDER BY 2 DESC
    LIMIT 10
  ),
  by_browser AS (
    SELECT COALESCE(browser, 'Unknown') AS browser, count(*)::int AS count
    FROM filtered_sessions
    GROUP BY 1
    ORDER BY 2 DESC
    LIMIT 10
  ),
  by_os AS (
    SELECT COALESCE(os, 'Unknown') AS os, count(*)::int AS count
    FROM filtered_sessions
    GROUP BY 1
    ORDER BY 2 DESC
    LIMIT 10
  ),
  by_country AS (
    SELECT COALESCE(NULLIF(country, ''), 'Unknown') AS country, count(*)::int AS count
    FROM filtered_sessions
    GROUP BY 1
    ORDER BY 2 DESC
    LIMIT 20
  ),
  by_referrer AS (
    SELECT COALESCE(NULLIF(referrer_domain, ''), 'Direct') AS referrer_domain, count(*)::int AS count
    FROM filtered_sessions
    GROUP BY 1
    ORDER BY 2 DESC
    LIMIT 20
  ),
  by_utm_source AS (
    SELECT utm_source, count(*)::int AS count
    FROM filtered_sessions
    WHERE utm_source IS NOT NULL AND utm_source <> ''
    GROUP BY 1
    ORDER BY 2 DESC
    LIMIT 20
  )
  SELECT jsonb_build_object(
    'by_date',        COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM by_date       t), '[]'::jsonb),
    'by_device',      COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM by_device     t), '[]'::jsonb),
    'by_browser',     COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM by_browser    t), '[]'::jsonb),
    'by_os',          COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM by_os         t), '[]'::jsonb),
    'by_country',     COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM by_country    t), '[]'::jsonb),
    'by_referrer',    COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM by_referrer   t), '[]'::jsonb),
    'by_utm_source',  COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM by_utm_source t), '[]'::jsonb)
  ) INTO _result;

  RETURN _result;
END;
$$;
