-- Link Journey: Touch points with behavioral data (for link selector)
CREATE OR REPLACE FUNCTION get_link_journey_touch_points(
    _org_id uuid
)
RETURNS json AS $$
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
    FROM (
        SELECT DISTINCT
            tp.id,
            tp.name,
            tp.short_url,
            tp.content_value as destination_url,
            COUNT(pv.id) as pageview_count
        FROM touch_points tp
        INNER JOIN pageviews pv ON pv.tp_id = tp.id
        WHERE tp.organization_id = _org_id
          AND tp.deleted_at IS NULL
        GROUP BY tp.id, tp.name, tp.short_url, tp.content_value
        ORDER BY pageview_count DESC
    ) t;
$$ LANGUAGE sql STABLE;
