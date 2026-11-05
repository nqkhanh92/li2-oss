'use client'

import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { cn } from '@/shared/lib/utils'
import type { HeatmapElement } from '@/ee/features/heatmap/types'

interface SiteClickElementListProps {
  elements: HeatmapElement[]
  isLoading?: boolean
  selectedSelector?: string | null
  onElementClick?: (selector: string) => void
}

const RANK_STYLE = [
  'bg-amber-100 text-amber-600',
  'bg-slate-100 text-slate-500',
  'bg-orange-100 text-orange-500',
]

export function SiteClickElementList({ elements, isLoading, selectedSelector, onElementClick }: SiteClickElementListProps) {
  const { t } = useTranslation('heatmap')

  if (isLoading) {
    return (
      <div className="space-y-1.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (elements.length === 0) {
    return (
      <div className="flex h-[260px] flex-col items-center justify-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <span className="text-lg">🖱️</span>
        </div>
        <p className="!text-s text-muted-foreground">{t('elements.noData')}</p>
      </div>
    )
  }

  const maxCount = elements[0]?.count ?? 1

  return (
    <div className="max-h-[260px] overflow-y-auto space-y-1 p-0.5 pr-2">
      {elements.map((el, i) => {
        const isSelected = el.selector === selectedSelector
        const pct = Math.round((el.count / maxCount) * 100)

        return (
          <div
            key={`${el.selector}-${i}`}
            role="button"
            tabIndex={0}
            onClick={() => onElementClick?.(el.selector)}
            onKeyDown={(e) => e.key === 'Enter' && onElementClick?.(el.selector)}
            className={cn(
              'group relative flex items-center gap-2 rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer',
              isSelected
                ? 'bg-blue-50 ring-1 ring-inset ring-blue-200'
                : 'hover:bg-muted/50',
            )}
          >
            {/* Proportional background bar */}
            <div
              className="absolute left-0 top-0 h-full rounded-xl bg-blue-400/8 transition-all"
              style={{ width: `${pct}%` }}
            />

            {/* Rank pill */}
            <span className={cn(
              'relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
              i < 3 ? RANK_STYLE[i] : 'bg-muted text-muted-foreground',
            )}>
              {i + 1}
            </span>

            {/* Element info */}
            <div className="relative z-10 flex flex-1 min-w-0 items-center gap-1.5">
              <p className="!text-s font-medium truncate text-foreground">{el.text || el.selector}</p>
              {el.tag && (
                <code className="shrink-0 text-[10px] text-muted-foreground">{`<${el.tag}>`}</code>
              )}
            </div>

            {/* Click count */}
            <span className="relative z-10 !text-s font-semibold tabular-nums text-foreground shrink-0">
              {el.count.toLocaleString()}
            </span>
          </div>
        )
      })}
    </div>
  )
}
