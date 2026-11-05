// Types matching Claude tool use input schemas

export interface FunnelStepSuggestion {
  position: number
  name: string
  pattern_type: 'page_path' | 'page_url' | 'page_title' | 'event'
  condition: 'contains' | 'equals' | 'starts_with' | 'ends_with' | 'matches_regex'
  pattern: string
  is_required: boolean
}

export interface FunnelSuggestion {
  name: string
  description: string
  steps: FunnelStepSuggestion[]
}

export interface EventRuleSuggestion {
  name: string
  description: string
  trigger_type: 'click' | 'form_submit' | 'form_fill' | 'element_visibility'
  // Shared
  page_path?: string
  // Click-specific
  selector_path?: string
  element_text?: string
  element_id?: string
  element_href?: string
  // Form-specific (form_submit / form_fill)
  form_id?: string
  form_name?: string
  form_action?: string
}

export interface SmartSetupAnalysisResult {
  funnel_suggestions: FunnelSuggestion[]
  event_rule_suggestions: EventRuleSuggestion[]
}

export type SupportedLocale = 'en' | 'vi'

// ── Conversion script suggestions ────────────────────────────────────────────

export interface ConversionSuggestedParam {
  /** Exact SDK param name: eventName | customerEmail | customerName | customerExternalId | phone | amount | invoiceId | currency | paymentProcessor */
  sdk_param: string
  /** How the value is sourced */
  source_type: 'selector' | 'js_expression' | 'static'
  /** CSS selector, JS expression, or static string value */
  value: string
  /** Human-readable label, e.g. "Email input" */
  description: string
}

export interface ConversionTrigger {
  type: 'form_submit' | 'button_click' | 'page_visit' | 'element_visible'
  /** CSS selector for form/button */
  selector?: string
  /** URL path to watch, e.g. "/thank-you" */
  page_path?: string
  /** Text content to detect for element_visible trigger */
  element_text?: string
}

export interface ConversionScriptSuggestion {
  name: string
  /** Natural-language description, e.g. "When user submits contact form on /contact" */
  description: string
  event_type: 'lead' | 'sale'
  /** Default snake_case event name */
  event_name: string
  trigger: ConversionTrigger
  suggested_params: ConversionSuggestedParam[]
}

export interface ConversionAnalysisResult {
  suggestions: ConversionScriptSuggestion[]
}
