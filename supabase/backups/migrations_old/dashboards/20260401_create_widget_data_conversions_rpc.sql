CREATE OR REPLACE FUNCTION public.get_widget_data_conversions(
  _organization_id UUID,
  _metric TEXT,
  _group_by TEXT,
  _filters JSONB DEFAULT '[]'::jsonb,
  _date_from TIMESTAMPTZ DEFAULT (now() - interval '7 days'),
  _date_to TIMESTAMPTZ DEFAULT now(),
  _limit INTEGER DEFAULT 50,
  _target_currency TEXT DEFAULT NULL
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
  _effective_currency TEXT;
  _er_join TEXT := '';
BEGIN
  -- Resolve target currency: param > org default > 'USD' fallback
  IF _target_currency IS NOT NULL THEN
    _effective_currency := _target_currency;
  ELSE
    SELECT default_currency INTO _effective_currency
    FROM organizations WHERE id = _organization_id;
    _effective_currency := COALESCE(_effective_currency, 'USD');
  END IF;

  -- Allowlist: metric
  -- Revenue uses a converted amount expression via exchange_rates CTE (applied in query below)
  CASE _metric
    WHEN 'count' THEN _metric_expr := 'COUNT(*)';
    WHEN 'lead_count' THEN _metric_expr := 'COUNT(*) FILTER (WHERE ce.event_type = ''lead'')';
    WHEN 'sale_count' THEN _metric_expr := 'COUNT(*) FILTER (WHERE ce.event_type = ''sale'')';
    WHEN 'revenue' THEN _metric_expr := 'COALESCE(SUM(
      CASE
        WHEN ce.currency = ' || quote_literal(_effective_currency) || ' THEN ce.amount
        WHEN ce.currency IS NULL THEN ce.amount
        ELSE ce.amount * COALESCE(er.rate, 1)
      END
    ), 0)';
    ELSE RAISE EXCEPTION 'Invalid metric: %', _metric;
  END CASE;

  -- Allowlist: group_by
  CASE _group_by
    WHEN 'day' THEN
      _group_select := 'ce.created_at::date::text';
      _group_expr := 'ce.created_at::date';
    WHEN 'week' THEN
      _group_select := 'date_trunc(''week'', ce.created_at)::date::text';
      _group_expr := 'date_trunc(''week'', ce.created_at)';
    WHEN 'month' THEN
      _group_select := 'date_trunc(''month'', ce.created_at)::date::text';
      _group_expr := 'date_trunc(''month'', ce.created_at)';
    WHEN 'event_type' THEN
      _group_select := 'ce.event_type::text';
      _group_expr := 'ce.event_type';
    WHEN 'event_name' THEN
      _group_select := 'COALESCE(ce.event_name, ''Unknown'')';
      _group_expr := 'COALESCE(ce.event_name, ''Unknown'')';
    WHEN 'touch_point' THEN
      _group_select := 'COALESCE(tp.name, ''(no link)'')';
      _group_expr := 'COALESCE(tp.name, ''(no link)'')';
    WHEN 'referrer' THEN
      _group_select := 'COALESCE(regexp_replace(ce.referrer, ''^https?://([^/]+).*'', ''\1''), ''Direct'')';
      _group_expr := 'COALESCE(regexp_replace(ce.referrer, ''^https?://([^/]+).*'', ''\1''), ''Direct'')';
    WHEN 'utm_source' THEN
      _group_select := 'COALESCE(tp.utm_tags->>''utm_source'', ''(none)'')';
      _group_expr := 'COALESCE(tp.utm_tags->>''utm_source'', ''(none)'')';
    WHEN 'utm_medium' THEN
      _group_select := 'COALESCE(tp.utm_tags->>''utm_medium'', ''(none)'')';
      _group_expr := 'COALESCE(tp.utm_tags->>''utm_medium'', ''(none)'')';
    WHEN 'utm_campaign' THEN
      _group_select := 'COALESCE(tp.utm_tags->>''utm_campaign'', ''(none)'')';
      _group_expr := 'COALESCE(tp.utm_tags->>''utm_campaign'', ''(none)'')';
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

      -- event_type: explicit value allowlist to prevent enum cast errors
      IF _field = 'event_type' THEN
        IF _val NOT IN ('lead', 'sale') THEN
          RAISE EXCEPTION 'Invalid event_type value: %', _val;
        END IF;
        IF _op = '=' THEN _filter_clause := _filter_clause || format(' AND ce.event_type = %L::conversion_event_type', _val);
        ELSIF _op = '!=' THEN _filter_clause := _filter_clause || format(' AND ce.event_type != %L::conversion_event_type', _val);
        END IF;
        CONTINUE;
      END IF;

      -- UTM fields use JSONB path on touch_points
      IF _field = 'utm_source' THEN
        IF _op = '=' THEN _filter_clause := _filter_clause || format(' AND tp.utm_tags->>''utm_source'' = %L', _val);
        ELSIF _op = '!=' THEN _filter_clause := _filter_clause || format(' AND tp.utm_tags->>''utm_source'' != %L', _val);
        ELSIF _op = 'contains' THEN _filter_clause := _filter_clause || format(' AND tp.utm_tags->>''utm_source'' ILIKE %L', '%' || _val || '%');
        END IF;
        CONTINUE;
      END IF;
      IF _field = 'utm_medium' THEN
        IF _op = '=' THEN _filter_clause := _filter_clause || format(' AND tp.utm_tags->>''utm_medium'' = %L', _val);
        ELSIF _op = '!=' THEN _filter_clause := _filter_clause || format(' AND tp.utm_tags->>''utm_medium'' != %L', _val);
        ELSIF _op = 'contains' THEN _filter_clause := _filter_clause || format(' AND tp.utm_tags->>''utm_medium'' ILIKE %L', '%' || _val || '%');
        END IF;
        CONTINUE;
      END IF;
      IF _field = 'utm_campaign' THEN
        IF _op = '=' THEN _filter_clause := _filter_clause || format(' AND tp.utm_tags->>''utm_campaign'' = %L', _val);
        ELSIF _op = '!=' THEN _filter_clause := _filter_clause || format(' AND tp.utm_tags->>''utm_campaign'' != %L', _val);
        ELSIF _op = 'contains' THEN _filter_clause := _filter_clause || format(' AND tp.utm_tags->>''utm_campaign'' ILIKE %L', '%' || _val || '%');
        END IF;
        CONTINUE;
      END IF;

      -- touch_point filter uses tp_id, not tp.name
      IF _field = 'touch_point_id' THEN
        IF _op = '=' THEN _filter_clause := _filter_clause || format(' AND ce.touch_point_id = %L::uuid', _val);
        ELSIF _op = '!=' THEN _filter_clause := _filter_clause || format(' AND ce.touch_point_id != %L::uuid', _val);
        END IF;
        CONTINUE;
      END IF;

      -- Remaining allowlisted fields (direct column access on ce)
      IF _field NOT IN ('event_name', 'referrer') THEN
        RAISE EXCEPTION 'Invalid filter field: %', _field;
      END IF;
      IF _op NOT IN ('=', '!=', 'contains') THEN
        RAISE EXCEPTION 'Invalid filter operator: %', _op;
      END IF;

      IF _op = '=' THEN
        _filter_clause := _filter_clause || format(' AND ce.%I = %L', _field, _val);
      ELSIF _op = '!=' THEN
        _filter_clause := _filter_clause || format(' AND ce.%I != %L', _field, _val);
      ELSIF _op = 'contains' THEN
        _filter_clause := _filter_clause || format(' AND ce.%I ILIKE %L', _field, '%' || _val || '%');
      END IF;
    END LOOP;
  END IF;

  -- Build exchange_rates JOIN clause (only needed for revenue metric)
  IF _metric = 'revenue' THEN
    _er_join := format(
      'LEFT JOIN LATERAL (
         SELECT rate FROM exchange_rates
         WHERE base_currency = ce.currency AND target_currency = %L
         ORDER BY rate_date DESC LIMIT 1
       ) er ON true',
      _effective_currency
    );
  END IF;

  -- Execute query (ALWAYS LEFT JOIN touch_points; exchange_rates only for revenue)
  IF _group_expr IS NULL THEN
    EXECUTE format(
      'SELECT jsonb_build_object(
         ''total'', COALESCE(%s, 0),
         ''rows'', ''[]''::jsonb
       )
       FROM conversion_events ce
       LEFT JOIN touch_points tp ON ce.touch_point_id = tp.id
       %s
       WHERE ce.organization_id = $1
         AND ce.created_at >= $2 AND ce.created_at < $3
         %s',
      _metric_expr, _er_join, _filter_clause
    ) INTO _result USING _organization_id, _date_from, _date_to;
  ELSE
    EXECUTE format(
      'WITH total_q AS (
         SELECT COALESCE(%s, 0) AS total
         FROM conversion_events ce
         LEFT JOIN touch_points tp ON ce.touch_point_id = tp.id
         %s
         WHERE ce.organization_id = $1 AND ce.created_at >= $2 AND ce.created_at < $3 %s
       ),
       grouped_q AS (
         SELECT %s AS label, %s AS value
         FROM conversion_events ce
         LEFT JOIN touch_points tp ON ce.touch_point_id = tp.id
         %s
         WHERE ce.organization_id = $1 AND ce.created_at >= $2 AND ce.created_at < $3 %s
         GROUP BY %s
         ORDER BY value DESC
         LIMIT $4
       )
       SELECT jsonb_build_object(
         ''total'', (SELECT total FROM total_q),
         ''rows'', COALESCE((SELECT jsonb_agg(jsonb_build_object(''label'', label, ''value'', value)) FROM grouped_q), ''[]''::jsonb)
       )',
      _metric_expr, _er_join, _filter_clause,
      _group_select, _metric_expr,
      _er_join, _filter_clause, _group_expr
    ) INTO _result USING _organization_id, _date_from, _date_to, _limit;
  END IF;

  RETURN COALESCE(_result, '{"total":0,"rows":[]}'::jsonb);
END;
$function$;
