export type EventRuleTriggerType = 'click' | 'form_submit' | 'form_fill' | 'element_visibility'

export type EventRule = {
  id: string
  organization_id: string
  name: string
  description: string | null
  trigger_type: EventRuleTriggerType
  // Click-specific criteria
  selector_path: string | null
  element_text: string | null
  element_id: string | null
  element_href: string | null
  text_match_mode: 'equals' | 'contains'
  // Form-specific criteria
  form_id: string | null
  form_name: string | null
  form_action: string | null
  // Shared
  page_path: string | null
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}
