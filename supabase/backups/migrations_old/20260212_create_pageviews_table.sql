-- Migration: Create pageviews table for landing page analytics
-- Description: High-volume time-series table with monthly partitioning for pageview tracking
-- Phase: 2 (Backend Pageview API), Task 1

-- ============================================
-- PAGEVIEWS TABLE (partitioned by month)
-- ============================================

CREATE TABLE "public"."pageviews" (
    "id" uuid DEFAULT gen_random_uuid(),
    "organization_id" uuid NOT NULL,

    -- Session & Visitor Identity (from SDK)
    "session_id" varchar(64) NOT NULL,
    "visitor_id" varchar(64) NOT NULL,
    "li2_cid" varchar(64),

    -- Page Data
    "page_url" text NOT NULL,
    "page_path" varchar(2048) NOT NULL,
    "page_title" varchar(512),
    "page_referrer" text,
    "page_hash" varchar(512),
    "search_query" varchar(512),

    -- Timing
    "timestamp" timestamptz NOT NULL,           -- Client-side event time (from SDK)
    "time_on_page" int,                         -- Milliseconds on previous page

    -- Client Context (from SDK)
    "screen_width" smallint,
    "screen_height" smallint,
    "viewport_width" smallint,
    "viewport_height" smallint,

    -- Server-enriched (populated by worker, NULL on initial insert)
    "ip" inet,
    "user_agent" text,
    "browser" varchar(64),
    "browser_version" varchar(32),
    "os" varchar(64),
    "os_version" varchar(32),
    "device_type" varchar(16),                  -- desktop, mobile, tablet
    "country" varchar(2),                       -- ISO 3166-1 alpha-2
    "region" varchar(128),
    "city" varchar(128),
    "is_bot" boolean DEFAULT false,

    "created_at" timestamptz NOT NULL DEFAULT now(),

    -- Partition key must be part of primary key
    PRIMARY KEY ("id", "created_at")
) PARTITION BY RANGE ("created_at");

-- ============================================
-- PARTITIONS (Feb 2026 - Jul 2026)
-- ============================================

CREATE TABLE "public"."pageviews_2026_02" PARTITION OF "public"."pageviews"
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

CREATE TABLE "public"."pageviews_2026_03" PARTITION OF "public"."pageviews"
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

CREATE TABLE "public"."pageviews_2026_04" PARTITION OF "public"."pageviews"
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

CREATE TABLE "public"."pageviews_2026_05" PARTITION OF "public"."pageviews"
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

CREATE TABLE "public"."pageviews_2026_06" PARTITION OF "public"."pageviews"
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

CREATE TABLE "public"."pageviews_2026_07" PARTITION OF "public"."pageviews"
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

-- ============================================
-- INDEXES (auto-applied to all partitions)
-- ============================================

-- Primary query: get all pageviews in a session (for funnel matching)
CREATE INDEX idx_pv_org_session ON "public"."pageviews" ("organization_id", "session_id");

-- Visitor history: all sessions for a visitor (for visitor detail view)
CREATE INDEX idx_pv_org_visitor ON "public"."pageviews" ("organization_id", "visitor_id", "timestamp");

-- Page path queries: funnel step pattern matching by path
CREATE INDEX idx_pv_org_path_ts ON "public"."pageviews" ("organization_id", "page_path", "timestamp");

-- Time range queries: dashboard analytics, date filtering
CREATE INDEX idx_pv_org_ts ON "public"."pageviews" ("organization_id", "timestamp");

-- Li2 click ID lookup: link pageviews to short link conversions
CREATE INDEX idx_pv_li2_cid ON "public"."pageviews" ("li2_cid") WHERE "li2_cid" IS NOT NULL;

-- ============================================
-- FOREIGN KEY
-- ============================================

ALTER TABLE "public"."pageviews"
    ADD CONSTRAINT pageviews_org_fkey
    FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
