-- Smart Setup: AI-powered analytics configuration
-- Creates cache table for AI suggestions and adds source tracking to funnels/event_rules

-- 1. Cache table for AI analysis results
CREATE TABLE IF NOT EXISTS smart_setup_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  url_hash VARCHAR(64) NOT NULL,
  funnel_suggestions JSONB NOT NULL DEFAULT '[]'::jsonb,
  event_rule_suggestions JSONB NOT NULL DEFAULT '[]'::jsonb,
  first_analyzed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locale VARCHAR(5) NOT NULL DEFAULT 'en',
  applied_at TIMESTAMPTZ,
  applied_funnel_indices JSONB,
  applied_event_rule_indices JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,

  UNIQUE(organization_id, url_hash)
);

CREATE INDEX idx_smart_setup_cache_lookup
  ON smart_setup_cache(organization_id, url_hash, expires_at);

CREATE INDEX idx_smart_setup_cache_pending
  ON smart_setup_cache(organization_id, applied_at)
  WHERE applied_at IS NULL;

-- 2. Source tracking on funnels
ALTER TABLE funnels
  ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'manual';

-- 3. Source tracking on event_rules
ALTER TABLE event_rules
  ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'manual';
