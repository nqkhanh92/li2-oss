-- Fix heatmap RPC functions to filter by interaction_type (click + rage_click)
-- Excludes scroll events which now share the same interactions table

-- 1. Fix get_heatmap_clicks to include both regular clicks and rage clicks
CREATE OR REPLACE FUNCTION get_heatmap_clicks(
  _org_id uuid,
  _page_path text,
  _from timestamptz,
  _to timestamptz,
  _device_type text DEFAULT NULL,
  _grid_size int DEFAULT 10,
  _hostname text DEFAULT NULL,
  _target_width int DEFAULT 1440,
  _tp_id uuid DEFAULT NULL
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
          (floor((x::numeric * _target_width / viewport_width) / _grid_size) * _grid_size)::int AS x,
          (floor(y::numeric / _grid_size) * _grid_size)::int AS y,
          count(*) AS count
        FROM interactions
        WHERE organization_id = _org_id
          AND page_path = _page_path
          AND interaction_type IN ('click', 'rage_click')
          AND timestamp >= _from AND timestamp < _to + interval '1 day'
          AND (_device_type IS NULL OR device_type = _device_type)
          AND (_hostname IS NULL OR page_url LIKE 'https://' || _hostname || '/%' OR page_url LIKE 'http://' || _hostname || '/%')
          AND is_bot = false
          AND viewport_width > 0
          AND (_tp_id IS NULL OR session_id IN (
              SELECT DISTINCT session_id FROM pageviews
              WHERE tp_id = _tp_id AND organization_id = _org_id
          ))
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
          count(*) AS count,
          (array_agg(element_id) FILTER (WHERE element_id IS NOT NULL))[1] AS element_id,
          (array_agg(element_href) FILTER (WHERE element_href IS NOT NULL))[1] AS element_href
        FROM interactions
        WHERE organization_id = _org_id
          AND page_path = _page_path
          AND interaction_type IN ('click', 'rage_click')
          AND timestamp >= _from AND timestamp < _to + interval '1 day'
          AND (_device_type IS NULL OR device_type = _device_type)
          AND (_hostname IS NULL OR page_url LIKE 'https://' || _hostname || '/%' OR page_url LIKE 'http://' || _hostname || '/%')
          AND is_bot = false
          AND selector_path IS NOT NULL
          AND (_tp_id IS NULL OR session_id IN (
              SELECT DISTINCT session_id FROM pageviews
              WHERE tp_id = _tp_id AND organization_id = _org_id
          ))
        GROUP BY selector_path, element_text, element_tag
        ORDER BY count DESC
        LIMIT 50
      ) e
    )
  ) INTO result
  FROM interactions
  WHERE organization_id = _org_id
    AND page_path = _page_path
    AND interaction_type IN ('click', 'rage_click')
    AND timestamp >= _from AND timestamp < _to + interval '1 day'
    AND (_device_type IS NULL OR device_type = _device_type)
    AND (_hostname IS NULL OR page_url LIKE 'https://' || _hostname || '/%' OR page_url LIKE 'http://' || _hostname || '/%')
    AND is_bot = false
    AND (_tp_id IS NULL OR session_id IN (
        SELECT DISTINCT session_id FROM pageviews
        WHERE tp_id = _tp_id AND organization_id = _org_id
    ));

  RETURN coalesce(result, '{"total_clicks":0,"unique_visitors":0,"grid":[],"elements":[]}'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. Fix get_top_interaction_pages to include both regular clicks and rage clicks
CREATE OR REPLACE FUNCTION get_top_interaction_pages(
  _org_id uuid,
  _from timestamptz,
  _to timestamptz,
  _limit int DEFAULT 50,
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
         AND interaction_type IN ('click', 'rage_click')
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
