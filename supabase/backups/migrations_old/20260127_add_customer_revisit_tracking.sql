-- Migration: Add revisit tracking columns to customer_profiles
-- Purpose: Track customer visit frequency and recency for analytics

-- Add revisit tracking columns
ALTER TABLE "public"."customer_profiles"
ADD COLUMN IF NOT EXISTS "last_visit_at" timestamptz,
ADD COLUMN IF NOT EXISTS "visit_count" int DEFAULT 1 NOT NULL;

-- Backfill existing customers with visit_count = 1 (if somehow null after migration)
UPDATE "public"."customer_profiles"
SET visit_count = 1
WHERE visit_count IS NULL;

-- Index for sorting by last activity (most recently active customers)
CREATE INDEX IF NOT EXISTS idx_customer_profiles_last_visit
ON customer_profiles(organization_id, last_visit_at DESC NULLS LAST);

-- Index for visit count queries (most engaged customers)
CREATE INDEX IF NOT EXISTS idx_customer_profiles_visit_count
ON customer_profiles(organization_id, visit_count DESC);

-- Add comments for documentation
COMMENT ON COLUMN customer_profiles.last_visit_at IS 'Timestamp of most recent visit by this customer';
COMMENT ON COLUMN customer_profiles.visit_count IS 'Total number of visits by this customer';
