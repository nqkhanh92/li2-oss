'use client'

import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { cn } from '@/shared/lib/utils'
import type { RageClickElement } from '@/ee/features/heatmap/types'

interface SiteRageClickListProps {
  elements: RageClickElement[]
  isLoading: boolean
  selectedSelector?: string | null
  onElementClick?: (selector: string) => void
}

type Severity = 'high' | 'medium' | 'low'

function getSeverity(count: number): Severity {
  if (count >= 10) return 'high'
  if (count >= 5) return 'medium'
  return 'low'
}

const SEVERITY_ROW: Record<Severity, string> = {
  high:   'bg-red-50/70',
  medium: 'bg-orange-50/70',
  low:    'bg-yellow-50/50',
}

const SEVERITY_ROW_SELECTED: Record<Severity, string> = {
  high:   'bg-red-100 ring-1 ring-inset ring-red-200',
  medium: 'bg-orange-100 ring-1 ring-inset ring-orange-200',
  low:    'bg-yellow-100 ring-1 ring-inset ring-yellow-200',
}

const SEVERITY_BADGE: Record<Severity, string> = {
  high:   'bg-red-100 text-red-600',
  medium: 'bg-orange-100 text-orange-600',
  low:    'bg-yellow-100 text-yellow-600',
}

const SEVERITY_LABEL: Record<Severity, string> = {
  high:   'High',
  medium: 'Med',
  low:    'Low',
}

export function SiteRageClickList({ elements, isLoading, selectedSelector, onElementClick }: SiteRageClickListProps) {
  const { t } = useTranslation('heatmap')

  if (isLoading) {
    return (
      <div className="space-y-1.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  if (elements.length === 0) {
    return (
      <div className="flex h-[260px] flex-col items-center justify-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <span className="text-lg">⚡</span>
        </div>
        <p className="!text-s text-muted-foreground">{t('rageClicks.noData')}</p>
      </div>
    )
  }

  return (
    <div className="max-h-[260px] overflow-y-auto space-y-1 p-0.5 pr-2">
      {elements.map((el, i) => {
        const severity = getSeverity(el.rage_click_count)
        const isSelected = el.selector === selectedSelector

        return (
          <div
            key={`${el.selector}-${i}`}
            role="button"
            tabIndex={0}
            onClick={() => onElementClick?.(el.selector)}
            onKeyDown={(e) => e.key === 'Enter' && onElementClick?.(el.selector)}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer transition-colors',
              isSelected ? SEVERITY_ROW_SELECTED[severity] : cn(SEVERITY_ROW[severity], 'hover:brightness-95'),
            )}
          >
            {/* Severity badge */}
            <span className={cn(
              'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
              SEVERITY_BADGE[severity],
            )}>
              {SEVERITY_LABEL[severity]}
            </span>

            {/* Element info */}
            <div className="flex-1 min-w-0">
              <p className="!text-s font-medium truncate text-foreground">{el.text || el.selector}</p>
              <div className="flex items-center gap-1.5">
                {el.tag && (
                  <code className="text-[10px] text-muted-foreground">{`<${el.tag}>`}</code>
                )}
                {el.href && (
                  <span className="text-[10px] text-muted-foreground truncate max-w-28">{el.href}</span>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="shrink-0 text-right">
              <p className="!text-s font-semibold tabular-nums text-foreground">
                {el.rage_click_count.toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {t('rageClicks.session', { count: el.affected_sessions })}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
