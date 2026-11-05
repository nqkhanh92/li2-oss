-- Deep Link Events table (Phase 2 of deep-links feature)
-- Append-only log of deep link attribution events.
-- Written by POST /track/open in li2-be.
-- Read by deep link analytics widgets (Phase 5).

CREATE TABLE IF NOT EXISTS deep_link_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  touch_point_id UUID REFERENCES touch_points(id) ON DELETE SET NULL,
  click_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('app_open', 'deferred_match', 'deferred_miss')),
  match_method TEXT CHECK (match_method IN ('universal_link', 'app_link', 'clipboard', 'ip', 'install_referrer')),
  platform TEXT CHECK (platform IN ('ios', 'android')),
  ip INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_deep_link_events_click_id
  ON deep_link_events(click_id);

CREATE INDEX IF NOT EXISTS idx_deep_link_events_org_created
  ON deep_link_events(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_deep_link_events_tp_created
  ON deep_link_events(touch_point_id, created_at DESC)
  WHERE touch_point_id IS NOT NULL;

COMMENT ON TABLE deep_link_events IS
  'Append-only log of deep link attribution events. Written by /track/open. Read by deep link analytics widgets (Phase 5).';
COMMENT ON COLUMN deep_link_events.click_id IS
  'Opaque 16-char base62 token returned to the mobile SDK. Used for conversion attribution starting Phase 2.5.';
COMMENT ON COLUMN deep_link_events.touch_point_id IS
  'NULL for IP-matched deferred events where the slug is unknown (Phase 3).';
COMMENT ON COLUMN deep_link_events.match_method IS
  'How the open was resolved to the original click. NULL when unknown.';

-- Access control lives at the application layer (li2-be + li2-app both use
-- the Supabase service role). No RLS policies on this table.

-- Plan feature flag: deep_link_attribution
-- Starter (t0) does NOT get this flag. Pro (t1, t1_trial) and Business (t2) do.
-- Deferred deep linking (Phase 3) is a separate flag added in Phase 3's migration.
UPDATE plans
SET advanced_features_allowed = array_append(
    COALESCE(advanced_features_allowed, ARRAY[]::text[]),
    'deep_link_attribution'
  )
WHERE plan_key IN ('t1', 't1_trial', 't2')
  AND NOT ('deep_link_attribution' = ANY(COALESCE(advanced_features_allowed, ARRAY[]::text[])));
