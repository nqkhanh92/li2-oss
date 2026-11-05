'use client'

import { useTranslation } from 'react-i18next'
import { Badge } from '@/shared/components/ui/badge'
import { Skeleton } from '@/shared/components/ui/skeleton'
import type { RageClickElement } from '../types'

interface RageClickListProps {
  elements: RageClickElement[]
  isLoading: boolean
}

function severityColor(count: number): string {
  if (count >= 10) return 'text-red-500'
  if (count >= 5) return 'text-orange-500'
  return 'text-yellow-500'
}

export function RageClickList({ elements, isLoading }: RageClickListProps) {
  const { t } = useTranslation('heatmap')
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  if (elements.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        {t('rageClicks.noData')}
      </p>
    )
  }

  return (
    <div className="space-y-1">
      {elements.map((el, i) => (
        <div
          key={`${el.selector}-${i}`}
          className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted/50 transition-colors"
        >
          <span className={`text-lg font-bold ${severityColor(el.rage_click_count)}`}>
            ●
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {el.text || el.selector}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              {el.tag && (
                <Badge variant="secondary" className="text-[10px] px-1 py-0 leading-4">
                  {`<${el.tag}>`}
                </Badge>
              )}
              {el.href && (
                <span className="text-xs text-muted-foreground truncate max-w-48">
                  {el.href}
                </span>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-semibold tabular-nums">
              {el.rage_click_count.toLocaleString()} {t('rageClicks.clicks')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('rageClicks.session', { count: el.affected_sessions })}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
