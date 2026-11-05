-- Migration: Create funnels and funnel_steps tables
-- Description: Funnel definitions with pattern matching rules for landing page analytics
-- Phase: 4 (Funnel Data Model), Task 1

-- ============================================
-- FUNNELS TABLE (funnel definitions)
-- ============================================

CREATE TABLE "public"."funnels" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "organization_id" uuid NOT NULL,

    "name" varchar(256) NOT NULL,
    "description" text,
    "is_active" boolean DEFAULT true,

    "created_by" uuid,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now(),
    "deleted_at" timestamptz                          -- Soft delete
);

-- Only query active (non-deleted) funnels per org
CREATE INDEX idx_funnels_org ON "public"."funnels" ("organization_id") WHERE "deleted_at" IS NULL;

-- ============================================
-- FUNNEL STEPS TABLE (step definitions with pattern matching)
-- ============================================

CREATE TABLE "public"."funnel_steps" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "funnel_id" uuid NOT NULL,

    "position" smallint NOT NULL,                     -- Step order (1-based)
    "name" varchar(256) NOT NULL,                     -- Display name

    -- Pattern Matching
    "pattern_type" varchar(32) NOT NULL,              -- page_path, page_url, page_title, search_query
    "condition" varchar(32) NOT NULL,                 -- contains, equals, starts_with, ends_with, matches_regex
    "pattern" varchar(2048) NOT NULL,                 -- The pattern value

    -- Step Configuration
    "is_required" boolean DEFAULT true,               -- Required step or can be skipped

    "created_at" timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT uq_funnel_steps_position UNIQUE ("funnel_id", "position")
);

CREATE INDEX idx_funnel_steps_funnel ON "public"."funnel_steps" ("funnel_id", "position");

-- ============================================
-- FOREIGN KEYS
-- ============================================

ALTER TABLE "public"."funnels"
    ADD CONSTRAINT funnels_org_fkey
    FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;

ALTER TABLE "public"."funnel_steps"
    ADD CONSTRAINT funnel_steps_funnel_fkey
    FOREIGN KEY ("funnel_id") REFERENCES "public"."funnels"("id") ON DELETE CASCADE;
