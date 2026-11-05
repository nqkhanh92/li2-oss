'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { FunnelStep, StepMetrics } from '../types'
import { cn } from '@/shared/lib/utils'

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return n.toLocaleString()
}

function getDropOffColor(rate: number): string {
  if (rate < 20) return 'text-emerald-600'
  if (rate < 40) return 'text-amber-600'
  return 'text-red-600'
}

interface FunnelStepColumnProps {
  step: StepMetrics
  barHeight: number
  proceedPercent: number
  isLastStep: boolean
  isFirstStep: boolean
  conversionRate: number
  onClick?: () => void
  stepConfig?: FunnelStep
  orgId?: string
  existingEventNames?: Set<string>
  eventRuleStatusMap?: Map<string, boolean>
}

function FunnelStepColumn({
  step,
  barHeight,
  proceedPercent,
  isLastStep,
  isFirstStep,
  conversionRate,
  onClick,
  stepConfig,
  orgId,
  existingEventNames,
  eventRuleStatusMap,
}: FunnelStepColumnProps) {
  const { t } = useTranslation('funnels')
  return (
    <div
      className={cn(
        'flex-1 min-w-[140px] flex flex-col border-r border-slate-200 last:border-r-0',
        'max-md:min-w-[160px]',
        onClick && 'cursor-pointer hover:bg-slate-50 transition-colors'
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
          Step {step.step_position}
        </div>
        <div className="text-sm font-semibold text-foreground truncate mt-0.5">
          {step.step_name}
        </div>
      </div>

      {/* Visit count — flex-1 so bar + bottom metric stay aligned across columns */}
      <div className="px-4 pb-3 flex-1">
        <div className="text-[11px] uppercase tracking-wider text-slate-400">
          {t('chart.visits')}
        </div>
        <div className="text-2xl font-semibold text-slate-900 tabular-nums">
          {formatNumber(step.visits)}
        </div>
        {/* Paused rule warning — even when visits > 0 (showing historical data only) */}
        {step.visits > 0 &&
          stepConfig?.pattern_type === 'event' &&
          eventRuleStatusMap?.get(stepConfig.pattern) === false && (
            <p className="mt-1 text-[11px] text-amber-600 leading-relaxed">
              {t('chart.eventRulePausedHistorical')}
            </p>
          )}
        {step.visits === 0 &&
          stepConfig?.pattern_type === 'event' &&
          (() => {
            const pattern = stepConfig.pattern
            // Check if event name exists in active event names (from pageviews + active rules)
            const eventExists =
              existingEventNames &&
              existingEventNames.size > 0 &&
              Array.from(existingEventNames).some((name) => {
                const condition = stepConfig.condition
                if (condition === 'equals') return name === pattern
                if (condition === 'contains') return name.includes(pattern)
                if (condition === 'starts_with') return name.startsWith(pattern)
                if (condition === 'ends_with') return name.endsWith(pattern)
                return name === pattern
              })

            if (eventExists) {
              // State 3: Rule exists, active, no matches yet
              return (
                <div className="mt-2 text-xs text-slate-400 leading-relaxed">
                  <p>{t('chart.eventActiveNoMatches', { pattern })}</p>
                </div>
              )
            }

            // Check if an event rule exists but is inactive
            const ruleIsActive = eventRuleStatusMap?.get(pattern)
            if (ruleIsActive === false) {
              // State 2: Rule exists but inactive
              return (
                <div className="mt-2 text-xs text-amber-600 leading-relaxed">
                  <p className="font-medium">{t('chart.eventRulePaused', { pattern })}</p>
                  <p className="text-slate-400 mt-0.5">
                    {orgId ? (
                      <Link
                        href={`/org/${orgId}/event-rules`}
                        className="underline hover:text-amber-600"
                      >
                        {t('chart.eventRuleEnableHint')}
                      </Link>
                    ) : (
                      t('chart.eventRuleEnableHint')
                    )}
                  </p>
                </div>
              )
            }

            // State 1: Rule doesn't exist at all
            return (
              <div className="mt-2 text-xs text-amber-600 leading-relaxed">
                <p className="font-medium">{t('chart.noEventFound', { pattern })}</p>
                <p className="text-slate-400 mt-0.5">
                  {orgId ? (
                    <Link
                      href={`/org/${orgId}/event-rules`}
                      className="underline hover:text-amber-600"
                    >
                      {t('chart.eventRule')}
                    </Link>
                  ) : (
                    t('chart.eventRule')
                  )}{' '}
                  {t('chart.createEventRuleHint', { pattern })}
                </p>
              </div>
            )
          })()}
      </div>

      {/* Bar */}
      <div className="px-4 pb-3">
        <div className="relative h-[200px] flex items-end">
          {/* Bar background (full height portion = drop-off + proceeded) */}
          <div
            className="w-full rounded-t-sm relative overflow-hidden transition-all duration-500"
            style={{
              height: `${Math.max(barHeight, 4)}%`,
              backgroundColor: 'rgb(219 234 254)', // blue-100
            }}
          >
            {/* Proceeded portion (dark, from bottom) */}
            <div
              className="absolute bottom-0 left-0 right-0 rounded-t-sm transition-all duration-500"
              style={{
                height: `${proceedPercent}%`,
                backgroundColor: 'rgb(59 130 246)', // blue-500
              }}
            />
          </div>
        </div>
      </div>

      {/* Bottom metric */}
      <div className="px-4 pb-4 pt-2 border-t border-slate-100">
        {isLastStep ? (
          <>
            <div className="text-[11px] font-medium uppercase tracking-wider text-emerald-600">
              {t('chart.funnelConversion')}
            </div>
            <div className="text-lg font-semibold text-emerald-600 tabular-nums">
              {formatNumber(step.visits)}{' '}
              <span className="text-sm">({conversionRate.toFixed(1)}%)</span>
            </div>
          </>
        ) : (
          <>
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              {t('chart.dropOff')}
            </div>
            <div
              className={cn(
                'text-lg font-semibold tabular-nums',
                getDropOffColor(step.drop_off_rate)
              )}
            >
              {formatNumber(step.drop_offs)}{' '}
              <span className="text-sm">({step.drop_off_rate.toFixed(1)}%)</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

interface FunnelChartProps {
  steps: StepMetrics[]
  totalEntries: number
  conversionRate: number
  onStepClick?: (stepPosition: number, stepName: string) => void
  stepConfigs?: Map<number, FunnelStep>
  orgId?: string
  existingEventNames?: Set<string>
  eventRuleStatusMap?: Map<string, boolean>
}

export function FunnelChart({
  steps,
  totalEntries,
  conversionRate,
  onStepClick,
  stepConfigs,
  orgId,
  existingEventNames,
  eventRuleStatusMap,
}: FunnelChartProps) {
  const chartData = useMemo(() => {
    const maxVisits = Math.max(...steps.map((s) => s.visits), 1)

    return steps.map((step, index) => {
      const barHeight = (step.visits / maxVisits) * 100
      const isLastStep = index === steps.length - 1
      // For last step, the entire bar is "proceeded" (converted)
      const proceedPercent =
        step.visits > 0 ? (isLastStep ? 100 : (step.proceeds / step.visits) * 100) : 0

      return {
        step,
        barHeight,
        proceedPercent,
        isLastStep,
        isFirstStep: index === 0,
      }
    })
  }, [steps])

  return (
    <div className="flex overflow-x-auto max-md:pb-2">
      {chartData.map(({ step, barHeight, proceedPercent, isLastStep, isFirstStep }) => (
        <FunnelStepColumn
          key={step.step_position}
          step={step}
          barHeight={barHeight}
          proceedPercent={proceedPercent}
          isLastStep={isLastStep}
          isFirstStep={isFirstStep}
          conversionRate={conversionRate}
          onClick={onStepClick ? () => onStepClick(step.step_position, step.step_name) : undefined}
          stepConfig={stepConfigs?.get(step.step_position)}
          orgId={orgId}
          existingEventNames={existingEventNames}
          eventRuleStatusMap={eventRuleStatusMap}
        />
      ))}
    </div>
  )
}
