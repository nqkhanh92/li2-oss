'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe, Brain, Sparkles, Check } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

const STEPS = [
  { key: 'loading.fetching', icon: Globe, delay: 0 },
  { key: 'loading.analyzing', icon: Brain, delay: 3000 },
  { key: 'loading.generating', icon: Sparkles, delay: 7000 },
] as const

interface SmartSetupLoadingProps {
  onCancel?: () => void
}

export function SmartSetupLoading({ onCancel }: SmartSetupLoadingProps) {
  const { t } = useTranslation('smart_setup')
  const [activeStep, setActiveStep] = useState(0)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const timers = STEPS.slice(1).map((step, i) =>
      setTimeout(() => setActiveStep(i + 1), step.delay)
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  // Elapsed seconds counter for context
  useEffect(() => {
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[300px] flex-col items-center justify-center gap-6 py-8"
    >
      {/* Animated gradient bar — continuous movement */}
      <div className="h-1.5 w-52 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full transition-[width] duration-[2000ms] ease-out"
          style={{
            width: activeStep === STEPS.length - 1 ? '90%' : `${((activeStep + 1) / STEPS.length) * 70}%`,
            background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
          }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {STEPS.map((step, i) => {
          const Icon = step.icon
          const isActive = i === activeStep
          const isDone = i < activeStep

          return (
            <div
              key={step.key}
              className={cn(
                'flex items-center gap-3 transition-all duration-500',
                i > activeStep ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0',
                isActive ? 'text-slate-900' : isDone ? 'text-slate-500' : 'text-slate-400'
              )}
            >
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full transition-colors',
                  isActive
                    ? 'bg-blue-100 text-blue-600'
                    : isDone
                      ? 'bg-emerald-100 text-emerald-600'
                      : 'bg-slate-100 text-slate-400'
                )}
                aria-hidden="true"
              >
                {isDone ? (
                  <Check className="h-4 w-4" strokeWidth={2.5} />
                ) : (
                  <Icon className={cn('h-4 w-4', isActive && 'motion-safe:animate-pulse')} />
                )}
              </div>
              <span className={cn('text-sm transition-colors', isActive && 'font-medium')}>
                {t(step.key)}
                {isActive ? '\u2026' : ''}
              </span>
            </div>
          )
        })}
      </div>

      {/* Time hint */}
      <p
        className="text-[11px] text-slate-400"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {elapsed < 10
          ? t('loading.time_hint')
          : t('loading.almost_done')}
      </p>

      {onCancel && (
        <button
          onClick={onCancel}
          className="rounded text-xs text-slate-400 underline transition-colors hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2"
        >
          {t('cancel')}
        </button>
      )}
    </div>
  )
}
