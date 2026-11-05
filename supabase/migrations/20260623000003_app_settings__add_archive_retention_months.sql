ALTER TABLE app_settings
ADD COLUMN IF NOT EXISTS archive_retention_months INT NOT NULL DEFAULT 12;
