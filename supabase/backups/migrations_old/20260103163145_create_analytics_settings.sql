-- Migration: Create analytics_settings table
-- Description: Add organization-level analytics settings for conversion tracking
--              Stores publishable keys and allowed hostnames for origin validation

-- analytics_settings table (1:1 with organization)
CREATE TABLE IF NOT EXISTS "public"."analytics_settings" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL,
    "organization_id" uuid NOT NULL UNIQUE,

    -- Publishable Key for client-side SDK
    -- Format: li2_pk_<org_id_first8>_<random_32chars>
    "publishable_key" text NOT NULL,
    "publishable_key_created_at" timestamptz DEFAULT now() NOT NULL,

    -- Allowed hostnames for origin validation
    -- Stores patterns like: ["example.com", "*.example.com"]
    "allowed_hostnames" text[] DEFAULT ARRAY[]::text[],

    CONSTRAINT analytics_settings_org_fkey
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Index for fast lookup by publishable key (used in every tracking request)
CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_settings_pk
    ON analytics_settings(publishable_key);

-- Index for organization lookup
CREATE INDEX IF NOT EXISTS idx_analytics_settings_org_id
    ON analytics_settings(organization_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_analytics_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS analytics_settings_updated_at ON analytics_settings;
CREATE TRIGGER analytics_settings_updated_at
    BEFORE UPDATE ON analytics_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_analytics_settings_updated_at();

-- Grant permissions to service role
GRANT ALL ON analytics_settings TO service_role;
GRANT SELECT ON analytics_settings TO authenticated;
