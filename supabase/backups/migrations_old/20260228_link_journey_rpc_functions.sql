-- Link Journey RPC Functions
-- Powers the Link Journey page: traffic summary, page flow, behavioral highlights, conversions

-- 1. Traffic Summary (Section A)
-- Returns: total_clicks, unique_visitors, total_sessions, bounce_rate
CREATE OR REPLACE FUNCTION get_link_journey_traffic_summary(
    _org_id uuid,
    _tp_id uuid,
    _start_date timestamptz,
    _end_date timestamptz
)
RETURNS json AS $$
    SELECT json_build_object(
        'total_clicks', (
            SELECT COUNT(*) FROM visits
            WHERE tp_id = _tp_id
              AND organization_id = _org_id
              AND created_at BETWEEN _start_date AND _end_date
        ),
        'unique_visitors', (
            SELECT COUNT(DISTINCT visitor_id) FROM pageviews
            WHERE tp_id = _tp_id
              AND organization_id = _org_id
              AND created_at BETWEEN _start_date AND _end_date
        ),
        'total_sessions', (
            SELECT COUNT(DISTINCT session_id) FROM pageviews
            WHERE tp_id = _tp_id
              AND organization_id = _org_id
              AND created_at BETWEEN _start_date AND _end_date
        ),
        'bounce_rate', (
            SELECT COALESCE(
                ROUND(
                    COUNT(*) FILTER (WHERE page_count = 1)::numeric /
                    NULLIF(COUNT(*), 0) * 100, 1
                ), 0
            )
            FROM (
                SELECT session_id, COUNT(*) as page_count
                FROM pageviews
                WHERE tp_id = _tp_id
                  AND organization_id = _org_id
                  AND created_at BETWEEN _start_date AND _end_date
                GROUP BY session_id
            ) session_pages
        )
    );
$$ LANGUAGE sql STABLE;

-- 2. Page Flow (Section B)
-- Returns: array of {page_path, page_title, pageviews, sessions, visitors}
CREATE OR REPLACE FUNCTION get_link_journey_page_flow(
    _org_id uuid,
    _tp_id uuid,
    _start_date timestamptz,
    _end_date timestamptz,
    _limit int DEFAULT 10
)
RETURNS json AS $$
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
    FROM (
        SELECT
            page_path,
            page_title,
            COUNT(*) as pageviews,
            COUNT(DISTINCT session_id) as sessions,
            COUNT(DISTINCT visitor_id) as visitors
        FROM pageviews
        WHERE tp_id = _tp_id
          AND organization_id = _org_id
          AND created_at BETWEEN _start_date AND _end_date
        GROUP BY page_path, page_title
        ORDER BY pageviews DESC
        LIMIT _limit
    ) t;
$$ LANGUAGE sql STABLE;

-- 3. Behavioral Highlights (Section C)
-- Returns: total_interactions, rage_clicks, top_clicked_elements
-- Note: rage clicks use interaction_type = 'rage_click' (no is_rage_click column)
CREATE OR REPLACE FUNCTION get_link_journey_behavioral(
    _org_id uuid,
    _tp_id uuid,
    _start_date timestamptz,
    _end_date timestamptz
)
RETURNS json AS $$
    WITH link_sessions AS (
        SELECT DISTINCT session_id
        FROM pageviews
        WHERE tp_id = _tp_id
          AND organization_id = _org_id
          AND created_at BETWEEN _start_date AND _end_date
    )
    SELECT json_build_object(
        'total_interactions', (
            SELECT COUNT(*) FROM interactions i
            INNER JOIN link_sessions ls ON i.session_id = ls.session_id
            WHERE i.organization_id = _org_id
              AND i.created_at BETWEEN _start_date AND _end_date
        ),
        'rage_clicks', (
            SELECT COUNT(*) FROM interactions i
            INNER JOIN link_sessions ls ON i.session_id = ls.session_id
            WHERE i.organization_id = _org_id
              AND i.interaction_type = 'rage_click'
              AND i.created_at BETWEEN _start_date AND _end_date
        ),
        'top_clicked_elements', (
            SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
            FROM (
                SELECT
                    selector_path,
                    element_text,
                    element_tag,
                    COUNT(*) as click_count
                FROM interactions i
                INNER JOIN link_sessions ls ON i.session_id = ls.session_id
                WHERE i.organization_id = _org_id
                  AND i.interaction_type = 'click'
                  AND i.created_at BETWEEN _start_date AND _end_date
                GROUP BY selector_path, element_text, element_tag
                ORDER BY click_count DESC
                LIMIT 5
            ) t
        )
    );
$$ LANGUAGE sql STABLE;

-- 4. Conversions (Section D)
-- Returns: total_leads, total_sales, total_revenue, recent_conversions
-- Uses World 1 data: conversion_events.touch_point_id (not tp_id)
CREATE OR REPLACE FUNCTION get_link_journey_conversions(
    _org_id uuid,
    _tp_id uuid,
    _start_date timestamptz,
    _end_date timestamptz
)
RETURNS json AS $$
    SELECT json_build_object(
        'total_leads', (
            SELECT COUNT(*) FROM conversion_events
            WHERE touch_point_id = _tp_id
              AND organization_id = _org_id
              AND event_type = 'lead'
              AND created_at BETWEEN _start_date AND _end_date
        ),
        'total_sales', (
            SELECT COUNT(*) FROM conversion_events
            WHERE touch_point_id = _tp_id
              AND organization_id = _org_id
              AND event_type = 'sale'
              AND created_at BETWEEN _start_date AND _end_date
        ),
        'total_revenue', (
            SELECT COALESCE(SUM(amount), 0) FROM conversion_events
            WHERE touch_point_id = _tp_id
              AND organization_id = _org_id
              AND event_type = 'sale'
              AND created_at BETWEEN _start_date AND _end_date
        ),
        'recent_conversions', (
            SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
            FROM (
                SELECT
                    ce.id,
                    ce.event_type,
                    ce.event_name,
                    ce.amount,
                    ce.currency,
                    ce.created_at,
                    cp.name as customer_name,
                    cp.email as customer_email
                FROM conversion_events ce
                LEFT JOIN customer_profiles cp ON ce.customer_profile_id = cp.id
                WHERE ce.touch_point_id = _tp_id
                  AND ce.organization_id = _org_id
                  AND ce.created_at BETWEEN _start_date AND _end_date
                ORDER BY ce.created_at DESC
                LIMIT 5
            ) t
        )
    );
$$ LANGUAGE sql STABLE;
