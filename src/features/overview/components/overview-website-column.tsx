'use client'

import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { EmptySection } from '@/shared/components/customize/empty-section'
import { TrendIndicator } from './trend-indicator'
import type { OverviewWebsiteData } from '../types'

interface OverviewWebsiteColumnProps {
  data: OverviewWebsiteData
}

export function OverviewWebsiteColumn({ data }: OverviewWebsiteColumnProps) {
  const { t } = useTranslation('overview')

  const isEmpty = data.totalPageviews === 0 && data.totalPageviewsPrev === 0

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Globe className="w-4 h-4 text-muted-foreground" />
          {t('columns.website.title')}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 space-y-5">
        {isEmpty ? (
          <EmptySection
            size="sm"
            title={t('columns.website.empty.title')}
            description={t('columns.website.empty.description')}
          />
        ) : (
          <>
            {/* Primary metric: Pageviews */}
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">
                  {data.totalPageviews.toLocaleString()}
                </span>
                <TrendIndicator current={data.totalPageviews} previous={data.totalPageviewsPrev} />
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t('columns.website.pageviews')}
              </p>
            </div>

            {/* Secondary metrics: Visitors + Sessions */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  {t('columns.website.visitors')}
                </p>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {data.uniqueVisitors.toLocaleString()}
                </p>
                <TrendIndicator current={data.uniqueVisitors} previous={data.uniqueVisitorsPrev} />
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  {t('columns.website.sessions')}
                </p>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {data.totalSessions.toLocaleString()}
                </p>
                <TrendIndicator current={data.totalSessions} previous={data.totalSessionsPrev} />
              </div>
            </div>

            {/* Top Sources */}
            {data.topSources.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  {t('columns.website.topSources')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {data.topSources.map((src) => (
                    <span
                      key={src.name}
                      className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700"
                    >
                      {src.name}: {src.percentage.toFixed(1)}%
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Top Pages */}
            {data.topPages.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  {t('columns.website.topPages')}
                </p>
                <div className="space-y-1.5">
                  {data.topPages.slice(0, 3).map((page) => (
                    <div
                      key={`${page.hostname}${page.path}`}
                      className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm"
                    >
                      <span className="truncate text-slate-700 max-w-[70%]">
                        <span className="text-muted-foreground">{page.hostname}</span>
                        {page.path}
                      </span>
                      <span className="font-medium text-foreground">
                        {page.count.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
