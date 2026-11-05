'use client'

import { useTranslation } from 'react-i18next'
import { Link2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { EmptySection } from '@/shared/components/customize/empty-section'
import { TrendIndicator } from './trend-indicator'
import type { OverviewLinksData } from '../types'

interface OverviewClicksCardProps {
  data: OverviewLinksData
}

export function OverviewClicksCard({ data }: OverviewClicksCardProps) {
  const { t } = useTranslation('overview')

  const isEmpty = data.totalClicks === 0 && data.totalClicksPrev === 0

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Link2 className="w-4 h-4 text-muted-foreground" />
          {t('columns.links.title')}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 space-y-5">
        {isEmpty ? (
          <EmptySection
            size="sm"
            title={t('columns.links.empty.title')}
            description={t('columns.links.empty.description')}
          />
        ) : (
          <>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">
                  {data.totalClicks.toLocaleString()}
                </span>
                <TrendIndicator current={data.totalClicks} previous={data.totalClicksPrev} />
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t('columns.links.totalClicks')}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  {t('columns.links.unique')}
                </p>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {data.uniqueClicks.toLocaleString()}
                </p>
                <TrendIndicator current={data.uniqueClicks} previous={data.uniqueClicksPrev} />
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  {t('columns.links.avgPerDay')}
                </p>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {data.avgPerDay.toLocaleString()}
                </p>
                <TrendIndicator current={data.avgPerDay} previous={data.avgPerDayPrev} />
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
