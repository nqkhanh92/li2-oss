-- Replace get_top_interaction_pages to return total_count + per-type breakdown
-- Used by both heatmap page tree (click_count alias) and site analytics

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
         scheme,
         hostname,
         page_path,
         sum(type_count) AS total_count,
         -- kept for heatmap backward compat (PageTreeSidebar sorts by click_count)
         sum(type_count) AS click_count,
         jsonb_agg(
           jsonb_build_object('type', interaction_type, 'count', type_count)
           ORDER BY type_count DESC
         ) AS by_type
       FROM (
         SELECT
           regexp_replace(page_url, '^(https?)://.*', '\1')        AS scheme,
           regexp_replace(page_url, '^https?://([^/]+).*', '\1')   AS hostname,
           page_path,
           interaction_type,
           count(*) AS type_count
         FROM interactions
         WHERE organization_id = _org_id
           AND timestamp >= _from AND timestamp < _to + interval '1 day'
           AND is_bot = false
           AND page_url IS NOT NULL
           AND (_tp_id IS NULL OR session_id IN (
               SELECT DISTINCT session_id FROM pageviews
               WHERE tp_id = _tp_id AND organization_id = _org_id
           ))
         GROUP BY 1, 2, page_path, interaction_type
       ) typed
       GROUP BY scheme, hostname, page_path
       ORDER BY total_count DESC
       LIMIT _limit
     ) p),
    '[]'::jsonb
  );
END;
$$ LANGUAGE plpgsql STABLE;
