-- Migration: Create sessions table for server-side session aggregation
-- Description: Pre-aggregated session data computed from pageviews, used for funnel analysis
-- Phase: 3 (Session Management), Task 1

-- ============================================
-- SESSIONS TABLE
-- ============================================

CREATE TABLE "public"."sessions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "organization_id" uuid NOT NULL,
    "session_id" varchar(64) NOT NULL,
    "visitor_id" varchar(64) NOT NULL,
    "li2_cid" varchar(64),

    -- Session Timing
    "started_at" timestamptz NOT NULL,
    "ended_at" timestamptz,
    "duration_ms" bigint DEFAULT 0,
    "page_count" int DEFAULT 0,

    -- Entry/Exit
    "entry_page" varchar(2048),
    "entry_url" text,
    "exit_page" varchar(2048),
    "exit_url" text,

    -- External Referrer
    "referrer" text,
    "referrer_domain" varchar(256),

    -- UTM (from first pageview with UTM params)
    "utm_source" varchar(256),
    "utm_medium" varchar(256),
    "utm_campaign" varchar(256),
    "utm_term" varchar(256),
    "utm_content" varchar(256),

    -- Flags
    "is_bounce" boolean DEFAULT false,
    "is_bot" boolean DEFAULT false,

    -- Device (from first pageview)
    "browser" varchar(64),
    "browser_version" varchar(32),
    "os" varchar(64),
    "os_version" varchar(32),
    "device_type" varchar(16),
    "country" varchar(2),
    "region" varchar(128),
    "city" varchar(128),

    -- Aggregation tracking
    "last_pageview_at" timestamptz,

    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT uq_sessions_session_id UNIQUE ("session_id")
);

-- ============================================
-- INDEXES
-- ============================================

-- Primary query: sessions in date range for funnel computation
CREATE INDEX idx_sessions_org_started ON "public"."sessions" ("organization_id", "started_at");

-- Visitor history: all sessions for a visitor
CREATE INDEX idx_sessions_org_visitor ON "public"."sessions" ("organization_id", "visitor_id");

-- Entry/exit page analytics
CREATE INDEX idx_sessions_org_entry ON "public"."sessions" ("organization_id", "entry_page");
CREATE INDEX idx_sessions_org_exit ON "public"."sessions" ("organization_id", "exit_page");

-- Bounce rate queries
CREATE INDEX idx_sessions_org_bounce ON "public"."sessions" ("organization_id", "is_bounce") WHERE "is_bounce" = true;

-- ============================================
-- FOREIGN KEY
-- ============================================

ALTER TABLE "public"."sessions"
    ADD CONSTRAINT sessions_org_fkey
    FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;

-- ============================================
-- CRON JOB: Register session aggregation task (every 1 minute)
-- ============================================

INSERT INTO "public"."system_cronjobs" ("crontab", "key", "enabled", "max_retry")
VALUES ('*/1 * * * *', 'task:session:aggregate', true, 3);
