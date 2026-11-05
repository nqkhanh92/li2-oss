'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { DateRange } from 'react-day-picker'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { DateRangePicker } from '@/shared/components/customize/date-range-picker'
import { ContentLayout } from '@/shared/components/layout/content-layout'
import { useGetFunnel, useGetFunnelReport } from '../hooks/queries'
import { FunnelSummary } from './funnel-summary'
import { DropOffInsight } from './drop-off-insight'
import { FunnelMainCard } from './funnel-main-card'
import { StepDetailsTable } from './step-details-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import Link from 'next/link'
import { Button } from '@/shared/components/ui/button'
import { BarChart3, Loader2 } from 'lucide-react'

function formatDateParam(date: Date): string {
  return date.toISOString().split('T')[0]
}

export const FunnelReport = () => {
  const { t } = useTranslation('funnels')
  const { org_id, funnel_id } = useParams<{ org_id: string; funnel_id: string }>()

  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - 30)
    return { from, to }
  })

  const fromStr = useMemo(
    () => (dateRange?.from ? formatDateParam(dateRange.from) : ''),
    [dateRange?.from]
  )
  const toStr = useMemo(
    () => (dateRange?.to ? formatDateParam(dateRange.to) : ''),
    [dateRange?.to]
  )

  const [pollInterval, setPollInterval] = useState<number | false>(false)
  const { data, isLoading } = useGetFunnelReport(org_id, funnel_id, fromStr, toStr, {
    refetchInterval: pollInterval,
  })
  const report = data?.data

  useEffect(() => {
    const shouldPoll = report?.has_pageviews_in_period && !report?.is_computation_complete
    setPollInterval(shouldPoll ? 5000 : false)
  }, [report?.has_pageviews_in_period, report?.is_computation_complete])

  const { data: funnelData } = useGetFunnel(org_id, funnel_id)
  const funnelName = funnelData?.data?.name ?? report?.funnel_name ?? ''

  return (
    <ContentLayout
      title={funnelName || t('report.title', 'Funnel Report')}
      backPath={`/org/${org_id}/funnels`}
    >
      <div className="flex flex-col gap-6">
        {/* Filter */}
        <div className="flex">
          <DateRangePicker
            placeholder={t('report.selectDateRange')}
            value={dateRange}
            onValueChange={setDateRange}
            disableFutureDate
          />
        </div>

        {/* Stats */}
        {isLoading ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
            <Skeleton className="h-[60px] sm:h-[88px] flex-1" />
            <Skeleton className="h-[60px] sm:h-[88px] flex-1" />
            <Skeleton className="h-[60px] sm:h-[88px] flex-1" />
          </div>
        ) : report ? (
          <FunnelSummary
            totalEntries={report.total_entries}
            totalConversions={report.total_conversions}
            conversionRate={report.conversion_rate}
          />
        ) : null}

        {/* Alert: biggest drop-off */}
        {!isLoading && report && report.total_entries > 0 && report.steps.length > 1 && (
          <DropOffInsight steps={report.steps} />
        )}

        {/* Main card: step tabs + visitor list + session detail */}
        {isLoading ? (
          <Skeleton className="h-[480px] w-full rounded-[16px]" />
        ) : report && report.steps.length > 0 ? (
          report.total_entries === 0 ? (
            <div className="bg-card border border-slate-300 rounded-[16px] px-4 py-6 sm:px-6 sm:py-8 flex flex-col gap-3">
              {!report.has_pageviews_in_period ? (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-slate-500">
                    <BarChart3 className="w-4 h-4 shrink-0 opacity-60" />
                    <p className="text-sm">{t('report.stateNoVisitors')}</p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/org/${org_id}/onboarding`}>
                      {t('report.stateNoVisitorsCta')}
                    </Link>
                  </Button>
                </div>
              ) : !report.has_computation_results ? (
                <div className="flex items-center gap-2 text-slate-500">
                  <Loader2 className="w-4 h-4 shrink-0 animate-spin opacity-60" />
                  <p className="text-sm">{t('report.stateProcessing')}</p>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-500">
                  <BarChart3 className="w-4 h-4 shrink-0 opacity-60" />
                  <p className="text-sm">{t('report.stateNoMatches')}</p>
                </div>
              )}
            </div>
          ) : (
            <FunnelMainCard
              funnelId={funnel_id}
              steps={report.steps}
              dateRange={{ from: fromStr, to: toStr }}
            />
          )
        ) : null}

        {/* Step Summary table */}
        {!isLoading && report && report.steps.length > 0 && report.total_entries > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">{t('report.stepDetails')}</CardTitle>
            </CardHeader>
            <CardContent className="p-0 pb-3">
              <StepDetailsTable steps={report.steps} />
            </CardContent>
          </Card>
        )}

        {/* Empty state when no steps configured */}
        {!isLoading && (!report || report.steps.length === 0) && (
          <div className="bg-card border border-slate-300 rounded-[16px] flex flex-col items-center justify-center py-10 sm:py-16 text-slate-400">
            <BarChart3 className="w-12 h-12 mb-3 opacity-40" />
            <p className="text-sm font-medium">{t('report.noStepsConfigured')}</p>
          </div>
        )}
      </div>
    </ContentLayout>
  )
}
