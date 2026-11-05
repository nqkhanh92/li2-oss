ALTER TABLE event_rules
  DROP CONSTRAINT IF EXISTS event_rules_trigger_type_check;

ALTER TABLE event_rules
  ADD CONSTRAINT event_rules_trigger_type_check
  CHECK (trigger_type IN ('click', 'form_submit', 'form_fill', 'element_visibility'));
