ALTER TABLE public.analytics_settings
  ADD COLUMN IF NOT EXISTS features jsonb NOT NULL DEFAULT '{
    "pageview_tracking": true,
    "click_tracking": true,
    "scroll_tracking": true,
    "form_tracking": true,
    "outbound_tracking": false,
    "visibility_tracking": false
  }'::jsonb,
  ADD COLUMN IF NOT EXISTS tracking jsonb NOT NULL DEFAULT '{
    "cookie_domain": null,
    "cookie_path": "/",
    "cookie_expires_in_days": 365,
    "session_timeout": 1800
  }'::jsonb,
  ADD COLUMN IF NOT EXISTS outbound_domains text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS custom_settings jsonb DEFAULT NULL;
