-- Seed script: Insert sample sessions, pageviews, and session_funnel_results
-- for testing the Visitor Detail panel (Phase 8).
-- Run manually in Supabase SQL Editor.
--
-- Prerequisites:
--   - A funnel with steps must already exist
--   - Run seed-funnel-results.sql first if funnel_results are empty

DO $$
DECLARE
  v_funnel_id uuid;
  v_org_id uuid;
  v_steps jsonb;
  v_total_steps int;
  v_session_idx int;
  v_session_id text;
  v_visitor_id text;
  v_started_at timestamptz;
  v_reached_step int;
  v_page_idx int;
  v_page_url text;
  v_page_path text;
  v_page_title text;
  v_step_record record;
  v_browser text;
  v_os text;
  v_device_type text;
  v_country text;
  v_city text;
  v_referrer_domain text;
  v_period_start date;
  v_period_end date;
  -- Arrays for random metadata
  v_browsers text[] := ARRAY['Chrome', 'Firefox', 'Safari', 'Edge', 'Opera'];
  v_oses text[] := ARRAY['Windows', 'macOS', 'Linux', 'iOS', 'Android'];
  v_devices text[] := ARRAY['desktop', 'desktop', 'desktop', 'mobile', 'mobile', 'tablet'];
  v_countries text[] := ARRAY['US', 'US', 'US', 'GB', 'DE', 'FR', 'JP', 'VN', 'AU', 'CA'];
  v_cities text[] := ARRAY['New York', 'San Francisco', 'London', 'Berlin', 'Paris', 'Tokyo', 'Ho Chi Minh', 'Sydney', 'Toronto', 'Chicago'];
  v_referrers text[] := ARRAY['google.com', 'google.com', 'facebook.com', 'twitter.com', 'linkedin.com', NULL, NULL, 'reddit.com', 'bing.com', NULL];
  -- Pages that might exist in a typical funnel
  v_extra_pages text[] := ARRAY['/blog/getting-started', '/about', '/pricing', '/features', '/contact', '/docs/api', '/help/faq'];
BEGIN
  -- 1. Find the most recent active funnel
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

  -- 2. Get ordered steps with their patterns
  SELECT jsonb_agg(
    jsonb_build_object(
      'position', fs.position,
      'name', fs.name,
      'pattern_type', fs.pattern_type,
      'pattern', fs.pattern,
      'is_required', fs.is_required
    ) ORDER BY fs.position
  )
  INTO v_steps
  FROM funnel_steps fs
  WHERE fs.funnel_id = v_funnel_id;

  v_total_steps := jsonb_array_length(v_steps);
  RAISE NOTICE 'Funnel has % steps: %', v_total_steps, v_steps;

  -- Period: Feb 1 to today (pageviews table only has partitions from Feb 2026)
  v_period_start := DATE '2026-02-01';
  v_period_end := CURRENT_DATE;

  -- 3. Clean up previous seed data (only our seeded sessions)
  DELETE FROM session_funnel_results
  WHERE funnel_id = v_funnel_id
    AND period_start >= v_period_start;

  -- 4. Generate ~150 sessions spread over the period
  FOR v_session_idx IN 1..150 LOOP
    -- Random session/visitor IDs
    v_session_id := 'seed-sess-' || lpad(v_session_idx::text, 4, '0') || '-' || substr(md5(random()::text), 1, 8);
    v_visitor_id := 'seed-vis-' || lpad((v_session_idx % 80 + 1)::text, 3, '0');  -- ~80 unique visitors (some return)

    -- Random start time within period (clamped to not exceed today)
    v_started_at := v_period_start + (random() * (v_period_end - v_period_start)) * INTERVAL '1 day'
                    + (random() * 16 + 6) * INTERVAL '1 hour';  -- 6am-10pm
    -- Ensure we don't go past now
    IF v_started_at > now() THEN
      v_started_at := now() - INTERVAL '1 hour';
    END IF;

    -- Random metadata
    v_browser := v_browsers[1 + floor(random() * array_length(v_browsers, 1))::int];
    v_os := v_oses[1 + floor(random() * array_length(v_oses, 1))::int];
    v_device_type := v_devices[1 + floor(random() * array_length(v_devices, 1))::int];
    v_country := v_countries[1 + floor(random() * array_length(v_countries, 1))::int];
    v_city := v_cities[1 + floor(random() * array_length(v_cities, 1))::int];
    v_referrer_domain := v_referrers[1 + floor(random() * array_length(v_referrers, 1))::int];

    -- Determine how far this visitor reaches in the funnel
    -- Distribution: ~30% reach step 1, ~25% reach step 2, etc. decreasing
    -- ~15% complete all steps
    IF random() < 0.15 THEN
      v_reached_step := v_total_steps;  -- completed
    ELSIF random() < 0.25 THEN
      v_reached_step := GREATEST(1, v_total_steps - 1);
    ELSIF random() < 0.40 THEN
      v_reached_step := GREATEST(1, floor(v_total_steps * 0.5)::int);
    ELSIF random() < 0.70 THEN
      v_reached_step := GREATEST(1, floor(v_total_steps * 0.3)::int);
    ELSE
      v_reached_step := 1;
    END IF;

    -- Clamp
    v_reached_step := LEAST(v_reached_step, v_total_steps);

    -- 5. Insert pageviews for this session (one per step reached + some extra)
    -- First, insert pageviews matching funnel steps
    FOR v_step_record IN
      SELECT
        (elem->>'position')::int as position,
        elem->>'name' as name,
        elem->>'pattern' as pattern,
        elem->>'pattern_type' as pattern_type,
        ordinality
      FROM jsonb_array_elements(v_steps) WITH ORDINALITY AS elem(elem, ordinality)
      WHERE (elem->>'position')::int <= v_reached_step
      ORDER BY ordinality
    LOOP
      -- Build a page URL from the step pattern
      v_page_path := v_step_record.pattern;
      -- If pattern is not a path, make it one
      IF left(v_page_path, 1) != '/' THEN
        v_page_path := '/' || v_page_path;
      END IF;
      v_page_url := 'https://example.com' || v_page_path;
      v_page_title := initcap(replace(replace(v_page_path, '/', ' '), '-', ' '));

      INSERT INTO pageviews (
        organization_id, session_id, visitor_id,
        page_url, page_path, page_title,
        timestamp, time_on_page,
        browser, browser_version, os, os_version, device_type,
        country, city, is_bot, created_at
      ) VALUES (
        v_org_id, v_session_id, v_visitor_id,
        v_page_url, v_page_path, v_page_title,
        v_started_at + (v_step_record.ordinality - 1) * INTERVAL '30 seconds' * (1 + random() * 4),
        (5000 + random() * 60000)::int,  -- 5-65 seconds on page
        v_browser, '120.0', v_os, '14.0', v_device_type,
        v_country, v_city, false, v_started_at
      );
    END LOOP;

    -- Optionally add 1-2 extra non-funnel pageviews
    IF random() < 0.4 THEN
      v_page_path := v_extra_pages[1 + floor(random() * array_length(v_extra_pages, 1))::int];
      v_page_url := 'https://example.com' || v_page_path;
      INSERT INTO pageviews (
        organization_id, session_id, visitor_id,
        page_url, page_path, page_title,
        timestamp, time_on_page,
        browser, browser_version, os, os_version, device_type,
        country, city, is_bot, created_at
      ) VALUES (
        v_org_id, v_session_id, v_visitor_id,
        v_page_url, v_page_path, initcap(replace(v_page_path, '/', ' ')),
        v_started_at + (v_reached_step + 1) * INTERVAL '45 seconds',
        (3000 + random() * 30000)::int,
        v_browser, '120.0', v_os, '14.0', v_device_type,
        v_country, v_city, false, v_started_at
      );
    END IF;

    -- 6. Insert session record
    INSERT INTO sessions (
      organization_id, session_id, visitor_id,
      started_at, ended_at, duration_ms, page_count,
      entry_page, entry_url,
      exit_page, exit_url,
      referrer_domain,
      is_bounce, is_bot,
      browser, browser_version, os, os_version, device_type,
      country, city,
      last_pageview_at
    ) VALUES (
      v_org_id, v_session_id, v_visitor_id,
      v_started_at,
      v_started_at + (v_reached_step * 30 + random() * 120) * INTERVAL '1 second',
      (v_reached_step * 30000 + random() * 120000)::bigint,
      v_reached_step + CASE WHEN random() < 0.4 THEN 1 ELSE 0 END,
      (v_steps->0->>'pattern'),
      'https://example.com' || (v_steps->0->>'pattern'),
      CASE WHEN v_reached_step = v_total_steps
        THEN (v_steps->(v_total_steps - 1)->>'pattern')
        ELSE (v_steps->(v_reached_step - 1)->>'pattern')
      END,
      'https://example.com' || COALESCE(v_steps->(v_reached_step - 1)->>'pattern', '/'),
      v_referrer_domain,
      v_reached_step = 1 AND random() < 0.3,
      false,
      v_browser, '120.0', v_os, '14.0', v_device_type,
      v_country, v_city,
      v_started_at + (v_reached_step * 30 + random() * 60) * INTERVAL '1 second'
    )
    ON CONFLICT (session_id) DO UPDATE SET
      ended_at = EXCLUDED.ended_at,
      duration_ms = EXCLUDED.duration_ms,
      page_count = EXCLUDED.page_count;

    -- 7. Insert session_funnel_result
    INSERT INTO session_funnel_results (
      funnel_id, organization_id,
      session_id, visitor_id,
      reached_step, total_steps,
      dropped_off, completed,
      period_start, period_end
    ) VALUES (
      v_funnel_id, v_org_id,
      v_session_id, v_visitor_id,
      v_reached_step, v_total_steps,
      v_reached_step < v_total_steps,
      v_reached_step = v_total_steps,
      v_started_at::date, v_started_at::date
    )
    ON CONFLICT (funnel_id, session_id, period_start) DO UPDATE SET
      reached_step = EXCLUDED.reached_step,
      total_steps = EXCLUDED.total_steps,
      dropped_off = EXCLUDED.dropped_off,
      completed = EXCLUDED.completed;

  END LOOP;

  RAISE NOTICE 'Inserted 150 sessions with pageviews and funnel walk results for funnel %', v_funnel_id;
END $$;
