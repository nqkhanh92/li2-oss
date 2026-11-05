ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS bot_ips text[] DEFAULT '{}';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS bot_useragent_patterns text[] DEFAULT '{}';
