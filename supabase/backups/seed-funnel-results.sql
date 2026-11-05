-- Seed script: Insert sample funnel_results for "Purchase Funnel v2"
-- Run manually: psql -f seed-funnel-results.sql
-- Or paste into Supabase SQL Editor

-- This script looks up your funnel and its steps, then generates
-- 30 days of daily results with realistic decreasing traffic patterns.

DO $$
DECLARE
  v_funnel_id uuid;
  v_org_id uuid;
  v_steps jsonb;
  v_day date;
  v_base_visits int;
  v_daily_variation float;
  v_step_record record;
  v_step_metrics jsonb;
  v_prev_proceeds int;
  v_visits int;
  v_proceeds int;
  v_drop_offs int;
  v_total_entries int;
  v_total_conversions int;
BEGIN
  -- Find the funnel (adjust name if needed)
  SELECT f.id, f.organization_id
  INTO v_funnel_id, v_org_id
  FROM funnels f
  WHERE f.deleted_at IS NULL
  ORDER BY f.created_at DESC
  LIMIT 1;

  IF v_funnel_id IS NULL THEN
    RAISE EXCEPTION 'No funnel found. Create a funnel first.';
  END IF;

  RAISE NOTICE 'Using funnel: % (org: %)', v_funnel_id, v_org_id;

  -- Get ordered steps
  SELECT jsonb_agg(
    jsonb_build_object(
      'position', fs.position,
      'name', fs.name
    ) ORDER BY fs.position
  )
  INTO v_steps
  FROM funnel_steps fs
  WHERE fs.funnel_id = v_funnel_id;

  RAISE NOTICE 'Steps: %', v_steps;

  -- Delete existing results for this funnel (clean seed)
  DELETE FROM funnel_results WHERE funnel_id = v_funnel_id;

  -- Generate 30 days of data
  FOR v_day IN
    SELECT generate_series(
      CURRENT_DATE - INTERVAL '30 days',
      CURRENT_DATE - INTERVAL '1 day',
      '1 day'::interval
    )::date
  LOOP
    -- Base traffic varies by day (weekday vs weekend pattern)
    v_daily_variation := 0.7 + random() * 0.6;  -- 0.7 to 1.3
    IF EXTRACT(DOW FROM v_day) IN (0, 6) THEN
      v_daily_variation := v_daily_variation * 0.6;  -- weekends are quieter
    END IF;

    v_base_visits := (700 * v_daily_variation)::int;
    v_step_metrics := '[]'::jsonb;
    v_prev_proceeds := v_base_visits;

    -- Build step metrics with realistic drop-off
    FOR v_step_record IN
      SELECT
        (elem->>'position')::int as position,
        elem->>'name' as name,
        ordinality
      FROM jsonb_array_elements(v_steps) WITH ORDINALITY AS elem(elem, ordinality)
      ORDER BY ordinality
    LOOP
      IF v_step_record.ordinality = 1 THEN
        v_visits := v_base_visits;
      ELSE
        v_visits := v_prev_proceeds;
      END IF;

      -- Drop-off rate varies per step position (later steps have lower drop-off)
      CASE v_step_record.ordinality
        WHEN 1 THEN v_proceeds := (v_visits * (0.75 + random() * 0.10))::int;  -- 75-85% proceed
        WHEN 2 THEN v_proceeds := (v_visits * (0.45 + random() * 0.15))::int;  -- 45-60% proceed
        WHEN 3 THEN v_proceeds := (v_visits * (0.60 + random() * 0.15))::int;  -- 60-75% proceed
        WHEN 4 THEN v_proceeds := (v_visits * (0.65 + random() * 0.15))::int;  -- 65-80% proceed
        WHEN 5 THEN v_proceeds := (v_visits * (0.70 + random() * 0.15))::int;  -- 70-85% proceed
        ELSE v_proceeds := (v_visits * (0.70 + random() * 0.15))::int;
      END CASE;

      -- Last step: proceeds = visits (they converted)
      IF v_step_record.ordinality = jsonb_array_length(v_steps) THEN
        v_proceeds := v_visits;
      END IF;

      v_drop_offs := v_visits - v_proceeds;

      v_step_metrics := v_step_metrics || jsonb_build_array(
        jsonb_build_object(
          'step_position', v_step_record.position,
          'step_name', v_step_record.name,
          'visits', v_visits,
          'entries', CASE WHEN v_step_record.ordinality = 1 THEN v_visits ELSE 0 END,
          'proceeds', v_proceeds,
          'drop_offs', v_drop_offs,
          'drop_off_rate', CASE WHEN v_visits > 0 THEN ROUND((v_drop_offs::numeric / v_visits) * 100, 1) ELSE 0 END,
          'skips', 0
        )
      );

      v_prev_proceeds := v_proceeds;
    END LOOP;

    -- Calculate funnel-level metrics
    v_total_entries := v_base_visits;
    v_total_conversions := v_prev_proceeds;

    INSERT INTO funnel_results (
      funnel_id, organization_id,
      period_start, period_end, period_type,
      step_metrics,
      total_entries, total_conversions, conversion_rate,
      computed_at, data_version
    ) VALUES (
      v_funnel_id, v_org_id,
      v_day, v_day, 'day',
      v_step_metrics,
      v_total_entries, v_total_conversions,
      CASE WHEN v_total_entries > 0 THEN ROUND((v_total_conversions::numeric / v_total_entries) * 100, 2) ELSE 0 END,
      now(), 1
    );
  END LOOP;

  RAISE NOTICE 'Inserted 30 days of sample data for funnel %', v_funnel_id;
END $$;
