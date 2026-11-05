-- RPC to get distinct event names from pageviews (developer-defined events via trackEvent())
-- Used by the funnel builder autocomplete to suggest event names
CREATE OR REPLACE FUNCTION get_distinct_event_names(_org_id UUID)
RETURNS TABLE(event_name TEXT) AS $$
  SELECT DISTINCT event_name::text
  FROM pageviews
  WHERE organization_id = _org_id
    AND event_name IS NOT NULL
    AND event_name != ''
    AND created_at >= now() - interval '30 days'
  ORDER BY event_name
  LIMIT 100;
$$ LANGUAGE sql STABLE;
