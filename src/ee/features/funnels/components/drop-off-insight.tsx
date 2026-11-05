'use client'

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { TriangleAlert } from 'lucide-react'
import type { StepMetrics } from '../types'

function getDropOffSeverity(rate: number) {
  if (rate < 20) return 'low'
  if (rate < 40) return 'moderate'
  return 'critical'
}

function formatDropOffs(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return n.toLocaleString()
}

interface DropOffInsightProps {
  steps: StepMetrics[]
}

export function DropOffInsight({ steps }: DropOffInsightProps) {
  const { t } = useTranslation('funnels')
  const worstStep = useMemo(() => {
    const candidates = steps
      .filter((_, i) => i < steps.length - 1)
      .filter((s) => s.visits > 0)
    if (candidates.length === 0) return null
    return candidates.reduce((worst, step) =>
      step.drop_off_rate > worst.drop_off_rate ? step : worst
    )
  }, [steps])

  if (!worstStep) return null

  const severity = getDropOffSeverity(worstStep.drop_off_rate)
  const nextStep = steps.find((s) => s.step_position === worstStep.step_position + 1)
  const severityLabel =
    severity === 'critical'
      ? t('dropOff.critical', 'Critical')
      : severity === 'moderate'
        ? t('dropOff.moderate', 'Moderate')
        : t('dropOff.low', 'Low')

  return (
    <div className="bg-card border border-destructive rounded-[8px] px-4 py-3 sm:px-6 sm:py-4 flex gap-3 sm:gap-4 items-start sm:items-center">
      <TriangleAlert className="w-5 h-5 sm:w-7 sm:h-7 text-destructive shrink-0 mt-0.5 sm:mt-0" />
      <div className="flex flex-1 flex-col gap-0.5 min-w-0">
        <p className="text-base font-semibold text-destructive leading-6">
          <span>{t('dropOff.title')}</span>
          {' — '}
          <span>{severityLabel}</span>
        </p>
        <p className="text-s text-slate-500">
          <span className="font-medium text-foreground">
            {t('visitorDetail.stepBadge', { position: worstStep.step_position })}: {worstStep.step_name}
          </span>
          {nextStep && (
            <span>{` → `}{nextStep.step_name} — </span>
          )}
          <span className="font-medium text-destructive">
            {t('dropOff.droppedOff', {
              num: formatDropOffs(worstStep.drop_offs),
              rate: worstStep.drop_off_rate.toFixed(1),
            })}
          </span>
        </p>
      </div>
    </div>
  )
}
