-- ============================================================
-- Widget Data RPC: visits — add UTM group_by + filter support
-- Phase 2b: Custom Query Builder
--
-- UTM data on visits is stored in utm_tags JSONB column.
-- Accessed via utm_tags->>'utm_source' etc.
-- Expression indexes already exist (idx_visits_utm_source, etc.)
--
-- CRITICAL: Full CREATE OR REPLACE — preserves all existing params.
-- ============================================================

CREATE OR REPLACE FUNCTION get_widget_data_visits(
  _organization_id UUID,
  _metric TEXT,
  _group_by TEXT,
  _filters JSONB DEFAULT '[]'::jsonb,
  _date_from TIMESTAMPTZ DEFAULT now() - interval '7 days',
  _date_to TIMESTAMPTZ DEFAULT now(),
  _limit INTEGER DEFAULT 50
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
  _f JSONB;
  _field TEXT;
  _op TEXT;
  _val TEXT;
BEGIN
  -- Allowlist: metric
  CASE _metric
    WHEN 'count' THEN _metric_expr := 'COUNT(*)';
    WHEN 'unique_count' THEN _metric_expr := 'COUNT(DISTINCT fp) FILTER (WHERE fp IS NOT NULL)';
    ELSE RAISE EXCEPTION 'Invalid metric: %', _metric;
  END CASE;

  -- Allowlist: group_by
  -- User-facing names map to actual DB columns
  CASE _group_by
    WHEN 'day' THEN
      _group_select := 'created_at::date::text';
      _group_expr := 'created_at::date';
    WHEN 'week' THEN
      _group_select := 'date_trunc(''week'', created_at)::date::text';
      _group_expr := 'date_trunc(''week'', created_at)';
    WHEN 'month' THEN
      _group_select := 'date_trunc(''month'', created_at)::date::text';
      _group_expr := 'date_trunc(''month'', created_at)';
    WHEN 'channel' THEN
      _group_select := 'COALESCE(type, ''Unknown'')';
      _group_expr := 'COALESCE(type, ''Unknown'')';
    WHEN 'country' THEN
      _group_select := 'COALESCE(country, ''Unknown'')';
      _group_expr := 'COALESCE(country, ''Unknown'')';
    WHEN 'device' THEN
      _group_select := 'COALESCE(platform, ''Unknown'')';
      _group_expr := 'COALESCE(platform, ''Unknown'')';
    WHEN 'os' THEN
      _group_select := 'COALESCE(os, ''Unknown'')';
      _group_expr := 'COALESCE(os, ''Unknown'')';
    WHEN 'referrer' THEN
      _group_select := 'COALESCE(referrer, ''Direct'')';
      _group_expr := 'COALESCE(referrer, ''Direct'')';
    WHEN 'touch_point' THEN
      _group_select := 'tp_id::text';
      _group_expr := 'tp_id';
    WHEN 'utm_source' THEN
      _group_select := 'COALESCE(utm_tags->>''utm_source'', ''(none)'')';
      _group_expr := 'COALESCE(utm_tags->>''utm_source'', ''(none)'')';
    WHEN 'utm_medium' THEN
      _group_select := 'COALESCE(utm_tags->>''utm_medium'', ''(none)'')';
      _group_expr := 'COALESCE(utm_tags->>''utm_medium'', ''(none)'')';
    WHEN 'utm_campaign' THEN
      _group_select := 'COALESCE(utm_tags->>''utm_campaign'', ''(none)'')';
      _group_expr := 'COALESCE(utm_tags->>''utm_campaign'', ''(none)'')';
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

      -- UTM fields use JSONB path expressions (not column names)
      -- Must handle before alias normalization and %I quoting
      IF _field = 'utm_source' THEN
        IF _op = '=' THEN _filter_clause := _filter_clause || format(' AND utm_tags->>''utm_source'' = %L', _val);
        ELSIF _op = '!=' THEN _filter_clause := _filter_clause || format(' AND utm_tags->>''utm_source'' != %L', _val);
        ELSIF _op = 'contains' THEN _filter_clause := _filter_clause || format(' AND utm_tags->>''utm_source'' ILIKE %L', '%' || _val || '%');
        END IF;
        CONTINUE;
      END IF;
      IF _field = 'utm_medium' THEN
        IF _op = '=' THEN _filter_clause := _filter_clause || format(' AND utm_tags->>''utm_medium'' = %L', _val);
        ELSIF _op = '!=' THEN _filter_clause := _filter_clause || format(' AND utm_tags->>''utm_medium'' != %L', _val);
        ELSIF _op = 'contains' THEN _filter_clause := _filter_clause || format(' AND utm_tags->>''utm_medium'' ILIKE %L', '%' || _val || '%');
        END IF;
        CONTINUE;
      END IF;
      IF _field = 'utm_campaign' THEN
        IF _op = '=' THEN _filter_clause := _filter_clause || format(' AND utm_tags->>''utm_campaign'' = %L', _val);
        ELSIF _op = '!=' THEN _filter_clause := _filter_clause || format(' AND utm_tags->>''utm_campaign'' != %L', _val);
        ELSIF _op = 'contains' THEN _filter_clause := _filter_clause || format(' AND utm_tags->>''utm_campaign'' ILIKE %L', '%' || _val || '%');
        END IF;
        CONTINUE;
      END IF;

      -- Normalize aliases to actual column names
      IF _field = 'channel' THEN _field := 'type'; END IF;
      IF _field = 'device' THEN _field := 'platform'; END IF;
      IF _field = 'touch_point' THEN _field := 'tp_id'; END IF;

      -- Allowlist: filter fields (actual DB column names)
      IF _field NOT IN ('type', 'country', 'platform', 'os', 'referrer', 'tp_id') THEN
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
       FROM visits
       WHERE organization_id = $1
         AND created_at >= $2 AND created_at < $3
         AND is_bot = false
         %s',
      _metric_expr, _filter_clause
    ) INTO _result USING _organization_id, _date_from, _date_to;
  ELSE
    -- Grouped mode: rows with label + value
    EXECUTE format(
      'WITH total_q AS (
         SELECT COALESCE(%s, 0) AS total
         FROM visits
         WHERE organization_id = $1 AND created_at >= $2 AND created_at < $3 AND is_bot = false %s
       ),
       grouped_q AS (
         SELECT %s AS label, %s AS value
         FROM visits
         WHERE organization_id = $1 AND created_at >= $2 AND created_at < $3 AND is_bot = false %s
         GROUP BY %s
         ORDER BY value DESC
         LIMIT $4
       )
       SELECT jsonb_build_object(
         ''total'', (SELECT total FROM total_q),
         ''rows'', COALESCE((SELECT jsonb_agg(jsonb_build_object(''label'', label, ''value'', value)) FROM grouped_q), ''[]''::jsonb)
       )',
      _metric_expr, _filter_clause,
      _group_select, _metric_expr,
      _filter_clause, _group_expr
    ) INTO _result USING _organization_id, _date_from, _date_to, _limit;
  END IF;

  RETURN COALESCE(_result, '{"total":0,"rows":[]}'::jsonb);
END;
$$;

COMMENT ON FUNCTION get_widget_data_visits IS 'Widget data query for visits (Link Clicks). Supports configurable metric, group_by, and filters with allowlisted inputs. UTM dimensions via utm_tags JSONB.';
