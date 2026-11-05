-- Migration: Add auto_events field to analytics_settings
-- Description: Add JSONB field to store automatic event tracking configurations
--              for lead and sale events based on user interactions

-- Add auto_events column to analytics_settings table
ALTER TABLE "public"."analytics_settings"
ADD COLUMN IF NOT EXISTS "auto_events" jsonb DEFAULT '[]'::jsonb NOT NULL;

-- Add index for faster queries on auto_events
CREATE INDEX IF NOT EXISTS idx_analytics_settings_auto_events
    ON analytics_settings USING GIN (auto_events);

-- Add comment to document the column
COMMENT ON COLUMN analytics_settings.auto_events IS 
'Stores automatic event tracking configurations. Each event contains:
- id: unique identifier
- name: event name
- enabled: whether the event is active
- trigger: { type, conditions[] } - defines when the event fires
- action: { type (lead/sale), customData } - defines what happens';
