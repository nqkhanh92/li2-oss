-- Migration: Create conversion tracking tables
-- Description: Add conversion_events and customer_profiles tables for POC

-- Event type enum for type safety
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'conversion_event_type') THEN
        CREATE TYPE conversion_event_type AS ENUM ('lead', 'sale');
    END IF;
END$$;

-- conversion_events table (supports both leads and sales)
CREATE TABLE IF NOT EXISTS "public"."conversion_events" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "organization_id" uuid NOT NULL,
    "touch_point_id" uuid,
    "visit_id" uuid,
    "click_id" text NOT NULL,

    -- Event identification
    "event_type" conversion_event_type NOT NULL DEFAULT 'lead',
    "event_name" text NOT NULL DEFAULT 'lead',

    -- Customer link
    "customer_profile_id" uuid,

    -- Sale-specific fields (nullable for leads)
    "amount" bigint,
    "currency" text,
    "payment_processor" text,
    "invoice_id" text,
    "lead_event_id" uuid,

    -- Context
    "metadata" jsonb,
    "ip" inet,
    "user_agent" text,
    "referrer" text
);

-- customer_profiles table
CREATE TABLE IF NOT EXISTS "public"."customer_profiles" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL,
    "organization_id" uuid NOT NULL,
    "email" text,
    "phone" text,
    "name" text,
    "external_id" text,
    "avatar_url" text,
    "first_click_id" text,
    "first_touch_point_id" uuid,
    "metadata" jsonb,

    -- Aggregate stats
    "lead_count" int DEFAULT 0,
    "sale_count" int DEFAULT 0,
    "total_revenue" bigint DEFAULT 0
);

-- Add conversion_tracking column to touch_points if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'touch_points'
        AND column_name = 'conversion_tracking'
    ) THEN
        ALTER TABLE "public"."touch_points"
        ADD COLUMN "conversion_tracking" jsonb;
    END IF;
END$$;

-- Indexes for conversion_events
CREATE INDEX IF NOT EXISTS idx_conversion_events_click_id ON conversion_events(click_id);
CREATE INDEX IF NOT EXISTS idx_conversion_events_org_id ON conversion_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversion_events_type ON conversion_events(event_type);
CREATE INDEX IF NOT EXISTS idx_conversion_events_customer ON conversion_events(customer_profile_id);
CREATE INDEX IF NOT EXISTS idx_conversion_events_tp_id ON conversion_events(touch_point_id);
CREATE INDEX IF NOT EXISTS idx_conversion_events_created_at ON conversion_events(created_at DESC);

-- Indexes for customer_profiles
CREATE INDEX IF NOT EXISTS idx_customer_profiles_org_id ON customer_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_created_at ON customer_profiles(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_profiles_org_email
    ON customer_profiles(organization_id, email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_profiles_org_external_id
    ON customer_profiles(organization_id, external_id) WHERE external_id IS NOT NULL;

-- Foreign Keys for conversion_events
ALTER TABLE "public"."conversion_events"
    DROP CONSTRAINT IF EXISTS conversion_events_org_fkey;
ALTER TABLE "public"."conversion_events"
    ADD CONSTRAINT conversion_events_org_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE "public"."conversion_events"
    DROP CONSTRAINT IF EXISTS conversion_events_tp_fkey;
ALTER TABLE "public"."conversion_events"
    ADD CONSTRAINT conversion_events_tp_fkey
    FOREIGN KEY (touch_point_id) REFERENCES touch_points(id) ON DELETE SET NULL;

ALTER TABLE "public"."conversion_events"
    DROP CONSTRAINT IF EXISTS conversion_events_customer_fkey;
ALTER TABLE "public"."conversion_events"
    ADD CONSTRAINT conversion_events_customer_fkey
    FOREIGN KEY (customer_profile_id) REFERENCES customer_profiles(id) ON DELETE SET NULL;

-- Self-referential FK for lead → sale linking
ALTER TABLE "public"."conversion_events"
    DROP CONSTRAINT IF EXISTS conversion_events_lead_fkey;
ALTER TABLE "public"."conversion_events"
    ADD CONSTRAINT conversion_events_lead_fkey
    FOREIGN KEY (lead_event_id) REFERENCES conversion_events(id) ON DELETE SET NULL;

-- Foreign Keys for customer_profiles
ALTER TABLE "public"."customer_profiles"
    DROP CONSTRAINT IF EXISTS customer_profiles_org_fkey;
ALTER TABLE "public"."customer_profiles"
    ADD CONSTRAINT customer_profiles_org_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE "public"."customer_profiles"
    DROP CONSTRAINT IF EXISTS customer_profiles_first_tp_fkey;
ALTER TABLE "public"."customer_profiles"
    ADD CONSTRAINT customer_profiles_first_tp_fkey
    FOREIGN KEY (first_touch_point_id) REFERENCES touch_points(id) ON DELETE SET NULL;

-- -- RLS Policies
-- ALTER TABLE "public"."conversion_events" ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE "public"."customer_profiles" ENABLE ROW LEVEL SECURITY;

-- -- RLS Policy: conversion_events - users can see events for their organization
-- DROP POLICY IF EXISTS "conversion_events_org_access" ON "public"."conversion_events";
-- CREATE POLICY "conversion_events_org_access" ON "public"."conversion_events"
--     FOR ALL
--     USING (
--         organization_id IN (
--             SELECT organization_id FROM profiles WHERE id = auth.uid()
--         )
--     );

-- -- RLS Policy: customer_profiles - users can see profiles for their organization
-- DROP POLICY IF EXISTS "customer_profiles_org_access" ON "public"."customer_profiles";
-- CREATE POLICY "customer_profiles_org_access" ON "public"."customer_profiles"
--     FOR ALL
--     USING (
--         organization_id IN (
--             SELECT organization_id FROM profiles WHERE id = auth.uid()
--         )
--     );

-- Function to increment customer lead count (for atomic updates)
CREATE OR REPLACE FUNCTION increment_customer_lead_count(customer_id uuid)
RETURNS void AS $$
BEGIN
    UPDATE customer_profiles
    SET lead_count = lead_count + 1,
        updated_at = now()
    WHERE id = customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment customer sale count and revenue
CREATE OR REPLACE FUNCTION increment_customer_sale(customer_id uuid, sale_amount bigint)
RETURNS void AS $$
BEGIN
    UPDATE customer_profiles
    SET sale_count = sale_count + 1,
        total_revenue = total_revenue + COALESCE(sale_amount, 0),
        updated_at = now()
    WHERE id = customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION increment_customer_lead_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_customer_lead_count(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION increment_customer_sale(uuid, bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_customer_sale(uuid, bigint) TO service_role;

-- ============================================
-- PLAN FEATURE: Enable conversion_tracking for Premium plans
-- ============================================

-- Add 'conversion_tracking' to Premium plan's advanced_features_allowed
UPDATE plans
SET advanced_features_allowed = array_append(
    COALESCE(advanced_features_allowed, ARRAY[]::text[]),
    'conversion_tracking'
)
WHERE id = '8c337bdb-eb2b-4d27-9814-2f8d520c7e59'  -- PLAN_PREMIUM
  AND NOT ('conversion_tracking' = ANY(COALESCE(advanced_features_allowed, ARRAY[]::text[])));

-- Also add to Premium Trial if it exists
UPDATE plans
SET advanced_features_allowed = array_append(
    COALESCE(advanced_features_allowed, ARRAY[]::text[]),
    'conversion_tracking'
)
WHERE id = '804ad067-6a44-4b20-959a-ed67e670d3d6'  -- PLAN_PREMIUM_TRIAL
  AND NOT ('conversion_tracking' = ANY(COALESCE(advanced_features_allowed, ARRAY[]::text[])));
