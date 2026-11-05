'use client'

import { Card, CardContent } from '@/shared/components/ui/card'
import { useGetConversionStats } from '../hooks/queries'
import { Users, TrendingUp, ShoppingCart, DollarSign } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { formatCurrencyFromCents, useOrganizationCurrency } from '@/shared/lib/currency'
import { DateRange } from 'react-day-picker'
import { AllTouchPointVariants } from '@/features/touch-points/types'
import { ConversionSource } from '@/core/types/conversions'

interface ConversionStatsProps {
  orgId: string
  filters: {
    dateRange?: DateRange
    tagIds?: string[]
    tpIds?: string[]
    collectionIds?: string[]
    includeNullCollection?: boolean
    excludeBot?: boolean
    utmSourceValues?: string[]
    utmMediumValues?: string[]
    utmCampaignValues?: string[]
    interactionTypes?: AllTouchPointVariants[]
    userId?: string
    source?: ConversionSource
    eventNames?: string[]
    utmSources?: string[]
    channels?: string[]
  }
}

export function ConversionStats({ orgId, filters }: ConversionStatsProps) {
  const { data, isLoading } = useGetConversionStats(orgId, {
    startDate: filters.dateRange?.from?.toISOString(),
    endDate: filters.dateRange?.to?.toISOString(),
    touchPointIds: filters.tpIds,
    tagIds: filters.tagIds,
    collectionIds: filters.collectionIds,
    excludeBot: filters.excludeBot,
    source: filters.source,
    eventNames: filters.eventNames,
    utmSources: filters.utmSources,
    channels: filters.channels,
  })

  const { t } = useTranslation('conversions')
  const defaultCurrency = useOrganizationCurrency()

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex gap-4 items-center">
                <Skeleton className="size-[42px] rounded-lg shrink-0" />
                <div className="flex flex-col gap-1 flex-1">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const stats = data?.data

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Customers */}
      <Card>
        <CardContent className="p-6">
          <div className="flex gap-4 items-center">
            <div className="bg-slate-50 flex items-center justify-center rounded-lg shrink-0 size-[42px]">
              <Users className="size-7 text-secondary-dark-cyan" />
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-base text-slate-500">
                {t('stats.totalCustomers', 'Total Customers')}
              </p>
              <p className="text-xl font-medium text-slate-700">
                {(stats?.totalCustomers ?? 0).toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Leads */}
      <Card>
        <CardContent className="p-6">
          <div className="flex gap-4 items-center">
            <div className="bg-slate-50 flex items-center justify-center rounded-lg shrink-0 size-[42px]">
              <TrendingUp className="size-7 text-secondary-orange" />
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-base text-slate-500">{t('stats.totalLeads', 'Total Leads')}</p>
              <p className="text-xl font-medium text-slate-700">
                {(stats?.totalLeads ?? 0).toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Sales */}
      <Card>
        <CardContent className="p-6">
          <div className="flex gap-4 items-center">
            <div className="bg-slate-50 flex items-center justify-center rounded-lg shrink-0 size-[42px]">
              <ShoppingCart className="size-7 text-secondary-purple" />
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-base text-slate-500">{t('stats.totalSales', 'Total Sales')}</p>
              <p className="text-xl font-medium text-slate-700">
                {(stats?.totalSales ?? 0).toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Revenue */}
      <Card>
        <CardContent className="p-6">
          <div className="flex gap-4 items-center">
            <div className="bg-slate-50 flex items-center justify-center rounded-lg shrink-0 size-[42px]">
              <DollarSign className="size-7 text-secondary-blue" />
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-base text-slate-500">{t('stats.totalRevenue', 'Total Revenue')}</p>
              <p className="text-xl font-medium text-slate-700">
                {formatCurrencyFromCents(stats?.totalRevenue ?? 0, defaultCurrency)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
