import { SmartSetupRepository, smartSetupRepo } from '../repositories/smart-setup.repository'
import { analyzeWebsite } from '@/infrastructure/external/claude/claude.client'
import { preprocessHtml, isHtmlTooSmall } from '@/features/smart-setup/utils/html-preprocessor'
import { ensureOrgMember, getPermissionScopeOrThrow } from '@/shared/lib/permission/permissions'
import { ensureOrgPlan } from '@/shared/lib/plan/plans'
import { ADVANCED_FEATURE_KEYS } from '@/shared/types/plan-permission'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'
import { orgCreditService } from '@/core/services/billing-usage/org-credit.service'
import { isCloud, UNMETERED_AI_CREDITS } from '@/shared/constants/edition'
import { funnelService } from './funnel.service'
import { eventRuleService } from './event-rule.service'
import { createEventRuleSchema } from '@/shared/schemas/event-rules'
import type { SupportedLocale, FunnelSuggestion, EventRuleSuggestion } from '@/infrastructure/external/claude/claude.types'

const FETCH_TIMEOUT_MS = 10_000
const SOURCE_AI_SUGGESTION = 'ai_suggestion'

export class SmartSetupService {
  constructor(private repo: SmartSetupRepository) {}

  async analyze(orgId: string, url: string, locale: SupportedLocale, force: boolean) {
    await ensureOrgMember(orgId)
    await ensureOrgPlan(orgId, ADVANCED_FEATURE_KEYS.SMART_SETUP)

    const urlHash = this.repo.computeUrlHash(orgId, url)
    const existing = await this.repo.findByUrlHash(orgId, urlHash)

    if (!force && existing?.isFresh) {
      const credits = isCloud ? await orgCreditService.getOrgCredit(orgId) : null
      return {
        cache_id: existing.id,
        funnel_suggestions: existing.funnel_suggestions,
        event_rule_suggestions: existing.event_rule_suggestions,
        cached: true,
        truncated: false,
        credits_used: 0 as const,
        credits_remaining: credits?.ai_credits_balance ?? UNMETERED_AI_CREDITS,
      }
    }

    const isFirst = !existing

    // Bản OSS dùng khoá LLM của chính người vận hành — không đo tín dụng. Xem edition.ts.
    if (isCloud && !isFirst && force) {
      const credits = await orgCreditService.getOrgCredit(orgId)
      if (credits.ai_credits_balance < 1) {
        throw new SmartSetupError(
          'INSUFFICIENT_CREDITS',
          'You\'ve used all your AI credits. Upgrade your plan for more.'
        )
      }
      await orgCreditService.reduceOrgCredit(orgId, 1)
    }

    const rawHtml = await this.fetchHtml(url)
    const { html, title, description, truncated } = preprocessHtml(rawHtml)

    if (isHtmlTooSmall(html)) {
      throw new SmartSetupError(
        'PAGE_TOO_SMALL',
        'This page doesn\'t have enough content to analyze. Try a different page.'
      )
    }

    const result = await analyzeWebsite(html, url, locale, { title, description })

    const cached = await this.repo.upsert(
      orgId,
      url,
      urlHash,
      result.funnel_suggestions,
      result.event_rule_suggestions,
      locale
    )

    const credits = isCloud ? await orgCreditService.getOrgCredit(orgId) : null

    return {
      cache_id: cached.id,
      funnel_suggestions: result.funnel_suggestions,
      event_rule_suggestions: result.event_rule_suggestions,
      cached: false,
      truncated,
      credits_used: (isFirst ? 0 : 1) as 0 | 1,
      credits_remaining: credits?.ai_credits_balance ?? UNMETERED_AI_CREDITS,
    }
  }

  async apply(
    orgId: string,
    userId: string,
    cacheId: string,
    selectedFunnels: number[],
    selectedEventRules: number[]
  ) {
    await ensureOrgMember(orgId)

    const cache = await this.repo.findById(cacheId, orgId)
    const funnelSuggestions = (cache.funnel_suggestions as unknown as FunnelSuggestion[]) || []
    const eventRuleSuggestions = (cache.event_rule_suggestions as unknown as EventRuleSuggestion[]) || []

    // Pre-flight checks: verify permissions before creating anything
    // This prevents partial-persist failures (some created, some fail)
    if (selectedFunnels.length > 0) {
      await getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.ADD_FUNNEL)
    }
    if (selectedEventRules.length > 0) {
      await ensureOrgPlan(orgId, ADVANCED_FEATURE_KEYS.EVENT_TAGGING)
    }

    // Query existing items to skip duplicates (idempotent apply)
    const existingFunnels = await funnelService.findAll(orgId)
    const existingFunnelNames = new Set(
      (existingFunnels.data ?? []).map((f) => f.name.toLowerCase())
    )

    const existingRules = await eventRuleService.findAll(orgId)
    const existingRuleNames = new Set(
      (existingRules ?? []).map((r) => r.name.toLowerCase())
    )

    let funnelsCreated = 0
    let funnelsSkipped = 0

    for (const idx of selectedFunnels) {
      if (idx < 0 || idx >= funnelSuggestions.length) continue
      const suggestion = funnelSuggestions[idx]

      if (existingFunnelNames.has(suggestion.name.toLowerCase())) {
        funnelsSkipped++
        continue
      }

      const steps = suggestion.steps.map((step) => ({
        position: step.position,
        name: step.name,
        pattern_type: step.pattern_type,
        condition: step.condition,
        pattern: step.pattern,
        is_required: step.is_required,
      }))

      await funnelService.create(
        orgId,
        userId,
        { name: suggestion.name, description: suggestion.description },
        steps,
        SOURCE_AI_SUGGESTION
      )
      funnelsCreated++
    }

    let eventRulesCreated = 0
    let eventRulesSkipped = 0

    for (const idx of selectedEventRules) {
      if (idx < 0 || idx >= eventRuleSuggestions.length) continue
      const suggestion = eventRuleSuggestions[idx]

      if (existingRuleNames.has(suggestion.name.toLowerCase())) {
        eventRulesSkipped++
        continue
      }

      // Validate AI suggestion against Zod schema (handles all trigger type constraints)
      // safeParse skips invalid combos silently (e.g. click with no criteria, visibility without selector)
      const parsed = createEventRuleSchema.safeParse({
        name: suggestion.name,
        description: suggestion.description ?? undefined,
        trigger_type: suggestion.trigger_type,
        selector_path: suggestion.selector_path ?? undefined,
        element_text: suggestion.element_text ?? undefined,
        element_id: suggestion.element_id ?? undefined,
        element_href: suggestion.element_href ?? undefined,
        form_id: suggestion.form_id ?? undefined,
        form_name: suggestion.form_name ?? undefined,
        form_action: suggestion.form_action ?? undefined,
        page_path: suggestion.page_path ?? undefined,
        text_match_mode: 'contains',
      })

      if (!parsed.success) continue

      await eventRuleService.create(orgId, userId, parsed.data, SOURCE_AI_SUGGESTION)
      eventRulesCreated++
    }

    await this.repo.markApplied(cacheId, selectedFunnels, selectedEventRules)

    return {
      funnels_created: funnelsCreated,
      funnels_skipped: funnelsSkipped,
      event_rules_created: eventRulesCreated,
      event_rules_skipped: eventRulesSkipped,
    }
  }

  async getStatus(orgId: string) {
    await ensureOrgMember(orgId)

    const pending = await this.repo.findPending(orgId)
    if (!pending) {
      return { has_pending: false }
    }

    const funnelSuggestions = (pending.funnel_suggestions as unknown as FunnelSuggestion[]) || []
    const eventRuleSuggestions = (pending.event_rule_suggestions as unknown as EventRuleSuggestion[]) || []

    return {
      has_pending: true,
      url: pending.url,
      funnel_count: funnelSuggestions.length,
      event_rule_count: eventRuleSuggestions.length,
      cache_id: pending.id,
      expires_at: pending.expires_at,
    }
  }

  private async fetchHtml(url: string): Promise<string> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Li2Bot/1.0 (https://li2.ai; analytics setup)',
          Accept: 'text/html',
        },
      })

      if (!response.ok) {
        throw new SmartSetupError(
          'FETCH_FAILED',
          `We couldn't reach this website (HTTP ${response.status}). Please check the URL and try again.`
        )
      }

      return await response.text()
    } catch (error: any) {
      if (error instanceof SmartSetupError) throw error
      if (error.name === 'AbortError') {
        throw new SmartSetupError(
          'FETCH_TIMEOUT',
          'The website took too long to respond. Please check the URL and try again.'
        )
      }
      throw new SmartSetupError(
        'FETCH_FAILED',
        'We couldn\'t reach this website. Please check the URL and try again.'
      )
    } finally {
      clearTimeout(timeout)
    }
  }

}

export class SmartSetupError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message)
    this.name = 'SmartSetupError'
  }
}

export const smartSetupService =
  process.env.NODE_ENV !== 'production'
    ? new SmartSetupService(smartSetupRepo)
    : (globalThis._smartSetupService ?? (globalThis._smartSetupService = new SmartSetupService(smartSetupRepo)))
