-- Add thumbnail_url to dashboards table for screenshot previews
ALTER TABLE dashboards
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT DEFAULT NULL;
