-- Add _target_height parameter to get_heatmap_clicks.
-- When provided and page_height > 0, normalizes y using the same proportional
-- mapping as x: y * _target_height / page_height → target coordinate space.
CREATE OR REPLACE FUNCTION public.get_heatmap_clicks_v2(
  _org_id uuid,
  _page_path text,
  _from timestamp with time zone,
  _to timestamp with time zone,
  _device_type text DEFAULT NULL::text,
  _grid_size integer DEFAULT 10,
  _hostname text DEFAULT NULL::text,
  _target_width integer DEFAULT 1440,
  _tp_id uuid DEFAULT NULL::uuid,
  _target_height integer DEFAULT NULL::integer
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $function$
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
          (floor(
            CASE WHEN _target_height IS NOT NULL AND page_height > 0
              THEN y::numeric * _target_height / page_height
              ELSE y::numeric
            END / _grid_size
          ) * _grid_size)::int AS y,
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
$function$;
