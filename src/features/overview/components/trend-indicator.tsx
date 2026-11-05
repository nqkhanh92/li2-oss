'use client'

import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/utils'

interface TrendIndicatorProps {
  current: number
  previous: number
  className?: string
}

export function TrendIndicator({ current, previous, className }: TrendIndicatorProps) {
  const { t } = useTranslation('overview')

  // Zero-to-zero: no meaningful trend
  if (current === 0 && previous === 0) return null

  // Zero-to-positive: brand new data
  if (previous === 0 && current > 0) {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700',
          className
        )}
      >
        {t('trend.new')}
      </span>
    )
  }

  // Calculate percent change
  const pct = previous === 0 ? 0 : ((current - previous) / previous) * 100
  const isPositive = pct > 0
  const isFlat = pct === 0

  const arrow = isFlat ? '→' : isPositive ? '↑' : '↓'
  const colorClass = isFlat
    ? 'text-muted-foreground'
    : isPositive
      ? 'text-green-600'
      : 'text-red-600'

  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium', colorClass, className)}>
      {arrow} {Math.abs(pct).toFixed(1)}%
    </span>
  )
}
