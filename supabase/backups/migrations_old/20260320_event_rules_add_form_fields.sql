-- Add trigger_type and form-specific matching fields to event_rules
-- trigger_type defaults to 'click' so all existing rules keep working

ALTER TABLE event_rules
  ADD COLUMN IF NOT EXISTS trigger_type varchar(16) NOT NULL DEFAULT 'click',
  ADD COLUMN IF NOT EXISTS form_id      varchar(256),
  ADD COLUMN IF NOT EXISTS form_name    varchar(256),
  ADD COLUMN IF NOT EXISTS form_action  varchar(2048);

-- Add index for form-trigger rule lookups
CREATE INDEX IF NOT EXISTS idx_event_rules_org_trigger
  ON event_rules (organization_id, trigger_type)
  WHERE is_active = true;
