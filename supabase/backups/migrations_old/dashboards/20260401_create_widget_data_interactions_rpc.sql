CREATE OR REPLACE FUNCTION public.get_widget_data_interactions(
  _organization_id UUID,
  _metric TEXT,
  _group_by TEXT,
  _filters JSONB DEFAULT '[]'::jsonb,
  _date_from TIMESTAMPTZ DEFAULT (now() - interval '7 days'),
  _date_to TIMESTAMPTZ DEFAULT now(),
  _limit INTEGER DEFAULT 50
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
    WHEN 'unique_visitors' THEN _metric_expr := 'COUNT(DISTINCT visitor_id)';
    WHEN 'unique_sessions' THEN _metric_expr := 'COUNT(DISTINCT session_id)';
    ELSE RAISE EXCEPTION 'Invalid metric: %', _metric;
  END CASE;

  -- Allowlist: group_by
  -- Uses `timestamp` column (client time) for time-based grouping
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
    WHEN 'interaction_type' THEN
      _group_select := 'COALESCE(interaction_type, ''Unknown'')';
      _group_expr := 'COALESCE(interaction_type, ''Unknown'')';
    WHEN 'page_path' THEN
      _group_select := 'COALESCE(page_path, ''Unknown'')';
      _group_expr := 'COALESCE(page_path, ''Unknown'')';
    WHEN 'device_type' THEN
      _group_select := 'COALESCE(device_type, ''Unknown'')';
      _group_expr := 'COALESCE(device_type, ''Unknown'')';
    WHEN 'country' THEN
      _group_select := 'COALESCE(country, ''Unknown'')';
      _group_expr := 'COALESCE(country, ''Unknown'')';
    WHEN 'element_tag' THEN
      _group_select := 'COALESCE(element_tag, ''Unknown'')';
      _group_expr := 'COALESCE(element_tag, ''Unknown'')';
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

      -- Allowlist: filter fields
      IF _field NOT IN ('interaction_type', 'page_path', 'device_type', 'country', 'element_tag') THEN
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
  -- DUAL DATE FILTER: created_at for partition pruning + timestamp for semantic correctness
  -- BOT FILTER: COALESCE handles NULL is_bot (in-flight rows before worker enrichment)
  IF _group_expr IS NULL THEN
    -- KPI mode: single aggregate value
    EXECUTE format(
      'SELECT jsonb_build_object(
         ''total'', COALESCE(%s, 0),
         ''rows'', ''[]''::jsonb
       )
       FROM interactions
       WHERE organization_id = $1
         AND created_at >= $2 AND created_at < $3
         AND timestamp >= $2 AND timestamp < $3
         AND COALESCE(is_bot, false) = false
         %s',
      _metric_expr, _filter_clause
    ) INTO _result USING _organization_id, _date_from, _date_to;
  ELSE
    -- Grouped mode: rows with label + value
    EXECUTE format(
      'WITH total_q AS (
         SELECT COALESCE(%s, 0) AS total
         FROM interactions
         WHERE organization_id = $1
           AND created_at >= $2 AND created_at < $3
           AND timestamp >= $2 AND timestamp < $3
           AND COALESCE(is_bot, false) = false
           %s
       ),
       grouped_q AS (
         SELECT %s AS label, %s AS value
         FROM interactions
         WHERE organization_id = $1
           AND created_at >= $2 AND created_at < $3
           AND timestamp >= $2 AND timestamp < $3
           AND COALESCE(is_bot, false) = false
           %s
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
$function$;
