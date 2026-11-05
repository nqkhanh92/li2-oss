-- Drop old versions with mismatched param types
DROP FUNCTION IF EXISTS get_overview_data(text, text, text[], boolean, text, boolean, boolean);
DROP FUNCTION IF EXISTS get_overview_data(uuid, text, text[], boolean, uuid, boolean, boolean);

CREATE OR REPLACE FUNCTION get_overview_data(
  _organization_id uuid,
  _timezone text DEFAULT 'UTC',
  _collection_ids uuid[] DEFAULT NULL,
  _include_null_collection boolean DEFAULT true,
  _user_id uuid DEFAULT NULL,
  _exclude_bot boolean DEFAULT true,
  _include_pro boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  -- Compute period boundaries in UTC, timezone-aware:
  -- date_trunc in user's tz → AT TIME ZONE converts back to UTC timestamptz
  _period_start timestamptz := date_trunc('day', NOW() AT TIME ZONE _timezone - interval '6 days') AT TIME ZONE _timezone;
  _period_end   timestamptz := (date_trunc('day', NOW() AT TIME ZONE _timezone) + interval '1 day') AT TIME ZONE _timezone;
  _prev_start   timestamptz := _period_start - interval '7 days';
  _prev_end     timestamptz := _period_start;
  _result jsonb := '{}'::jsonb;
  _links jsonb;
  _website jsonb;
  _conversions jsonb;
  _trend jsonb;
BEGIN
  -- Normalize empty array to NULL (empty array bypasses user_id filter via IS NOT NULL)
  IF _collection_ids IS NOT NULL AND array_length(_collection_ids, 1) IS NULL THEN
    _collection_ids := NULL;
  END IF;

  -- TREND: 7-day daily aggregation
  WITH days AS (
    SELECT generate_series(
      (_period_start AT TIME ZONE _timezone)::date,
      ((_period_end - interval '1 second') AT TIME ZONE _timezone)::date,
      interval '1 day'
    )::date AS day
  ),
  daily_clicks AS (
    SELECT date_trunc('day', v.created_at AT TIME ZONE _timezone)::date AS day,
           COUNT(*) AS cnt
    FROM visits v
    WHERE v.organization_id = _organization_id
      AND v.created_at >= _period_start AND v.created_at < _period_end
      AND (_exclude_bot = false OR v.is_bot = false)
      AND (
        _collection_ids IS NULL
        OR v.tp_id IN (SELECT tp.id FROM touch_points tp WHERE tp.collection_id = ANY(_collection_ids))
        OR (_include_null_collection AND v.tp_id IN (SELECT tp.id FROM touch_points tp WHERE tp.collection_id IS NULL AND tp.organization_id = _organization_id))
      )
      AND (
        _collection_ids IS NOT NULL
        OR _user_id IS NULL
        OR v.tp_id IN (SELECT tp.id FROM touch_points tp WHERE tp.collection_id IS NULL AND tp.user_id = _user_id AND tp.organization_id = _organization_id)
      )
    GROUP BY 1
  ),
  daily_pageviews AS (
    SELECT date_trunc('day', p.timestamp AT TIME ZONE _timezone)::date AS day,
           COUNT(*) AS cnt
    FROM pageviews p
    WHERE p.organization_id = _organization_id
      AND p.timestamp >= _period_start AND p.timestamp < _period_end
      AND _include_pro = true
      AND (_exclude_bot = false OR p.is_bot = false)
    GROUP BY 1
  ),
  daily_conversions AS (
    SELECT date_trunc('day', ce.created_at AT TIME ZONE _timezone)::date AS day,
           COUNT(*) AS cnt
    FROM conversion_events ce
    WHERE ce.organization_id = _organization_id
      AND ce.created_at >= _period_start AND ce.created_at < _period_end
      AND _include_pro = true
    GROUP BY 1
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'date', d.day::text,
      'clicks', COALESCE(dc.cnt, 0),
      'pageviews', COALESCE(dp.cnt, 0),
      'conversions', COALESCE(dconv.cnt, 0)
    ) ORDER BY d.day
  )
  INTO _trend
  FROM days d
  LEFT JOIN daily_clicks dc ON dc.day = d.day
  LEFT JOIN daily_pageviews dp ON dp.day = d.day
  LEFT JOIN daily_conversions dconv ON dconv.day = d.day;

  _result := _result || jsonb_build_object('trend', COALESCE(_trend, '[]'::jsonb));

  -- LINKS: current + previous period
  WITH visit_filter AS (
    SELECT v.id, v.fp, v.type, v.tp_id, v.created_at
    FROM visits v
    WHERE v.organization_id = _organization_id
      AND (_exclude_bot = false OR v.is_bot = false)
      AND (
        _collection_ids IS NULL
        OR v.tp_id IN (SELECT tp.id FROM touch_points tp WHERE tp.collection_id = ANY(_collection_ids))
        OR (_include_null_collection AND v.tp_id IN (SELECT tp.id FROM touch_points tp WHERE tp.collection_id IS NULL AND tp.organization_id = _organization_id))
      )
      AND (
        _collection_ids IS NOT NULL
        OR _user_id IS NULL
        OR v.tp_id IN (SELECT tp.id FROM touch_points tp WHERE tp.collection_id IS NULL AND tp.user_id = _user_id AND tp.organization_id = _organization_id)
      )
  ),
  current_totals AS (
    SELECT COUNT(*) AS total,
           COUNT(DISTINCT fp) FILTER (WHERE fp IS NOT NULL) AS unique_count
    FROM visit_filter
    WHERE created_at >= _period_start AND created_at < _period_end
  ),
  current_channels AS (
    SELECT type, COUNT(*) AS count
    FROM visit_filter
    WHERE created_at >= _period_start AND created_at < _period_end
    GROUP BY type
  ),
  prev_totals AS (
    SELECT COUNT(*) AS total,
           COUNT(DISTINCT fp) FILTER (WHERE fp IS NOT NULL) AS unique_count
    FROM visit_filter
    WHERE created_at >= _prev_start AND created_at < _prev_end
  ),
  top_links AS (
    SELECT tp.name, s.slug, COUNT(v.id) AS cnt
    FROM visits v
    JOIN touch_points tp ON tp.id = v.tp_id
    LEFT JOIN LATERAL (
      SELECT sl.slug FROM slugs sl WHERE sl.tp_id = tp.id LIMIT 1
    ) s ON true
    WHERE v.organization_id = _organization_id
      AND v.created_at >= _period_start AND v.created_at < _period_end
      AND (_exclude_bot = false OR v.is_bot = false)
      AND (
        _collection_ids IS NULL
        OR tp.collection_id = ANY(_collection_ids)
        OR (_include_null_collection AND tp.collection_id IS NULL)
      )
      AND (
        _collection_ids IS NOT NULL
        OR _user_id IS NULL
        OR (tp.collection_id IS NULL AND tp.user_id = _user_id AND tp.organization_id = _organization_id)
      )
    GROUP BY tp.name, s.slug
    ORDER BY cnt DESC
    LIMIT 3
  )
  SELECT jsonb_build_object(
    'totalClicks', (SELECT COALESCE(total, 0) FROM current_totals),
    'totalClicksPrev', (SELECT COALESCE(total, 0) FROM prev_totals),
    'uniqueClicks', (SELECT COALESCE(unique_count, 0) FROM current_totals),
    'uniqueClicksPrev', (SELECT COALESCE(unique_count, 0) FROM prev_totals),
    'avgPerDay', ROUND((SELECT COALESCE(total, 0) FROM current_totals)::numeric / 7, 0),
    'avgPerDayPrev', ROUND((SELECT COALESCE(total, 0) FROM prev_totals)::numeric / 7, 0),
    'channels', (SELECT COALESCE(jsonb_agg(jsonb_build_object('name', type, 'count', count)), '[]'::jsonb) FROM current_channels),
    'topLinks', (SELECT COALESCE(jsonb_agg(jsonb_build_object('name', name, 'slug', slug, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb) FROM top_links)
  )
  INTO _links;

  _result := _result || jsonb_build_object('links', _links);

  -- WEBSITE (Pro only)
  IF _include_pro THEN
    WITH current_pv AS (
      SELECT COUNT(*) AS total_pv,
             COUNT(DISTINCT li2_cid) AS unique_visitors,
             COUNT(DISTINCT session_id) AS total_sessions
      FROM pageviews
      WHERE organization_id = _organization_id
        AND timestamp >= _period_start AND timestamp < _period_end
        AND (_exclude_bot = false OR is_bot = false)
    ),
    prev_pv AS (
      SELECT COUNT(*) AS total_pv,
             COUNT(DISTINCT li2_cid) AS unique_visitors,
             COUNT(DISTINCT session_id) AS total_sessions
      FROM pageviews
      WHERE organization_id = _organization_id
        AND timestamp >= _prev_start AND timestamp < _prev_end
        AND (_exclude_bot = false OR is_bot = false)
    ),
    top_sources AS (
      SELECT CASE
               WHEN page_referrer IS NULL OR page_referrer = '' THEN 'Direct'
               ELSE COALESCE(
                 regexp_replace(page_referrer, '^https?://([^/]+).*$', '\1'),
                 page_referrer
               )
             END AS source,
             COUNT(*) AS cnt
      FROM pageviews
      WHERE organization_id = _organization_id
        AND timestamp >= _period_start AND timestamp < _period_end
        AND (_exclude_bot = false OR is_bot = false)
      GROUP BY 1
      ORDER BY cnt DESC
      LIMIT 3
    ),
    total_pv_for_pct AS (
      SELECT COUNT(*) AS total FROM pageviews
      WHERE organization_id = _organization_id
        AND timestamp >= _period_start AND timestamp < _period_end
        AND (_exclude_bot = false OR is_bot = false)
    ),
    top_pages AS (
      SELECT
        regexp_replace(page_url, '^https?://([^/]+).*', '\1') AS hostname,
        page_path,
        COUNT(*) AS cnt
      FROM pageviews
      WHERE organization_id = _organization_id
        AND timestamp >= _period_start AND timestamp < _period_end
        AND (_exclude_bot = false OR is_bot = false)
      GROUP BY hostname, page_path
      ORDER BY cnt DESC
      LIMIT 3
    )
    SELECT jsonb_build_object(
      'totalPageviews', (SELECT total_pv FROM current_pv),
      'totalPageviewsPrev', (SELECT total_pv FROM prev_pv),
      'uniqueVisitors', (SELECT unique_visitors FROM current_pv),
      'uniqueVisitorsPrev', (SELECT unique_visitors FROM prev_pv),
      'totalSessions', (SELECT total_sessions FROM current_pv),
      'totalSessionsPrev', (SELECT total_sessions FROM prev_pv),
      'topSources', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'name', source,
        'percentage', ROUND(cnt::numeric / GREATEST((SELECT total FROM total_pv_for_pct), 1) * 100, 1)
      ) ORDER BY cnt DESC), '[]'::jsonb) FROM top_sources),
      'topPages', (SELECT COALESCE(jsonb_agg(jsonb_build_object('hostname', hostname, 'path', page_path, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb) FROM top_pages)
    )
    INTO _website;

    _result := _result || jsonb_build_object('website', _website);
  ELSE
    _result := _result || jsonb_build_object('website', null);
  END IF;

  -- CONVERSIONS (Pro only)
  IF _include_pro THEN
    WITH current_conv AS (
      SELECT COUNT(*) AS total,
             COUNT(*) FILTER (WHERE event_type = 'lead') AS leads,
             COUNT(*) FILTER (WHERE event_type = 'sale') AS sales
      FROM conversion_events
      WHERE organization_id = _organization_id
        AND created_at >= _period_start AND created_at < _period_end
    ),
    prev_conv AS (
      SELECT COUNT(*) AS total,
             COUNT(*) FILTER (WHERE event_type = 'lead') AS leads,
             COUNT(*) FILTER (WHERE event_type = 'sale') AS sales
      FROM conversion_events
      WHERE organization_id = _organization_id
        AND created_at >= _prev_start AND created_at < _prev_end
    ),
    click_count AS (
      SELECT COUNT(*) AS cnt FROM visits v
      WHERE v.organization_id = _organization_id
        AND v.created_at >= _period_start AND v.created_at < _period_end
        AND (_exclude_bot = false OR v.is_bot = false)
        AND (
          _collection_ids IS NULL
          OR v.tp_id IN (SELECT tp.id FROM touch_points tp WHERE tp.collection_id = ANY(_collection_ids))
          OR (_include_null_collection AND v.tp_id IN (SELECT tp.id FROM touch_points tp WHERE tp.collection_id IS NULL AND tp.organization_id = _organization_id))
        )
        AND (
          _collection_ids IS NOT NULL
          OR _user_id IS NULL
          OR v.tp_id IN (SELECT tp.id FROM touch_points tp WHERE tp.collection_id IS NULL AND tp.user_id = _user_id AND tp.organization_id = _organization_id)
        )
    )
    SELECT jsonb_build_object(
      'totalConversions', (SELECT total FROM current_conv),
      'totalConversionsPrev', (SELECT total FROM prev_conv),
      'totalLeads', (SELECT leads FROM current_conv),
      'totalLeadsPrev', (SELECT leads FROM prev_conv),
      'totalSales', (SELECT sales FROM current_conv),
      'totalSalesPrev', (SELECT sales FROM prev_conv),
      'clickToLeadRate', ROUND(
        (SELECT leads FROM current_conv)::numeric / GREATEST((SELECT cnt FROM click_count), 1) * 100, 1
      ),
      'leadToSaleRate', ROUND(
        (SELECT sales FROM current_conv)::numeric / GREATEST((SELECT leads FROM current_conv), 1) * 100, 1
      )
    )
    INTO _conversions;

    _result := _result || jsonb_build_object('conversions', _conversions);
  ELSE
    _result := _result || jsonb_build_object('conversions', null);
  END IF;

  RETURN _result;
END;
$$;
