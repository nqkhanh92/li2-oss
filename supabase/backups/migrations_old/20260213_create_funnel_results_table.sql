-- Migration: Create funnel_results table + register daily funnel cron job
-- Description: Pre-computed funnel metrics cache for retroactive analysis
-- Phase: 5 (Funnel Computation), Task 3

-- ============================================
-- FUNNEL RESULTS TABLE (materialized cache)
-- ============================================

CREATE TABLE "public"."funnel_results" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "funnel_id" uuid NOT NULL,
    "organization_id" uuid NOT NULL,

    -- Time period
    "period_start" date NOT NULL,
    "period_end" date NOT NULL,
    "period_type" varchar(16) NOT NULL,          -- 'day', 'week', 'month'

    -- Step-level metrics (JSONB array)
    "step_metrics" jsonb NOT NULL,

    -- Funnel-level metrics
    "total_entries" integer NOT NULL DEFAULT 0,
    "total_conversions" integer NOT NULL DEFAULT 0,
    "conversion_rate" decimal(5,2) NOT NULL DEFAULT 0,

    -- Processing metadata
    "computed_at" timestamptz NOT NULL DEFAULT now(),
    "data_version" integer NOT NULL DEFAULT 1,

    CONSTRAINT uq_funnel_results_period UNIQUE ("funnel_id", "period_start", "period_end", "period_type")
);

CREATE INDEX idx_funnel_results_lookup
    ON "public"."funnel_results" ("funnel_id", "period_type", "period_start");

CREATE INDEX idx_funnel_results_org
    ON "public"."funnel_results" ("organization_id");

-- ============================================
-- FOREIGN KEYS
-- ============================================

ALTER TABLE "public"."funnel_results"
    ADD CONSTRAINT funnel_results_funnel_fkey
    FOREIGN KEY ("funnel_id") REFERENCES "public"."funnels"("id") ON DELETE CASCADE;

-- ============================================
-- REGISTER DAILY FUNNEL COMPUTATION CRON JOB
-- Runs at 01:05 daily (after session aggregation at 01:00)
-- ============================================

INSERT INTO "public"."system_cronjobs" ("crontab", "key", "enabled", "max_retry")
VALUES ('5 1 * * *', 'task:funnel:daily_compute', true, 3);
