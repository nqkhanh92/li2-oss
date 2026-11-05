'use client'

import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/utils'
import type { StepMetrics } from '../types'

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return n.toLocaleString()
}

function getRateColor(rate: number): string {
  if (rate < 20) return 'text-emerald-600'
  if (rate < 40) return 'text-amber-500'
  return 'text-red-600'
}

const GRID = 'grid-cols-[10%_1fr_22%_22%] md:grid-cols-[5%_25%_14%_14%_14%_14%_14%]'

interface StepDetailsTableProps {
  steps: StepMetrics[]
}

export function StepDetailsTable({ steps }: StepDetailsTableProps) {
  const { t } = useTranslation('funnels')

  return (
    <div className="w-full">
      {/* Header row */}
      <div className="px-4 md:px-6">
        <div className={cn('grid py-2 border-b border-slate-100', GRID)}>
          <span className="text-s text-slate-400 font-medium whitespace-nowrap">{t('table.step')}</span>
          <span className="text-s text-slate-400 font-medium whitespace-nowrap">{t('table.name')}</span>
          <span className="text-s text-slate-400 font-medium text-right whitespace-nowrap">{t('table.visits')}</span>
          <span className="hidden md:block text-s text-slate-400 font-medium text-right whitespace-nowrap">{t('table.entries')}</span>
          <span className="hidden md:block text-s text-slate-400 font-medium text-right whitespace-nowrap">{t('table.proceeds')}</span>
          <span className="hidden md:block text-s text-slate-400 font-medium text-right whitespace-nowrap">{t('table.dropOff')}</span>
          <span className="text-s text-slate-400 font-medium text-right whitespace-nowrap">{t('table.rate')}</span>
        </div>
      </div>

      {/* Data rows */}
      {steps.map((step, index) => {
        const isLastStep = index === steps.length - 1
        return (
          <div key={step.step_position} className="px-4 md:px-6">
            <div className={cn('grid items-center py-3', GRID, index < steps.length - 1 && 'border-b border-slate-100')}>
              {/* Step badge */}
              <div className="flex items-center">
                <div className="w-7 h-7 rounded-full bg-[#437EF7] text-white text-xs font-semibold flex items-center justify-center shrink-0">
                  {step.step_position}
                </div>
              </div>

              {/* Name */}
              <span className="text-sm text-slate-800 font-medium pr-2 truncate">
                {step.step_name}
              </span>

              {/* Visits */}
              <span className="text-sm text-slate-700 tabular-nums text-right">
                {formatNumber(step.visits)}
              </span>

              {/* Entries — desktop only */}
              <span className={cn(
                'hidden md:block text-sm tabular-nums text-right',
                step.entries > 0 ? 'text-slate-700' : step.entries === 0 && index > 0 ? 'text-[#437EF7]' : 'text-slate-400'
              )}>
                {step.entries > 0
                  ? formatNumber(step.entries)
                  : index === 0
                    ? formatNumber(step.entries)
                    : step.entries === 0 && isLastStep
                      ? '0'
                      : '—'}
              </span>

              {/* Proceeds — desktop only */}
              <span className="hidden md:block text-sm text-slate-700 tabular-nums text-right">
                {isLastStep ? '—' : formatNumber(step.proceeds)}
              </span>

              {/* Drop-off — desktop only */}
              <span className="hidden md:block text-sm text-slate-700 tabular-nums text-right">
                {isLastStep ? '—' : formatNumber(step.drop_offs)}
              </span>

              {/* Rate */}
              <span className={cn(
                'text-sm tabular-nums text-right font-medium',
                isLastStep ? 'text-slate-400' : getRateColor(step.drop_off_rate)
              )}>
                {isLastStep ? '—' : `${step.drop_off_rate.toFixed(1)}%`}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
