-- Migration: Add scroll tracking to interactions table
-- Description: Adds scroll depth, direction, and time-at-depth columns.
--   Reuses the interactions table (no separate table) to share partition
--   infrastructure, enrichment pipeline, and quota tracking.
--   x/y become nullable so scroll events (no click coordinates) can be inserted.
-- Phase: 10 (Click Capture Infrastructure), Task 2 — Scroll Tracking

-- ============================================
-- 1. Make x, y nullable (scroll events have no click coords)
-- ============================================

ALTER TABLE "public"."interactions"
  ALTER COLUMN "x" DROP NOT NULL,
  ALTER COLUMN "y" DROP NOT NULL;

-- ============================================
-- 2. Add scroll-specific columns (nullable, N/A for click events)
-- ============================================

ALTER TABLE "public"."interactions"
  ADD COLUMN IF NOT EXISTS "scroll_depth_percent" smallint,    -- milestone %: 25 | 50 | 75 | 90 | 100
  ADD COLUMN IF NOT EXISTS "scroll_direction"     varchar(4),  -- 'down' | 'up'
  ADD COLUMN IF NOT EXISTS "time_at_depth"        int;         -- ms spent in this depth zone before leaving/scrolling deeper

-- NOTE: scroll_y already exists (was used for scroll position at click time).
--   Reused for scroll events as pixel depth at the moment of milestone crossing.

-- ============================================
-- 3. CHECK constraints to enforce per-type data integrity
-- ============================================

-- click events must have coordinates
ALTER TABLE "public"."interactions"
  ADD CONSTRAINT chk_click_coords
    CHECK (interaction_type != 'click' OR (x IS NOT NULL AND y IS NOT NULL));

-- scroll events must have scroll_depth_percent
ALTER TABLE "public"."interactions"
  ADD CONSTRAINT chk_scroll_depth
    CHECK (interaction_type != 'scroll' OR scroll_depth_percent IS NOT NULL);

-- ============================================
-- 4. RPC: get_scroll_heatmap
-- Returns milestone breakdown for the scroll heatmap dashboard tab
-- and on-site toolbar scroll mode.
-- ============================================

CREATE OR REPLACE FUNCTION get_scroll_heatmap(
  p_organization_id uuid,
  p_page_path       text,
  p_from            timestamptz,
  p_to              timestamptz,
  p_device_type     text DEFAULT NULL,
  p_hostname        text DEFAULT NULL
)
RETURNS TABLE (
  scroll_depth_percent  smallint,
  sessions_reached      bigint,
  avg_time_at_depth     numeric
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    i.scroll_depth_percent,
    COUNT(DISTINCT i.session_id)          AS sessions_reached,
    ROUND(AVG(i.time_at_depth)::numeric, 0) AS avg_time_at_depth
  FROM interactions i
  WHERE i.organization_id    = p_organization_id
    AND i.page_path          = p_page_path
    AND i.interaction_type   = 'scroll'
    AND i.timestamp          >= p_from
    AND i.timestamp          < (p_to::date + interval '1 day')
    AND i.is_bot             = false
    AND (p_device_type IS NULL OR i.device_type = p_device_type)
    AND (p_hostname IS NULL OR i.page_url LIKE '%' || p_hostname || '%')
    AND i.scroll_depth_percent IS NOT NULL
  GROUP BY i.scroll_depth_percent
  ORDER BY i.scroll_depth_percent;
$$;
