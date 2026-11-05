'use client'

import { useState, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/components/ui/button'
import { Sparkles, AlertTriangle, RefreshCw, CheckCircle2, ArrowRight, Funnel, Zap } from 'lucide-react'
import { useAnalyzeWebsite, useApplySmartSetup } from '../hooks/queries'
import { FunnelSuggestionCard } from './funnel-suggestion-card'
import { EventRuleSuggestionCard } from './event-rule-suggestion-card'
import { SmartSetupLoading } from './smart-setup-loading'
import { sanitizeUrl } from '../utils/sanitize-url'
import { useGetFunnels } from '@/ee/features/funnels/hooks/queries'
import { useGetEventRules } from '@/ee/features/event-rules/hooks/queries'
import type { AnalyzeResponse } from '../types'

interface SmartSetupResultsProps {
  orgId: string
  initialUrl?: string
  locale: 'en' | 'vi'
  onComplete?: () => void
  onSkip?: () => void
}

export function SmartSetupResults({
  orgId,
  initialUrl = '',
  locale,
  onComplete,
  onSkip,
}: SmartSetupResultsProps) {
  const { t } = useTranslation('smart_setup')
  const [url, setUrl] = useState(initialUrl)
  const [urlError, setUrlError] = useState<string | null>(null)
  const [result, setResult] = useState<AnalyzeResponse | null>(null)
  const [selectedFunnels, setSelectedFunnels] = useState<Set<number>>(new Set())
  const [selectedRules, setSelectedRules] = useState<Set<number>>(new Set())
  const [appliedCounts, setAppliedCounts] = useState<{
    funnels: number
    rules: number
    funnelsSkipped: number
    rulesSkipped: number
  } | null>(null)

  const { data: funnelsData } = useGetFunnels(orgId)
  const { data: eventRulesData } = useGetEventRules(orgId)

  const existingFunnelNames = useMemo(
    () => new Set((funnelsData?.data ?? []).map((f) => f.name.toLowerCase())),
    [funnelsData]
  )
  const existingRuleNames = useMemo(
    () => new Set((eventRulesData?.data ?? []).map((r) => r.name.toLowerCase())),
    [eventRulesData]
  )

  const analyzeMutation = useAnalyzeWebsite(orgId)
  const applyMutation = useApplySmartSetup(orgId)

  const handleUrlChange = (raw: string) => {
    setUrl(raw)
    setUrlError(null)
  }

  const handleUrlBlur = () => {
    if (!url.trim()) return
    const { url: sanitized, error } = sanitizeUrl(url)
    if (sanitized !== url) setUrl(sanitized)
    setUrlError(error)
  }

  const handleAnalyze = useCallback(
    async (force = false) => {
      if (!url.trim()) return
      // Sanitize before sending
      const { url: sanitized, error } = sanitizeUrl(url)
      if (error) {
        setUrlError(error)
        return
      }
      if (sanitized !== url) setUrl(sanitized)
      setUrlError(null)
      const data = await analyzeMutation.mutateAsync({ url: sanitized, force, locale })
      setResult(data)
      setSelectedFunnels(new Set(
        data.funnel_suggestions
          .map((_: unknown, i: number) => i)
          .filter((i: number) => !existingFunnelNames.has(data.funnel_suggestions[i].name.toLowerCase()))
      ))
      setSelectedRules(new Set(
        data.event_rule_suggestions
          .map((_: unknown, i: number) => i)
          .filter((i: number) => !existingRuleNames.has(data.event_rule_suggestions[i].name.toLowerCase()))
      ))
    },
    [url, locale, analyzeMutation, existingFunnelNames, existingRuleNames]
  )

  const toggleFunnel = (index: number) => {
    const suggestion = result?.funnel_suggestions[index]
    if (suggestion && existingFunnelNames.has(suggestion.name.toLowerCase())) return
    setSelectedFunnels((prev) => {
      const next = new Set(prev)
      next.has(index) ? next.delete(index) : next.add(index)
      return next
    })
  }

  const toggleRule = (index: number) => {
    const suggestion = result?.event_rule_suggestions[index]
    if (suggestion && existingRuleNames.has(suggestion.name.toLowerCase())) return
    setSelectedRules((prev) => {
      const next = new Set(prev)
      next.has(index) ? next.delete(index) : next.add(index)
      return next
    })
  }

  const toggleAllFunnels = () => {
    if (!result) return
    const selectableIndices = result.funnel_suggestions
      .map((_, i) => i)
      .filter((i) => !existingFunnelNames.has(result.funnel_suggestions[i].name.toLowerCase()))
    if (selectedFunnels.size === selectableIndices.length) {
      setSelectedFunnels(new Set())
    } else {
      setSelectedFunnels(new Set(selectableIndices))
    }
  }

  const toggleAllRules = () => {
    if (!result) return
    const selectableIndices = result.event_rule_suggestions
      .map((_, i) => i)
      .filter((i) => !existingRuleNames.has(result.event_rule_suggestions[i].name.toLowerCase()))
    if (selectedRules.size === selectableIndices.length) {
      setSelectedRules(new Set())
    } else {
      setSelectedRules(new Set(selectableIndices))
    }
  }

  const totalSelected = selectedFunnels.size + selectedRules.size

  // Compute which event rule names are required by selected funnels (for dependency warnings)
  const requiredRuleNames = useMemo(() => {
    if (!result) return new Set<string>()
    const names = new Set<string>()
    for (const fIdx of selectedFunnels) {
      const funnel = result.funnel_suggestions[fIdx]
      if (!funnel) continue
      for (const step of funnel.steps) {
        if (step.pattern_type === 'event') {
          names.add(step.pattern)
        }
      }
    }
    return names
  }, [result, selectedFunnels])

  // Map each event rule suggestion index → list of funnel names that depend on it
  const ruleDependents = useMemo(() => {
    if (!result) return new Map<number, string[]>()
    const map = new Map<number, string[]>()
    result.event_rule_suggestions.forEach((rule, ruleIdx) => {
      const dependentFunnels: string[] = []
      for (const fIdx of selectedFunnels) {
        const funnel = result.funnel_suggestions[fIdx]
        if (!funnel) continue
        const needsThisRule = funnel.steps.some(
          (s) => s.pattern_type === 'event' && s.pattern === rule.name
        )
        if (needsThisRule) dependentFunnels.push(funnel.name)
      }
      if (dependentFunnels.length > 0) map.set(ruleIdx, dependentFunnels)
    })
    return map
  }, [result, selectedFunnels])

  // Count how many selected funnels have unselected required event rules
  const funnelsWithMissingRules = useMemo(() => {
    if (!result) return 0
    const selectedRuleNames = new Set<string>()
    for (const rIdx of selectedRules) {
      const rule = result.event_rule_suggestions[rIdx]
      if (rule) selectedRuleNames.add(rule.name)
    }
    // Also count rules that already exist in the org
    let count = 0
    for (const fIdx of selectedFunnels) {
      const funnel = result.funnel_suggestions[fIdx]
      if (!funnel) continue
      const hasMissingRule = funnel.steps.some(
        (s) =>
          s.pattern_type === 'event' &&
          !selectedRuleNames.has(s.pattern) &&
          !existingRuleNames.has(s.pattern.toLowerCase())
      )
      if (hasMissingRule) count++
    }
    return count
  }, [result, selectedFunnels, selectedRules, existingRuleNames])

  const handleApply = async () => {
    if (!result) return
    const applied = await applyMutation.mutateAsync({
      cache_id: result.cache_id,
      selected_funnels: Array.from(selectedFunnels),
      selected_event_rules: Array.from(selectedRules),
    })
    setAppliedCounts({
      funnels: applied.funnels_created,
      rules: applied.event_rules_created,
      funnelsSkipped: applied.funnels_skipped ?? 0,
      rulesSkipped: applied.event_rules_skipped ?? 0,
    })
  }

  // ── Input state ──────────────────────────────────────────────────────
  if (!result && !analyzeMutation.isPending) {
    return (
      <div className="flex flex-col items-center gap-5 py-10">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-violet-100 to-blue-100">
          <Sparkles className="h-6 w-6 text-violet-600" aria-hidden="true" />
        </div>

        <div className="text-center">
          <h3
            className="text-lg font-semibold text-slate-900"
            style={{ textWrap: 'balance' } as React.CSSProperties}
          >
            {t('onboarding.title')}
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
            {t('onboarding.description')}
          </p>
        </div>

        <div className="w-full max-w-md space-y-1.5">
          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              onBlur={handleUrlBlur}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAnalyze(false) }}
              aria-label="Website URL"
              aria-invalid={!!urlError}
              placeholder="https://your-website.com…"
              className={`flex-1 rounded-lg border bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus-visible:ring-2 ${
                urlError
                  ? 'border-red-300 focus:border-red-500 focus-visible:ring-red-500/20'
                  : 'border-slate-200 focus:border-blue-500 focus-visible:ring-blue-500/20'
              }`}
            />
            <Button
              onClick={() => handleAnalyze(false)}
              disabled={!url.trim() || !!urlError}
              className="shrink-0 text-white shadow-md shadow-blue-500/20"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
            >
              {t('analyze_button')}
            </Button>
          </div>
          {urlError && (
            <p className="text-xs text-red-500" role="alert">
              {t(urlError)}
            </p>
          )}
        </div>

        {initialUrl && (
          <p className="text-[11px] text-slate-400">{t('onboarding.prefilled_hint')}</p>
        )}

        {onSkip && (
          <button
            onClick={onSkip}
            className="rounded text-xs text-slate-400 underline transition-colors hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2"
          >
            {t('skip')}
          </button>
        )}
      </div>
    )
  }

  // ── Loading state ────────────────────────────────────────────────────
  if (analyzeMutation.isPending) {
    return <SmartSetupLoading onCancel={() => analyzeMutation.reset()} />
  }

  // ── Error state ──────────────────────────────────────────────────────
  if (analyzeMutation.isError) {
    return (
      <div className="flex flex-col items-center gap-4 py-10">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <AlertTriangle className="h-5 w-5 text-red-500" aria-hidden="true" />
        </div>
        <p className="max-w-sm text-center text-sm text-red-600">
          {(analyzeMutation.error as any)?.response?.data?.message
            || (analyzeMutation.error as Error)?.message
            || t('errors.analysis_failed')}
        </p>
        <Button variant="outline" onClick={() => handleAnalyze(false)} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          {t('analyze_button')}
        </Button>
      </div>
    )
  }

  // ── Success state ────────────────────────────────────────────────────
  if (appliedCounts) {
    return (
      <div className="flex flex-col items-center gap-5 py-10">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle2 className="h-7 w-7 text-emerald-500" aria-hidden="true" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-slate-900">
            {t('messages.applied', {
              funnels: appliedCounts.funnels,
              rules: appliedCounts.rules,
            })}
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
            {t('success.description')}
          </p>
          {(appliedCounts.funnelsSkipped > 0 || appliedCounts.rulesSkipped > 0) && (
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-400">
              {t('results.skippedInfo', {
                funnels: appliedCounts.funnelsSkipped,
                rules: appliedCounts.rulesSkipped,
              })}
            </p>
          )}
        </div>
        <Button
          onClick={() => onComplete?.()}
          className="gap-1.5"
        >
          {t('success.continue')}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>
    )
  }

  // ── Results state ────────────────────────────────────────────────────
  if (!result) return null

  return (
    <div className="space-y-6 pb-2">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-slate-900">{t('title')}</h3>
          <p className="mt-0.5 truncate text-xs text-slate-400" title={url}>
            {t('results.analyzed_url', { url })}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleAnalyze(true)}
          disabled={analyzeMutation.isPending}
          className="shrink-0 gap-1.5 border-slate-300 text-xs"
        >
          <RefreshCw className="h-3 w-3" aria-hidden="true" />
          {t('reanalyze')}
        </Button>
      </div>

      {/* Truncation warning */}
      {result?.truncated && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-500"
            aria-hidden="true"
          />
          <p className="text-xs leading-relaxed text-amber-700">{t('warnings.truncated')}</p>
        </div>
      )}

      {/* Funnel suggestions */}
      {result.funnel_suggestions.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-100" aria-hidden="true">
                <Funnel className="h-3.5 w-3.5 text-purple-600" />
              </div>
              <h4 className="text-[13px] font-semibold text-slate-900">
                {t('funnels.section_title')}
              </h4>
              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {result.funnel_suggestions.length}
              </span>
            </div>
            <button
              onClick={toggleAllFunnels}
              className="rounded px-2 py-1 text-[11px] font-medium text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-500"
            >
              {selectedFunnels.size === result.funnel_suggestions.length
                ? t('deselect_all')
                : t('select_all')}
            </button>
          </div>
          <p className="mb-3 text-xs leading-relaxed text-slate-500">
            {t('funnels.section_hint')}
          </p>
          <div className="space-y-2.5" role="group" aria-label={t('funnels.section_title')}>
            {result.funnel_suggestions.map((suggestion, i) => (
              <FunnelSuggestionCard
                key={i}
                suggestion={suggestion}
                selected={selectedFunnels.has(i)}
                exists={existingFunnelNames.has(suggestion.name.toLowerCase())}
                onToggle={() => toggleFunnel(i)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Divider between sections */}
      {result.funnel_suggestions.length > 0 &&
        result.event_rule_suggestions.length > 0 && (
        <div className="border-t border-slate-200" />
      )}

      {/* Event rule suggestions */}
      {result.event_rule_suggestions.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100" aria-hidden="true">
                <Zap className="h-3.5 w-3.5 text-emerald-600" />
              </div>
              <h4 className="text-[13px] font-semibold text-slate-900">
                {t('event_rules.section_title')}
              </h4>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {result.event_rule_suggestions.length}
              </span>
            </div>
            <button
              onClick={toggleAllRules}
              className="rounded px-2 py-1 text-[11px] font-medium text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-500"
            >
              {selectedRules.size === result.event_rule_suggestions.length
                ? t('deselect_all')
                : t('select_all')}
            </button>
          </div>
          <p className="mb-3 text-xs leading-relaxed text-slate-500">
            {t('event_rules.section_hint')}
          </p>
          <div
            className="grid grid-cols-1 gap-2.5 md:grid-cols-2"
            role="group"
            aria-label={t('event_rules.section_title')}
          >
            {result.event_rule_suggestions.map((suggestion, i) => (
              <EventRuleSuggestionCard
                key={i}
                suggestion={suggestion}
                selected={selectedRules.has(i)}
                exists={existingRuleNames.has(suggestion.name.toLowerCase())}
                onToggle={() => toggleRule(i)}
                dependentFunnels={!selectedRules.has(i) ? ruleDependents.get(i) : undefined}
              />
            ))}
          </div>
        </section>
      )}

      {/* Bottom bar — sticky */}
      <div className="sticky bottom-0 -mx-6 border-t border-slate-200 bg-white/95 px-6 py-3 backdrop-blur-sm">
        {funnelsWithMissingRules > 0 && (
          <div className="mb-2 flex items-center gap-1.5 text-amber-600">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="text-[11px] leading-tight">
              {t('dependency.bottomBarWarning', { count: funnelsWithMissingRules })}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span
            className="text-xs text-slate-500"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {t('results.selected_count', {
              selected: totalSelected,
              total:
                (result?.funnel_suggestions.length || 0) +
                (result?.event_rule_suggestions.length || 0),
            })}
          </span>
          <div className="flex gap-2">
            {onSkip && (
              <Button variant="ghost" size="sm" onClick={onSkip}>
                {t('skip')}
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleApply}
              disabled={totalSelected === 0 || applyMutation.isPending}
              className="gap-1.5 text-white shadow-md shadow-blue-500/20"
              style={{ background: totalSelected > 0 ? 'linear-gradient(135deg, #7c3aed, #3b82f6)' : undefined }}
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {t('apply_selected', { count: totalSelected })}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
