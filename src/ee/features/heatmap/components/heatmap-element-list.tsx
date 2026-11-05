'use client'

import { useTranslation } from 'react-i18next'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { Zap } from 'lucide-react'
import type { HeatmapElement } from '../types'

interface HeatmapElementListProps {
  elements: HeatmapElement[]
  onCreateEvent?: (element: HeatmapElement) => void
}

export function HeatmapElementList({ elements, onCreateEvent }: HeatmapElementListProps) {
  const { t } = useTranslation('heatmap')
  if (elements.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        {t('elements.noData')}
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
          <span className="text-sm font-medium text-muted-foreground w-6 text-right">
            {i + 1}.
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {el.text || el.selector}
            </p>
            {el.tag && (
              <Badge variant="secondary" className="text-[10px] px-1 py-0 leading-4 mt-0.5">
                {`<${el.tag}>`}
              </Badge>
            )}
          </div>
          <span className="text-sm font-semibold tabular-nums">
            {el.count.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground">{t('elements.clicks')}</span>
          {onCreateEvent && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => onCreateEvent(el)}
                  >
                    <Zap className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('elements.createEventRule')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      ))}
    </div>
  )
}
