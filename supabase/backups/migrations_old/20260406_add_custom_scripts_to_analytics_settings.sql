ALTER TABLE analytics_settings
ADD COLUMN IF NOT EXISTS custom_scripts JSONB DEFAULT '[]'::jsonb;
