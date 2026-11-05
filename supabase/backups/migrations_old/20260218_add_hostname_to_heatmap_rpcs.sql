-- Add hostname support to heatmap RPC functions
-- Fixes:
--   1. Page dropdown shows ambiguous paths → now returns (hostname, page_path, click_count)
--   2. iframe resolves to wrong domain → hostname from actual interaction data
--   3. Date range excludes current day → use >= / < instead of BETWEEN

-- 1. Update get_top_interaction_pages to return hostname alongside page_path
CREATE OR REPLACE FUNCTION get_top_interaction_pages(
  _org_id uuid,
  _from timestamptz,
  _to timestamptz,
  _limit int DEFAULT 50
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
       GROUP BY scheme, hostname, page_path
       ORDER BY click_count DESC
       LIMIT _limit
     ) p),
    '[]'::jsonb
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. Update get_heatmap_clicks to accept optional hostname filter
CREATE OR REPLACE FUNCTION get_heatmap_clicks(
  _org_id uuid,
  _page_path text,
  _from timestamptz,
  _to timestamptz,
  _device_type text DEFAULT NULL,
  _grid_size int DEFAULT 10,
  _hostname text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_clicks', count(*),
    'unique_visitors', count(DISTINCT visitor_id),
    'grid', (
      SELECT coalesce(jsonb_agg(row_to_json(g)), '[]'::jsonb)
      FROM (
        SELECT
          (floor(x::numeric / _grid_size) * _grid_size)::int AS x,
          (floor(y::numeric / _grid_size) * _grid_size)::int AS y,
          count(*) AS count
        FROM interactions
        WHERE organization_id = _org_id
          AND page_path = _page_path
          AND timestamp >= _from AND timestamp < _to + interval '1 day'
          AND (_device_type IS NULL OR device_type = _device_type)
          AND (_hostname IS NULL OR page_url LIKE 'https://' || _hostname || '/%' OR page_url LIKE 'http://' || _hostname || '/%')
          AND is_bot = false
        GROUP BY 1, 2
        ORDER BY count DESC
        LIMIT 10000
      ) g
    ),
    'elements', (
      SELECT coalesce(jsonb_agg(row_to_json(e)), '[]'::jsonb)
      FROM (
        SELECT
          selector_path AS selector,
          element_text AS text,
          element_tag AS tag,
          count(*) AS count
        FROM interactions
        WHERE organization_id = _org_id
          AND page_path = _page_path
          AND timestamp >= _from AND timestamp < _to + interval '1 day'
          AND (_device_type IS NULL OR device_type = _device_type)
          AND (_hostname IS NULL OR page_url LIKE 'https://' || _hostname || '/%' OR page_url LIKE 'http://' || _hostname || '/%')
          AND is_bot = false
          AND selector_path IS NOT NULL
        GROUP BY selector_path, element_text, element_tag
        ORDER BY count DESC
        LIMIT 50
      ) e
    )
  ) INTO result
  FROM interactions
  WHERE organization_id = _org_id
    AND page_path = _page_path
    AND timestamp >= _from AND timestamp < _to + interval '1 day'
    AND (_device_type IS NULL OR device_type = _device_type)
    AND (_hostname IS NULL OR page_url LIKE 'https://' || _hostname || '/%' OR page_url LIKE 'http://' || _hostname || '/%')
    AND is_bot = false;

  RETURN coalesce(result, '{"total_clicks":0,"unique_visitors":0,"grid":[],"elements":[]}'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;
