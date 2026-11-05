import type { FunnelSuggestion, EventRuleSuggestion } from '@/infrastructure/external/claude/claude.types'

export type {
  FunnelStepSuggestion,
  FunnelSuggestion,
  EventRuleSuggestion,
} from '@/infrastructure/external/claude/claude.types'

export interface AnalyzeResponse {
  cache_id: string
  funnel_suggestions: FunnelSuggestion[]
  event_rule_suggestions: EventRuleSuggestion[]
  cached: boolean
  truncated: boolean
  credits_used: 0 | 1
  credits_remaining: number
}

export interface ApplyResponse {
  funnels_created: number
  funnels_skipped: number
  event_rules_created: number
  event_rules_skipped: number
}

export interface SmartSetupStatus {
  has_pending: boolean
  url?: string
  funnel_count?: number
  event_rule_count?: number
  cache_id?: string
  expires_at?: string
}
