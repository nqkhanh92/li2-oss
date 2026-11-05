-- ============================================================
-- Widget Data RPC: pageviews — add UTM group_by support
-- Phase 2b: Custom Query Builder
--
-- UTM data on pageviews is stored as top-level columns
-- (utm_source, utm_medium, utm_campaign). %I quoting works.
-- UTM filters already supported — only adding group_by.
--
-- CRITICAL: Full CREATE OR REPLACE — preserves all existing params.
-- ============================================================

CREATE OR REPLACE FUNCTION get_widget_data_pageviews(
  _organization_id UUID,
  _metric TEXT,
  _group_by TEXT,
  _filters JSONB DEFAULT '[]'::jsonb,
  _date_from TIMESTAMPTZ DEFAULT now() - interval '7 days',
  _date_to TIMESTAMPTZ DEFAULT now(),
  _limit INTEGER DEFAULT 50,
  _exclude_bot BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  _result JSONB;
  _metric_expr TEXT;
  _group_expr TEXT;
  _group_select TEXT;
  _filter_clause TEXT := '';
  _bot_clause TEXT := '';
  _f JSONB;
  _field TEXT;
  _op TEXT;
  _val TEXT;
BEGIN
  -- Bot filter
  IF _exclude_bot THEN
    _bot_clause := ' AND (is_bot = false)';
  END IF;

  -- Allowlist: metric
  CASE _metric
    WHEN 'count' THEN _metric_expr := 'COUNT(*)';
    WHEN 'unique_visitors' THEN _metric_expr := 'COUNT(DISTINCT visitor_id)';
    WHEN 'sessions' THEN _metric_expr := 'COUNT(DISTINCT session_id)';
    ELSE RAISE EXCEPTION 'Invalid metric: %', _metric;
  END CASE;

  -- Allowlist: group_by
  CASE _group_by
    WHEN 'day' THEN
      _group_select := 'timestamp::date::text';
      _group_expr := 'timestamp::date';
    WHEN 'week' THEN
      _group_select := 'date_trunc(''week'', timestamp)::date::text';
      _group_expr := 'date_trunc(''week'', timestamp)';
    WHEN 'month' THEN
      _group_select := 'date_trunc(''month'', timestamp)::date::text';
      _group_expr := 'date_trunc(''month'', timestamp)';
    WHEN 'page_path' THEN
      _group_select := 'COALESCE(page_path, ''/'')';
      _group_expr := 'COALESCE(page_path, ''/'')';
    WHEN 'referrer' THEN
      _group_select := 'COALESCE(regexp_replace(page_referrer, ''^https?://([^/]+).*'', ''\1''), ''Direct'')';
      _group_expr := 'COALESCE(regexp_replace(page_referrer, ''^https?://([^/]+).*'', ''\1''), ''Direct'')';
    WHEN 'country' THEN
      _group_select := 'COALESCE(country, ''Unknown'')';
      _group_expr := 'COALESCE(country, ''Unknown'')';
    WHEN 'device' THEN
      _group_select := 'COALESCE(device_type, ''Unknown'')';
      _group_expr := 'COALESCE(device_type, ''Unknown'')';
    WHEN 'utm_source' THEN
      _group_select := 'COALESCE(utm_source, ''(none)'')';
      _group_expr := 'COALESCE(utm_source, ''(none)'')';
    WHEN 'utm_medium' THEN
      _group_select := 'COALESCE(utm_medium, ''(none)'')';
      _group_expr := 'COALESCE(utm_medium, ''(none)'')';
    WHEN 'utm_campaign' THEN
      _group_select := 'COALESCE(utm_campaign, ''(none)'')';
      _group_expr := 'COALESCE(utm_campaign, ''(none)'')';
    WHEN 'none' THEN
      _group_select := NULL;
      _group_expr := NULL;
    ELSE RAISE EXCEPTION 'Invalid group_by: %', _group_by;
  END CASE;

  -- Build filter clause from JSONB array
  IF _filters IS NOT NULL AND jsonb_array_length(_filters) > 0 THEN
    FOR _f IN SELECT * FROM jsonb_array_elements(_filters) LOOP
      _field := _f->>'field';
      _op := _f->>'op';
      _val := _f->>'value';

      -- Normalize aliases to actual column names
      IF _field = 'device' THEN _field := 'device_type'; END IF;
      IF _field = 'referrer' THEN _field := 'page_referrer'; END IF;

      -- Allowlist: filter fields (actual DB column names)
      IF _field NOT IN ('page_path', 'page_referrer', 'country', 'device_type', 'utm_source', 'utm_medium', 'utm_campaign') THEN
        RAISE EXCEPTION 'Invalid filter field: %', _field;
      END IF;
      IF _op NOT IN ('=', '!=', 'contains') THEN
        RAISE EXCEPTION 'Invalid filter operator: %', _op;
      END IF;

      IF _op = '=' THEN
        _filter_clause := _filter_clause || format(' AND %I = %L', _field, _val);
      ELSIF _op = '!=' THEN
        _filter_clause := _filter_clause || format(' AND %I != %L', _field, _val);
      ELSIF _op = 'contains' THEN
        _filter_clause := _filter_clause || format(' AND %I ILIKE %L', _field, '%' || _val || '%');
      END IF;
    END LOOP;
  END IF;

  -- Execute query
  IF _group_expr IS NULL THEN
    -- KPI mode: single aggregate value
    EXECUTE format(
      'SELECT jsonb_build_object(
         ''total'', COALESCE(%s, 0),
         ''rows'', ''[]''::jsonb
       )
       FROM pageviews
       WHERE organization_id = $1
         AND timestamp >= $2 AND timestamp < $3
         %s %s',
      _metric_expr, _bot_clause, _filter_clause
    ) INTO _result USING _organization_id, _date_from, _date_to;
  ELSE
    -- Grouped mode: rows with label + value
    EXECUTE format(
      'WITH total_q AS (
         SELECT COALESCE(%s, 0) AS total
         FROM pageviews
         WHERE organization_id = $1 AND timestamp >= $2 AND timestamp < $3 %s %s
       ),
       grouped_q AS (
         SELECT %s AS label, %s AS value
         FROM pageviews
         WHERE organization_id = $1 AND timestamp >= $2 AND timestamp < $3 %s %s
         GROUP BY %s
         ORDER BY value DESC
         LIMIT $4
       )
       SELECT jsonb_build_object(
         ''total'', (SELECT total FROM total_q),
         ''rows'', COALESCE((SELECT jsonb_agg(jsonb_build_object(''label'', label, ''value'', value)) FROM grouped_q), ''[]''::jsonb)
       )',
      _metric_expr, _bot_clause, _filter_clause,
      _group_select, _metric_expr,
      _bot_clause, _filter_clause, _group_expr
    ) INTO _result USING _organization_id, _date_from, _date_to, _limit;
  END IF;

  RETURN COALESCE(_result, '{"total":0,"rows":[]}'::jsonb);
END;
$$;

COMMENT ON FUNCTION get_widget_data_pageviews IS 'Widget data query for pageviews (Website Analytics). Supports configurable metric, group_by, and filters with allowlisted inputs. Includes UTM dimensions.';
