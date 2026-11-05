'use client'

import { useTranslation } from 'react-i18next'
import { ShoppingCart } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { EmptySection } from '@/shared/components/customize/empty-section'
import { TrendIndicator } from './trend-indicator'
import type { OverviewConversionsData } from '../types'

interface OverviewConversionsColumnProps {
  data: OverviewConversionsData
}

export function OverviewConversionsColumn({ data }: OverviewConversionsColumnProps) {
  const { t } = useTranslation('overview')

  const isEmpty = data.totalConversions === 0 && data.totalConversionsPrev === 0

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
          <ShoppingCart className="w-4 h-4 text-muted-foreground" />
          {t('columns.conversions.title')}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 space-y-5">
        {isEmpty ? (
          <EmptySection
            size="sm"
            title={t('columns.conversions.empty.title')}
            description={t('columns.conversions.empty.description')}
          />
        ) : (
          <>
            {/* Primary metric: Total Conversions */}
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">
                  {data.totalConversions.toLocaleString()}
                </span>
                <TrendIndicator
                  current={data.totalConversions}
                  previous={data.totalConversionsPrev}
                />
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t('columns.conversions.totalConversions')}
              </p>
            </div>

            {/* Secondary: Leads + Sales */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  {t('columns.conversions.leads')}
                </p>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {data.totalLeads.toLocaleString()}
                </p>
                <TrendIndicator current={data.totalLeads} previous={data.totalLeadsPrev} />
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  {t('columns.conversions.sales')}
                </p>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {data.totalSales.toLocaleString()}
                </p>
                <TrendIndicator current={data.totalSales} previous={data.totalSalesPrev} />
              </div>
            </div>

            {/* Conversion rate pills */}
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                {t('columns.conversions.rates')}
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                  {t('columns.conversions.clickToLead')}:{' '}
                  {data.clickToLeadRate > 0 ? `${data.clickToLeadRate}%` : '—'}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                  {t('columns.conversions.leadToSale')}:{' '}
                  {data.leadToSaleRate > 0 ? `${data.leadToSaleRate}%` : '—'}
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
