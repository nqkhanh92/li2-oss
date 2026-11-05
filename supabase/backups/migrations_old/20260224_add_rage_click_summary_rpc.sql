-- Rage click summary: aggregates pre-labeled rage clicks by element
-- Cheap query — worker already did the detection, this just filters + groups

CREATE OR REPLACE FUNCTION get_rage_click_summary(
  _org_id uuid,
  _page_path text,
  _from timestamptz,
  _to timestamptz,
  _device_type text DEFAULT NULL,
  _hostname text DEFAULT NULL,
  _limit int DEFAULT 20
)
RETURNS jsonb AS $$
BEGIN
  RETURN coalesce(
    (SELECT jsonb_agg(row_to_json(r))
     FROM (
       SELECT
         selector_path AS selector,
         element_text AS text,
         element_tag AS tag,
         element_href AS href,
         count(*) AS rage_click_count,
         count(DISTINCT session_id) AS affected_sessions,
         max(timestamp) AS last_seen
       FROM interactions
       WHERE organization_id = _org_id
         AND page_path = _page_path
         AND timestamp >= _from AND timestamp < _to + interval '1 day'
         AND interaction_type = 'rage_click'
         AND is_bot = false
         AND (_device_type IS NULL OR device_type = _device_type)
         AND (_hostname IS NULL
              OR page_url LIKE 'https://' || _hostname || '/%'
              OR page_url LIKE 'http://' || _hostname || '/%')
         AND selector_path IS NOT NULL
       GROUP BY selector_path, element_text, element_tag, element_href
       ORDER BY rage_click_count DESC
       LIMIT _limit
     ) r),
    '[]'::jsonb
  );
END;
$$ LANGUAGE plpgsql STABLE;
