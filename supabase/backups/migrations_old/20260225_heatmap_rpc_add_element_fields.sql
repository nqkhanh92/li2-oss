-- Add element_id and element_href to heatmap RPC element aggregation
-- These fields are needed for the "Create Event Rule" action on the heatmap element list

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
          count(*) AS count,
          (array_agg(element_id) FILTER (WHERE element_id IS NOT NULL))[1] AS element_id,
          (array_agg(element_href) FILTER (WHERE element_href IS NOT NULL))[1] AS element_href
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
