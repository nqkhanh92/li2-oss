'use client'

import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { DateRange } from 'react-day-picker'
import { useGetTouchpointAttribution, TouchpointAttribution } from '../hooks/queries'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { formatCurrencyFromCents, normalizeCurrency } from '@/shared/lib/currency'
import { Trophy, TrendingUp, TrendingDown, Target } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Card, CardContent } from '@/shared/components/ui/card'

interface TouchpointAttributionCardsProps {
  dateRange?: DateRange
  touchPointId?: string
}

export function TouchpointAttributionCards({
  dateRange,
  touchPointId,
}: TouchpointAttributionCardsProps) {
  const { org_id } = useParams<{ org_id: string }>()
  const { t } = useTranslation('conversions')
  const { data, isLoading } = useGetTouchpointAttribution(org_id, dateRange, touchPointId)

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    )
  }

  const attribution = data?.data

  // Calculate average conversion rate for comparison
  const avgConversionRate =
    attribution && attribution.totals.leads > 0
      ? (attribution.totals.sales / attribution.totals.leads) * 100
      : 0

  // Filter to only show touchpoints with some activity
  const activeToushpoints =
    attribution?.touchpoints.filter((tp) => tp.leadCount > 0 || tp.saleCount > 0) || []

  const hasNoData = !attribution || activeToushpoints.length === 0

  if (hasNoData) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Target className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">
          {t('attribution.no_data', 'No sale data available for the selected period')}
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {activeToushpoints.slice(0, 3).map((tp, index) => (
        <TouchpointCard
          key={tp.touchPointId}
          attribution={tp}
          isTopPerformer={index === 0 && tp.revenue > 0}
          avgConversionRate={avgConversionRate}
          currency={normalizeCurrency(attribution!.currency)}
        />
      ))}
    </div>
  )
}

function TouchpointCard({
  attribution,
  isTopPerformer,
  avgConversionRate,
  currency,
}: {
  attribution: TouchpointAttribution
  isTopPerformer: boolean
  avgConversionRate: number
  currency: ReturnType<typeof normalizeCurrency>
}) {
  const { t } = useTranslation('conversions')

  const isAboveAverage = attribution.conversionRate > avgConversionRate
  const performanceIndicator =
    attribution.leadCount > 0 ? (
      isAboveAverage ? (
        <TrendingUp className="h-4 w-4 text-emerald-500" />
      ) : (
        <TrendingDown className="h-4 w-4 text-amber-500" />
      )
    ) : null

  return (
    <Card
      className={cn('relative overflow-hidden', isTopPerformer && 'ring-2 ring-emerald-500/50')}
    >
      {isTopPerformer && (
        <div className="absolute top-2 right-2">
          <Trophy className="h-4 w-4 text-amber-500" />
        </div>
      )}
      <CardContent className="p-4">
        <div className="font-medium truncate mb-3">{attribution.touchPointName}</div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-muted-foreground">{t('attribution.leads', 'Leads')}</div>
            <div className="font-semibold">{attribution.leadCount}</div>
          </div>

          <div>
            <div className="text-muted-foreground">{t('attribution.sales', 'Sales')}</div>
            <div className="font-semibold">{attribution.saleCount}</div>
          </div>

          <div>
            <div className="text-muted-foreground flex items-center gap-1">
              {t('attribution.cvr', 'CVR')}
              {performanceIndicator}
            </div>
            <div className="font-semibold">{attribution.conversionRate.toFixed(1)}%</div>
          </div>

          <div>
            <div className="text-muted-foreground">{t('attribution.revenue', 'Revenue')}</div>
            <div className="font-semibold text-emerald-600">
              {formatCurrencyFromCents(attribution.revenue, currency)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
