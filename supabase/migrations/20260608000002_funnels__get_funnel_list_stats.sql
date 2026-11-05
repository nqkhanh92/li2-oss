DROP FUNCTION IF EXISTS public.get_funnel_list_stats(uuid);

CREATE OR REPLACE FUNCTION public.get_funnel_list_stats(p_org_id uuid)
RETURNS TABLE(
  funnel_id uuid,
  total_entries bigint,
  total_conversions bigint,
  conversion_rate numeric,
  cvr_trend numeric,
  biggest_dropoff_step_position int,
  biggest_dropoff_step_name text,
  biggest_dropoff_next_step_name text,
  biggest_dropoff_drop_offs bigint,
  biggest_dropoff_rate numeric
)
LANGUAGE sql
STABLE
AS $$
  WITH
  -- All-time aggregates (start → today)
  alltime AS (
    SELECT
      funnel_id,
      SUM(total_entries)::bigint     AS total_entries,
      SUM(total_conversions)::bigint AS total_conversions
    FROM funnel_results
    WHERE organization_id = p_org_id
      AND period_type = 'day'
    GROUP BY funnel_id
  ),
  -- Snapshot as of 7 days ago (start → 7 days ago), for trend baseline
  before_7d AS (
    SELECT
      funnel_id,
      SUM(total_entries)::bigint     AS total_entries,
      SUM(total_conversions)::bigint AS total_conversions
    FROM funnel_results
    WHERE organization_id = p_org_id
      AND period_type = 'day'
      AND period_start < CURRENT_DATE - INTERVAL '7 days'
    GROUP BY funnel_id
  ),
  -- Unnest step_metrics JSONB for all steps (including step 1 which can have the most drop-offs)
  step_unnested AS (
    SELECT
      fr.funnel_id,
      fr.period_start,
      (step->>'step_position')::int  AS step_position,
      (step->>'step_name')::text     AS step_name,
      (step->>'visits')::bigint      AS visits,
      (step->>'drop_offs')::bigint   AS drop_offs
    FROM funnel_results fr,
         jsonb_array_elements(fr.step_metrics) AS step
    WHERE fr.organization_id = p_org_id
      AND fr.period_type = 'day'
  ),
  step_agg AS (
    SELECT
      funnel_id,
      step_position,
      (array_agg(step_name ORDER BY period_start DESC))[1] AS step_name,
      SUM(visits)    AS total_visits,
      SUM(drop_offs) AS total_drop_offs
    FROM step_unnested
    GROUP BY funnel_id, step_position
  ),
  -- True last step per funnel from funnel_steps table (not step_agg, which may miss zero-data steps)
  funnel_last_step AS (
    SELECT funnel_id, MAX(position) AS max_pos
    FROM funnel_steps
    GROUP BY funnel_id
  ),
  -- One row per funnel: highest drop-off rate among non-final, non-empty, required steps
  -- Matches drop-off-insight.tsx: exclude last step, exclude 0-visit steps
  biggest_drop AS (
    SELECT DISTINCT ON (a.funnel_id)
      a.funnel_id,
      a.step_position,
      a.step_name,
      a.total_drop_offs,
      CASE WHEN a.total_visits > 0
        THEN ROUND((a.total_drop_offs::numeric / a.total_visits) * 100, 1)
        ELSE 0
      END AS drop_off_rate,
      b.step_name AS next_step_name
    FROM step_agg a
    JOIN funnel_last_step fls
      ON fls.funnel_id = a.funnel_id
      AND a.step_position < fls.max_pos
    LEFT JOIN step_agg b
      ON b.funnel_id = a.funnel_id
      AND b.step_position = a.step_position + 1
    WHERE a.total_visits > 0
    ORDER BY a.funnel_id,
             (a.total_drop_offs::numeric / a.total_visits) * 100 DESC
  )
  SELECT
    a.funnel_id,
    a.total_entries,
    a.total_conversions,
    -- Current CVR: all-time
    CASE WHEN a.total_entries > 0
      THEN ROUND((a.total_conversions::numeric / a.total_entries) * 100, 2)
      ELSE 0
    END AS conversion_rate,
    -- Trend: current all-time CVR minus CVR as of 7 days ago
    -- Positive = improving, negative = declining
    CASE WHEN b7.total_entries IS NOT NULL THEN
      ROUND(
        CASE WHEN a.total_entries > 0
          THEN (a.total_conversions::numeric / a.total_entries) * 100
          ELSE 0
        END
        -
        CASE WHEN b7.total_entries > 0
          THEN (b7.total_conversions::numeric / b7.total_entries) * 100
          ELSE 0
        END,
        2
      )
    ELSE NULL
    END AS cvr_trend,
    bd.step_position   AS biggest_dropoff_step_position,
    bd.step_name       AS biggest_dropoff_step_name,
    bd.next_step_name  AS biggest_dropoff_next_step_name,
    bd.total_drop_offs AS biggest_dropoff_drop_offs,
    bd.drop_off_rate   AS biggest_dropoff_rate
  FROM alltime a
  LEFT JOIN before_7d b7    ON b7.funnel_id = a.funnel_id
  LEFT JOIN biggest_drop bd ON bd.funnel_id = a.funnel_id
$$;
