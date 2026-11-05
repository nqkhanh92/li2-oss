-- Increase default page limit from 50 to 200 for tree selector
-- IMPORTANT: CREATE OR REPLACE must preserve ALL existing parameters exactly
CREATE OR REPLACE FUNCTION get_top_interaction_pages(
  _org_id uuid,
  _from timestamptz,
  _to timestamptz,
  _limit int DEFAULT 200,
  _tp_id uuid DEFAULT NULL
)
RETURNS jsonb AS $$
BEGIN
  RETURN coalesce(
    (SELECT jsonb_agg(row_to_json(p))
     FROM (
       SELECT
         regexp_replace(page_url, '^(https?)://.*', '\1') AS scheme,
         regexp_replace(page_url, '^https?://([^/]+).*', '\1') AS hostname,
         page_path,
         count(*) AS click_count
       FROM interactions
       WHERE organization_id = _org_id
         AND timestamp >= _from AND timestamp < _to + interval '1 day'
         AND is_bot = false
         AND page_url IS NOT NULL
         AND (_tp_id IS NULL OR session_id IN (
             SELECT DISTINCT session_id FROM pageviews
             WHERE tp_id = _tp_id AND organization_id = _org_id
         ))
       GROUP BY scheme, hostname, page_path
       ORDER BY click_count DESC
       LIMIT _limit
     ) p),
    '[]'::jsonb
  );
END;
$$ LANGUAGE plpgsql STABLE;
