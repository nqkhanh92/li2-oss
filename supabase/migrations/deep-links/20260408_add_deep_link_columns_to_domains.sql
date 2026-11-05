-- Migration: Add deep link configuration columns to domains table
-- Phase 1 of the deep links feature.
--
-- deep_link_apps holds the iOS/Android app registry used by li2-be to
-- auto-generate AASA (/.well-known/apple-app-site-association) and
-- assetlinks.json (/.well-known/assetlinks.json) at request time.
--
-- deep_link_landing_page is reserved for Phase 3 (iOS deferred deep link
-- landing page customization) and stays NULL until that phase ships. It is
-- added here to avoid a second migration later.

ALTER TABLE public.domains
ADD COLUMN IF NOT EXISTS deep_link_apps JSONB DEFAULT NULL;

ALTER TABLE public.domains
ADD COLUMN IF NOT EXISTS deep_link_landing_page JSONB DEFAULT NULL;

COMMENT ON COLUMN public.domains.deep_link_apps IS 'Deep link app registry. Contains enabled flag and array of iOS/Android app configs for AASA/assetlinks auto-generation.';
COMMENT ON COLUMN public.domains.deep_link_landing_page IS 'iOS deferred deep link landing page customization. Reserved for Phase 3.';