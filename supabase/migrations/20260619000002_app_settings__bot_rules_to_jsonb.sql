ALTER TABLE app_settings
  ALTER COLUMN bot_ips DROP DEFAULT,
  ALTER COLUMN bot_ips TYPE jsonb USING '[]'::jsonb,
  ALTER COLUMN bot_ips SET DEFAULT '[]'::jsonb,
  ALTER COLUMN bot_useragent_patterns DROP DEFAULT,
  ALTER COLUMN bot_useragent_patterns TYPE jsonb USING '[]'::jsonb,
  ALTER COLUMN bot_useragent_patterns SET DEFAULT '[]'::jsonb;
