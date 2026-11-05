'use client'

import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { MousePointerClick, AlertTriangle, Pointer } from 'lucide-react'
import type { BehavioralHighlights as BehavioralHighlightsType } from '../types'

interface BehavioralHighlightsProps {
  data: BehavioralHighlightsType | undefined
  isLoading: boolean
}

export function BehavioralHighlights({ data, isLoading }: BehavioralHighlightsProps) {
  const { t } = useTranslation('link-journey')

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('behavioral.title')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
          </div>
          <Skeleton className="h-24 w-full rounded-lg" />
        </CardContent>
      </Card>
    )
  }

  if (!data || data.total_interactions === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('behavioral.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center py-6 text-center">
            <Pointer className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">
              {t('behavioral.noData')}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Behavioral Highlights</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Metric cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 rounded-lg border px-4 py-3">
            <div className="rounded-lg bg-blue-50 p-2">
              <MousePointerClick className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground leading-none mb-1">{t('behavioral.interactions')}</p>
              <p className="text-lg font-semibold tabular-nums">
                {data.total_interactions.toLocaleString()}
              </p>
            </div>
          </div>
          {data.rage_clicks > 0 && (
            <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50/30 px-4 py-3">
              <div className="rounded-lg bg-red-100 p-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground leading-none mb-1">{t('behavioral.rageClicks')}</p>
                <p className="text-lg font-semibold tabular-nums text-red-600">
                  {data.rage_clicks.toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Top clicked elements */}
        {data.top_clicked_elements.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              {t('behavioral.topClickedElements')}
            </p>
            <div className="flex flex-col gap-1">
              {data.top_clicked_elements.map((el, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 text-sm rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors"
                >
                  <span className="text-muted-foreground tabular-nums text-xs font-medium w-8 shrink-0">
                    {el.click_count}×
                  </span>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono shrink-0">
                    {el.element_tag ?? 'unknown'}
                  </code>
                  {el.element_text && (
                    <span className="truncate text-muted-foreground">{el.element_text}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
