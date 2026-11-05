-- Migration: Create session_recordings table for rrweb session replay
-- Description: High-volume time-series table with monthly partitioning.
--              Stores compressed rrweb event chunks streamed from recording.global.js.

-- ============================================
-- SESSION_RECORDINGS TABLE (partitioned by month)
-- ============================================
-- One row per flush chunk (~10 s intervals or 500 KB max).
-- Replay is reconstructed by ordering chunks by chunk_index per session_id.

CREATE TABLE "public"."session_recordings" (
    "id"              uuid         DEFAULT gen_random_uuid(),
    "organization_id" uuid         NOT NULL,

    -- Session & Visitor Identity (from SDK)
    "session_id"      varchar(64)  NOT NULL,
    "visitor_id"      varchar(64)  NOT NULL,
    "li2_cid"         varchar(64),

    -- Page context at flush time
    "page_url"        text         NOT NULL,

    -- Chunk ordering & metadata
    "chunk_index"     int          NOT NULL DEFAULT 0,
    "is_first_chunk"  boolean      NOT NULL DEFAULT false,  -- contains rrweb type-2 full snapshot
    "byte_size"       int          NOT NULL DEFAULT 0,

    -- rrweb events stored as JSONB array
    "events"          jsonb        NOT NULL DEFAULT '[]'::jsonb,

    -- Event time window
    "started_at"      timestamptz  NOT NULL,
    "ended_at"        timestamptz  NOT NULL,

    -- Server-enriched (populated by worker)
    "ip"              inet,
    "user_agent"      text,
    "browser"         varchar(64),
    "browser_version" varchar(32),
    "os"              varchar(64),
    "os_version"      varchar(32),
    "device_type"     varchar(16),
    "country"         varchar(2),
    "is_bot"          boolean      NOT NULL DEFAULT false,
    "sdk_version"     varchar(32),

    "created_at"      timestamptz  NOT NULL DEFAULT now(),

    -- Partition key must be part of primary key
    PRIMARY KEY ("id", "created_at")
) PARTITION BY RANGE ("created_at");

-- ============================================
-- PARTITIONS (Apr 2026 - Sep 2026)
-- ============================================

CREATE TABLE "public"."session_recordings_2026_04" PARTITION OF "public"."session_recordings"
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

CREATE TABLE "public"."session_recordings_2026_05" PARTITION OF "public"."session_recordings"
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

CREATE TABLE "public"."session_recordings_2026_06" PARTITION OF "public"."session_recordings"
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

CREATE TABLE "public"."session_recordings_2026_07" PARTITION OF "public"."session_recordings"
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

CREATE TABLE "public"."session_recordings_2026_08" PARTITION OF "public"."session_recordings"
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');

CREATE TABLE "public"."session_recordings_2026_09" PARTITION OF "public"."session_recordings"
    FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');

-- ============================================
-- INDEXES (auto-applied to all partitions)
-- ============================================

-- Primary replay query: all chunks for a session in order
CREATE INDEX idx_srec_org_session_idx ON "public"."session_recordings" ("organization_id", "session_id", "chunk_index");

-- Dashboard listing: recent recordings for an org
CREATE INDEX idx_srec_org_ts ON "public"."session_recordings" ("organization_id", "started_at" DESC);

-- Visitor-level queries
CREATE INDEX idx_srec_org_visitor ON "public"."session_recordings" ("organization_id", "visitor_id", "started_at" DESC);

-- ============================================
-- FOREIGN KEY
-- ============================================

ALTER TABLE "public"."session_recordings"
    ADD CONSTRAINT session_recordings_org_fkey
    FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;

-- ============================================
-- ANALYTICS SETTINGS: add session_recording feature flag default
-- ============================================

UPDATE "public"."analytics_settings"
SET features = features || '{"session_recording": false}'::jsonb
WHERE features IS NOT NULL
  AND NOT (features ? 'session_recording');

