'use client'

import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/utils'
import { ChevronRight, Check } from 'lucide-react'
import type { FunnelSuggestion } from '../types'

interface FunnelSuggestionCardProps {
  suggestion: FunnelSuggestion
  selected: boolean
  onToggle: () => void
  exists?: boolean
}

export function FunnelSuggestionCard({
  suggestion,
  selected,
  onToggle,
  exists,
}: FunnelSuggestionCardProps) {
  const { t } = useTranslation('smart_setup')

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onToggle()
    }
  }

  return (
    <div
      role="checkbox"
      aria-checked={selected && !exists}
      aria-disabled={exists}
      aria-label={suggestion.name}
      tabIndex={exists ? -1 : 0}
      onClick={exists ? undefined : onToggle}
      onKeyDown={exists ? undefined : handleKeyDown}
      className={cn(
        'relative rounded-xl border p-5 transition-all duration-200',
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
          'absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-md transition-colors',
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

      {/* Header */}
      <h4
        className="pr-8 text-sm font-semibold text-slate-900"
        style={{ textWrap: 'balance' } as React.CSSProperties}
      >
        {suggestion.name}
      </h4>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">{suggestion.description}</p>
      {exists && (
        <span className="mt-1 inline-block rounded-md bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-500">
          {t('results.alreadyExists')}
        </span>
      )}

      {/* Step flow label */}
      <p className="mt-4 mb-2 text-[11px] font-medium text-slate-400">
        {t('funnels.card_subtitle', { count: suggestion.steps.length })}
      </p>

      {/* Step flow */}
      <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
        {suggestion.steps.map((step, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <span
                className={cn(
                  'inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                  selected ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-600'
                )}
                style={{ fontVariantNumeric: 'tabular-nums' }}
                aria-hidden="true"
              >
                {step.position}
              </span>
              <span className="text-[12px] font-medium leading-tight text-foreground">
                {step.name}
              </span>
            </div>
            {i < suggestion.steps.length - 1 && (
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" aria-hidden="true" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
