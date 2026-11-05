'use client'

import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/utils'
import { Check, MousePointerClick, FileInput, TextCursorInput, Eye, AlertTriangle } from 'lucide-react'
import type { EventRuleSuggestion } from '../types'

const TRIGGER_CONFIG = {
  click: { icon: MousePointerClick, label: 'Click', color: 'bg-blue-100 text-blue-600', badgeColor: 'bg-blue-100 text-blue-700' },
  form_submit: { icon: FileInput, label: 'Form Submit', color: 'bg-violet-100 text-violet-600', badgeColor: 'bg-violet-100 text-violet-700' },
  form_fill: { icon: TextCursorInput, label: 'Form Fill', color: 'bg-amber-100 text-amber-600', badgeColor: 'bg-amber-100 text-amber-700' },
  element_visibility: { icon: Eye, label: 'Element Visible', color: 'bg-emerald-100 text-emerald-600', badgeColor: 'bg-emerald-100 text-emerald-700' },
} as const

interface EventRuleSuggestionCardProps {
  suggestion: EventRuleSuggestion
  selected: boolean
  onToggle: () => void
  exists?: boolean
  dependentFunnels?: string[]
}

export function EventRuleSuggestionCard({
  suggestion,
  selected,
  onToggle,
  exists,
  dependentFunnels,
}: EventRuleSuggestionCardProps) {
  const { t } = useTranslation('smart_setup')

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onToggle()
    }
  }

  const config = TRIGGER_CONFIG[suggestion.trigger_type]
  const TriggerIcon = config.icon

  return (
    <div
      role="checkbox"
      aria-checked={selected && !exists}
      aria-disabled={exists}
      aria-label={`${suggestion.name}: ${suggestion.description}`}
      tabIndex={exists ? -1 : 0}
      onClick={exists ? undefined : onToggle}
      onKeyDown={exists ? undefined : handleKeyDown}
      className={cn(
        'relative rounded-xl border p-4 transition-all duration-200',
        'focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2',
        exists
          ? 'border-slate-200 bg-slate-50 opacity-60 cursor-default'
          : selected
            ? 'border-blue-400 bg-blue-50/60 shadow-sm ring-1 ring-blue-400/30 cursor-pointer'
            : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5 cursor-pointer'
      )}
    >
      {/* Checkbox indicator */}
      <div
        className={cn(
          'absolute right-3 top-3 flex h-[18px] w-[18px] items-center justify-center rounded-md transition-colors',
          exists
            ? 'border-2 border-slate-200 bg-slate-100'
            : selected
              ? 'bg-blue-500 text-white'
              : 'border-2 border-slate-300'
        )}
        aria-hidden="true"
      >
        {selected && !exists && <Check className="h-3 w-3" strokeWidth={3} />}
      </div>

      {/* Header with trigger icon */}
      <div className="flex items-start gap-2.5 pr-8">
        <div
          className={cn(
            'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
            config.color
          )}
          aria-hidden="true"
        >
          <TriggerIcon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="mt-0.5 line-clamp-3 text-[12px] leading-relaxed text-slate-700">
            {suggestion.description}
          </p>
        </div>
      </div>

      {exists && (
        <span className="mt-2 inline-block rounded-md bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-500">
          {t('results.alreadyExists')}
        </span>
      )}

      {/* Trigger type badge */}
      <div className="mt-3">
        <span
          className={cn(
            'rounded-md px-2 py-0.5 text-[10px] font-semibold',
            config.badgeColor
          )}
        >
          {config.label}
        </span>
      </div>

      {/* Dependency warning — shown when this rule is unchecked but a selected funnel needs it */}
      {dependentFunnels && dependentFunnels.length > 0 && (
        <div className="mt-3 flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" aria-hidden="true" />
          <p className="text-[11px] leading-relaxed text-amber-700">
            {t('dependency.ruleNeeded', {
              funnels: dependentFunnels.join(', '),
              count: dependentFunnels.length,
            })}
          </p>
        </div>
      )}
    </div>
  )
}
