-- Migration: Create interactions table for click capture & heatmaps
-- Description: High-volume time-series table with monthly partitioning for auto-captured click data
-- Phase: 10 (Click Capture Infrastructure), Task 1

-- ============================================
-- INTERACTIONS TABLE (partitioned by month)
-- ============================================
-- Separate from pageviews: different volume (10-50x), different retention (30 days),
-- different query patterns (coordinate aggregation vs timeline walk)

CREATE TABLE "public"."interactions" (
    "id" uuid DEFAULT gen_random_uuid(),
    "organization_id" uuid NOT NULL,

    -- Session & Visitor Identity (from SDK, same as pageviews)
    "session_id" varchar(64) NOT NULL,
    "visitor_id" varchar(64) NOT NULL,
    "li2_cid" varchar(64),

    -- Page context
    "page_url" text NOT NULL,
    "page_path" varchar(2048) NOT NULL,

    -- Click coordinates (absolute, scroll-adjusted)
    "x" int NOT NULL,                       -- clientX + scrollX (or clientX if fixed)
    "y" int NOT NULL,                       -- clientY + scrollY (or clientY if fixed)
    "target_fixed" boolean DEFAULT false,   -- element has position: fixed/sticky

    -- Viewport context (for grouping by screen size)
    "viewport_width" smallint NOT NULL,
    "viewport_height" smallint NOT NULL,
    "page_height" int,                      -- document.documentElement.scrollHeight
    "scroll_y" int,                         -- window.scrollY at click time

    -- Element metadata (for element-based analysis + event definitions)
    "element_tag" varchar(32),              -- button, a, input, div, etc.
    "element_text" varchar(256),            -- innerText (truncated to 256 chars)
    "element_href" varchar(2048),           -- href attribute if <a> or link
    "element_class" varchar(512),           -- className (truncated)
    "element_id" varchar(256),              -- id attribute
    "selector_path" varchar(1024),          -- Stable CSS selector path

    -- Interaction type
    "interaction_type" varchar(16) NOT NULL DEFAULT 'click',

    -- Timing
    "timestamp" timestamptz NOT NULL,       -- Client-side event time (from SDK)

    -- Server-enriched (populated by worker, NULL on initial insert)
    "ip" inet,
    "user_agent" text,
    "device_type" varchar(16),              -- desktop, mobile, tablet
    "country" varchar(2),                   -- ISO 3166-1 alpha-2
    "is_bot" boolean DEFAULT false,

    "created_at" timestamptz NOT NULL DEFAULT now(),

    -- Partition key must be part of primary key
    PRIMARY KEY ("id", "created_at")
) PARTITION BY RANGE ("created_at");

-- ============================================
-- PARTITIONS (Feb 2026 - Jul 2026)
-- ============================================

CREATE TABLE "public"."interactions_2026_02" PARTITION OF "public"."interactions"
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

CREATE TABLE "public"."interactions_2026_03" PARTITION OF "public"."interactions"
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

CREATE TABLE "public"."interactions_2026_04" PARTITION OF "public"."interactions"
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

CREATE TABLE "public"."interactions_2026_05" PARTITION OF "public"."interactions"
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

CREATE TABLE "public"."interactions_2026_06" PARTITION OF "public"."interactions"
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

CREATE TABLE "public"."interactions_2026_07" PARTITION OF "public"."interactions"
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

-- ============================================
-- INDEXES (auto-applied to all partitions)
-- ============================================

-- Heatmap queries: all clicks on a page for an org within a date range
CREATE INDEX idx_int_org_page_ts ON "public"."interactions" ("organization_id", "page_path", "timestamp");

-- Session correlation: link clicks to sessions
CREATE INDEX idx_int_org_session ON "public"."interactions" ("organization_id", "session_id");

-- Device filtering: separate heatmaps by device type
CREATE INDEX idx_int_org_device_page ON "public"."interactions" ("organization_id", "device_type", "page_path", "timestamp");

-- ============================================
-- FOREIGN KEY
-- ============================================

ALTER TABLE "public"."interactions"
    ADD CONSTRAINT interactions_org_fkey
    FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;

-- ============================================
-- PAGEVIEWS: Add event_name support (for Phase 11)
-- ============================================
-- event_name IS NULL = regular pageview (existing behavior)
-- event_name IS NOT NULL = named event (new, for event-driven funnels)

ALTER TABLE "public"."pageviews" ADD COLUMN IF NOT EXISTS "event_name" varchar(256);
ALTER TABLE "public"."pageviews" ADD COLUMN IF NOT EXISTS "event_category" varchar(128);
