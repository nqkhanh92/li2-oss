-- Add collection (space) filtering support to get_dashboard_analytics RPC
-- This allows Viewers to only see dashboard stats from their assigned spaces
--
-- NOTE: When collection filtering is applied, we bypass the visits_by_organization view
-- and query the visits table directly to apply the filter. The view is unchanged.

CREATE OR REPLACE FUNCTION public.get_dashboard_analytics(
  _organization_id uuid,
  _timezone text DEFAULT 'UTC'::text,
  _collection_ids text[] DEFAULT NULL,              -- Accept text[] for Supabase JS compatibility
  _include_null_collection boolean DEFAULT true     -- NEW: Include uncategorized touch-points
)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  result JSONB;

  current_timestamp_tz TIMESTAMPTZ;
  today_start TIMESTAMPTZ;
  today_end   TIMESTAMPTZ;
  last_day_start TIMESTAMPTZ;
  last_day_end   TIMESTAMPTZ;
  last_week_start TIMESTAMPTZ;
  last_week_end   TIMESTAMPTZ;
  last_month_start TIMESTAMPTZ;
  last_month_end   TIMESTAMPTZ;

  -- rolling 7-day windows for WoW
  curr7_start TIMESTAMPTZ;
  curr7_end   TIMESTAMPTZ;
  prev7_start TIMESTAMPTZ;
  prev7_end   TIMESTAMPTZ;

  curr7_total BIGINT;
  prev7_total BIGINT;
  curr7_unique BIGINT;
  prev7_unique BIGINT;

  pct_total NUMERIC;
  pct_unique NUMERIC;

  -- NEW: filtered touch-point IDs based on collection access
  filtered_tp_ids UUID[];
  has_collection_filter BOOLEAN;
  collection_ids_uuid UUID[];  -- Cast text[] to uuid[] for comparison
BEGIN
  -- timezone
  EXECUTE format('SET TIME ZONE %L', _timezone);
  current_timestamp_tz := NOW();

  -- ranges you already had
  today_start := DATE_TRUNC('day', current_timestamp_tz);
  today_end   := current_timestamp_tz;

  last_day_start := DATE_TRUNC('day', current_timestamp_tz - INTERVAL '1 day');
  last_day_end   := last_day_start + INTERVAL '1 day' - INTERVAL '1 microsecond';

  last_week_start := DATE_TRUNC('week', current_timestamp_tz) - INTERVAL '7 days';
  last_week_end   := last_week_start + INTERVAL '7 days' - INTERVAL '1 microsecond';

  last_month_start := DATE_TRUNC('month', current_timestamp_tz - INTERVAL '1 month');
  last_month_end   := DATE_TRUNC('month', current_timestamp_tz) - INTERVAL '1 microsecond';

  -- WoW 7d rolling windows (now -> now-7d vs previous 7d)
  curr7_end   := current_timestamp_tz;
  curr7_start := curr7_end - INTERVAL '7 days';
  prev7_end   := curr7_start;
  prev7_start := prev7_end - INTERVAL '7 days';

  -- NEW: Check if collection filtering is needed
  has_collection_filter := _collection_ids IS NOT NULL AND array_length(_collection_ids, 1) > 0;

  -- NEW: Cast text[] to uuid[] for comparison
  IF has_collection_filter THEN
    collection_ids_uuid := ARRAY(SELECT unnest(_collection_ids)::uuid);
  END IF;

  -- NEW: Apply collection filtering to get allowed touch-point IDs
  IF has_collection_filter THEN
    SELECT COALESCE(array_agg(DISTINCT id), ARRAY[]::uuid[]) INTO filtered_tp_ids
    FROM touch_points
    WHERE organization_id = _organization_id
    AND (
      -- Touch-points in specified collections (use uuid[] for comparison)
      collection_id = ANY(collection_ids_uuid)
      -- OR uncategorized touch-points (if includeNull is true)
      OR (
        _include_null_collection = true
        AND collection_id IS NULL
      )
    );
  END IF;

  -- compute WoW totals (with collection filtering)
  SELECT COUNT(*)
  INTO curr7_total
  FROM visits
  WHERE organization_id = _organization_id
    AND created_at >= curr7_start AND created_at < curr7_end
    AND (NOT has_collection_filter OR tp_id = ANY(filtered_tp_ids));

  SELECT COUNT(*)
  INTO prev7_total
  FROM visits
  WHERE organization_id = _organization_id
    AND created_at >= prev7_start AND created_at < prev7_end
    AND (NOT has_collection_filter OR tp_id = ANY(filtered_tp_ids));

  SELECT COUNT(DISTINCT fp)
  INTO curr7_unique
  FROM visits
  WHERE organization_id = _organization_id
    AND fp IS NOT NULL
    AND created_at >= curr7_start AND created_at < curr7_end
    AND (NOT has_collection_filter OR tp_id = ANY(filtered_tp_ids));

  SELECT COUNT(DISTINCT fp)
  INTO prev7_unique
  FROM visits
  WHERE organization_id = _organization_id
    AND fp IS NOT NULL
    AND created_at >= prev7_start AND created_at < prev7_end
    AND (NOT has_collection_filter OR tp_id = ANY(filtered_tp_ids));

  -- percent changes (signed)
  pct_total := CASE
    WHEN prev7_total > 0 THEN ((curr7_total - prev7_total)::numeric * 100.0) / prev7_total
    WHEN prev7_total = 0 AND curr7_total > 0 THEN 100
    ELSE 0
  END;

  pct_unique := CASE
    WHEN prev7_unique > 0 THEN ((curr7_unique - prev7_unique)::numeric * 100.0) / prev7_unique
    WHEN prev7_unique = 0 AND curr7_unique > 0 THEN 100
    ELSE 0
  END;

  -- When collection filter is applied, bypass visits_by_organization view
  -- and query visits table directly
  IF has_collection_filter THEN
    WITH
    all_visits AS (
      SELECT *
      FROM visits
      WHERE organization_id = _organization_id
        AND created_at >= (last_month_start - INTERVAL '1 day')
        AND tp_id = ANY(filtered_tp_ids)
    ),
    type_visits_filtered AS (
      SELECT
        COALESCE(type, 'unknown') AS visit_type,
        COUNT(*) AS visit_count
      FROM visits
      WHERE organization_id = _organization_id
        AND tp_id = ANY(filtered_tp_ids)
      GROUP BY type
      ORDER BY visit_count DESC
    ),
    today_performance AS (
      SELECT DATE_TRUNC('hour', created_at) AS time_period, COUNT(*) AS visit_count
      FROM all_visits
      WHERE created_at >= today_start AND created_at <= today_end
      GROUP BY time_period
      ORDER BY time_period
    ),
    last_day_performance AS (
      SELECT DATE_TRUNC('hour', created_at) AS time_period, COUNT(*) AS visit_count
      FROM all_visits
      WHERE created_at >= last_day_start AND created_at <= last_day_end
      GROUP BY time_period
      ORDER BY time_period
    ),
    last_week_performance AS (
      SELECT DATE(created_at) AS time_period, COUNT(*) AS visit_count
      FROM all_visits
      WHERE created_at >= last_week_start AND created_at <= last_week_end
      GROUP BY time_period
      ORDER BY time_period
    ),
    last_month_performance AS (
      SELECT DATE(created_at) AS time_period, COUNT(*) AS visit_count
      FROM all_visits
      WHERE created_at >= last_month_start AND created_at <= last_month_end
      GROUP BY time_period
      ORDER BY time_period
    )
    SELECT jsonb_build_object(
      'typeVisits', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('name', visit_type, 'count', visit_count))
        FROM type_visits_filtered
      ), '[]'::jsonb),
      'performanceOverTime', jsonb_build_object(
        'today', COALESCE((
          SELECT jsonb_agg(jsonb_build_object('name', time_period, 'count', visit_count))
          FROM today_performance
        ), '[]'::jsonb),
        'lastDay', COALESCE((
          SELECT jsonb_agg(jsonb_build_object('name', time_period, 'count', visit_count))
          FROM last_day_performance
        ), '[]'::jsonb),
        'lastWeek', COALESCE((
          SELECT jsonb_agg(jsonb_build_object('name', time_period, 'count', visit_count))
          FROM last_week_performance
        ), '[]'::jsonb),
        'lastMonth', COALESCE((
          SELECT jsonb_agg(jsonb_build_object('name', time_period, 'count', visit_count))
          FROM last_month_performance
        ), '[]'::jsonb)
      ),
      'totalVisits', (
        SELECT COUNT(*)
        FROM visits
        WHERE organization_id = _organization_id
          AND tp_id = ANY(filtered_tp_ids)
      ),
      'totalUniqueVisits', (
        SELECT COUNT(DISTINCT fp)
        FROM visits
        WHERE organization_id = _organization_id
          AND fp IS NOT NULL
          AND tp_id = ANY(filtered_tp_ids)
      ),
      'totalVisitWoWPercent', pct_total,
      'uniqueVisitWoWPercent', pct_unique,
      'debug', jsonb_build_object(
        'timezone', _timezone,
        'curr7_start', curr7_start, 'curr7_end', curr7_end,
        'prev7_start', prev7_start, 'prev7_end', prev7_end,
        'has_collection_filter', has_collection_filter,
        'collection_ids_input', _collection_ids,
        'collection_ids_uuid', collection_ids_uuid::text[],
        'filtered_tp_ids', filtered_tp_ids::text[],
        'filtered_tp_count', COALESCE(array_length(filtered_tp_ids, 1), 0)
      )
    )
    INTO result;
  ELSE
    -- No collection filter - use original logic with visits_by_organization view
    WITH
    all_visits AS (
      SELECT *
      FROM visits
      WHERE organization_id = _organization_id
        AND created_at >= (last_month_start - INTERVAL '1 day')
    ),
    type_visits AS (
      SELECT
        (jsonb_array_elements(type)->>'type') AS visit_type,
        (jsonb_array_elements(type)->>'count')::INTEGER AS visit_count,
        total AS total_visits
      FROM visits_by_organization
      WHERE organization_id = _organization_id
    ),
    today_performance AS (
      SELECT DATE_TRUNC('hour', created_at) AS time_period, COUNT(*) AS visit_count
      FROM all_visits
      WHERE created_at >= today_start AND created_at <= today_end
      GROUP BY time_period
      ORDER BY time_period
    ),
    last_day_performance AS (
      SELECT DATE_TRUNC('hour', created_at) AS time_period, COUNT(*) AS visit_count
      FROM all_visits
      WHERE created_at >= last_day_start AND created_at <= last_day_end
      GROUP BY time_period
      ORDER BY time_period
    ),
    last_week_performance AS (
      SELECT DATE(created_at) AS time_period, COUNT(*) AS visit_count
      FROM all_visits
      WHERE created_at >= last_week_start AND created_at <= last_week_end
      GROUP BY time_period
      ORDER BY time_period
    ),
    last_month_performance AS (
      SELECT DATE(created_at) AS time_period, COUNT(*) AS visit_count
      FROM all_visits
      WHERE created_at >= last_month_start AND created_at <= last_month_end
      GROUP BY time_period
      ORDER BY time_period
    )
    SELECT jsonb_build_object(
      'typeVisits', (
        SELECT jsonb_agg(jsonb_build_object('name', visit_type, 'count', visit_count))
        FROM type_visits
      ),
      'performanceOverTime', jsonb_build_object(
        'today', (
          SELECT jsonb_agg(jsonb_build_object('name', time_period, 'count', visit_count))
          FROM today_performance
        ),
        'lastDay', (
          SELECT jsonb_agg(jsonb_build_object('name', time_period, 'count', visit_count))
          FROM last_day_performance
        ),
        'lastWeek', (
          SELECT jsonb_agg(jsonb_build_object('name', time_period, 'count', visit_count))
          FROM last_week_performance
        ),
        'lastMonth', (
          SELECT jsonb_agg(jsonb_build_object('name', time_period, 'count', visit_count))
          FROM last_month_performance
        )
      ),
      'totalVisits', (SELECT total_visits FROM type_visits LIMIT 1),
      'totalUniqueVisits', (
        SELECT COUNT(DISTINCT fp)
        FROM visits
        WHERE organization_id = _organization_id
          AND fp IS NOT NULL
      ),
      'totalVisitWoWPercent', pct_total,
      'uniqueVisitWoWPercent', pct_unique,
      'debug', jsonb_build_object(
        'timezone', _timezone,
        'curr7_start', curr7_start, 'curr7_end', curr7_end,
        'prev7_start', prev7_start, 'prev7_end', prev7_end
      )
    )
    INTO result;
  END IF;

  RETURN COALESCE(result, '{}'::jsonb);
END;
$function$;

-- Add comment
COMMENT ON FUNCTION public.get_dashboard_analytics IS
'Get dashboard analytics with optional filtering by collections (spaces).
Supports filtering by collection IDs to restrict data visibility for Viewers.
Use _collection_ids with _include_null_collection to control visibility of uncategorized touch-points.
When collection filter is applied, bypasses visits_by_organization view and queries visits table directly.';
