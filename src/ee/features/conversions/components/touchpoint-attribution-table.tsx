'use client'

import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/shared/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { formatCurrencyFromCents, normalizeCurrency } from '@/shared/lib/currency'
import { Trophy, TrendingUp, TrendingDown, Target, ArrowUpFromLine } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { useGetTouchpointAttributionFull } from '../hooks/queries'
import { ConversionFilterParams } from '@/core/types/conversions'

interface TouchpointAttributionTableProps {
  filters: ConversionFilterParams
}

export function TouchpointAttributionTable({ filters }: TouchpointAttributionTableProps) {
  const { org_id } = useParams<{ org_id: string }>()
  const { t } = useTranslation('conversions')
  const { data, isLoading } = useGetTouchpointAttributionFull(org_id, filters)

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />
  }

  const attribution = data?.data
  if (!attribution || attribution.touchpoints.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Target className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">
          {t('attribution.no_data', 'No sale data available for the selected period')}
        </p>
      </div>
    )
  }

  const avgConversionRate =
    attribution.totals.leads > 0 ? (attribution.totals.sales / attribution.totals.leads) * 100 : 0

  const defaultCurrency = normalizeCurrency(attribution.currency)

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      {/* <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg border bg-card p-3">
          <div className="text-xs text-muted-foreground mb-1">
            {t('attribution.total_visits', 'Total Visits')}
          </div>
          <div className="text-2xl font-bold">{attribution.totals.visits.toLocaleString()}</div>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <div className="text-xs text-muted-foreground mb-1">
            {t('attribution.total_leads', 'Total Leads')}
          </div>
          <div className="text-2xl font-bold text-blue-600">{attribution.totals.leads}</div>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <div className="text-xs text-muted-foreground mb-1">
            {t('attribution.total_sales', 'Total Sales')}
          </div>
          <div className="text-2xl font-bold text-purple-600">{attribution.totals.sales}</div>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <div className="text-xs text-muted-foreground mb-1">
            {t('attribution.total_revenue', 'Total Revenue')}
          </div>
          <div className="text-2xl font-bold text-emerald-600">
            {formatCurrencyFromCents(attribution.totals.revenue ?? 0, defaultCurrency)}
          </div>
        </div>
      </div> */}

      {/* Table */}
      <div className="border-y bg-card overflow-hidden">
        <div className="overflow-auto h-[320px] relative">
          <Table>
            <TableHeader className="bg-gradient-to-r from-muted/80 to-muted/40">
              <TableRow className="hover:bg-transparent border-b-2 *:sticky *:top-0">
                <TableHead className="font-semibold text-foreground">
                  {t('attribution.touchpoint', 'Link')}
                </TableHead>
                <TableHead className="text-right font-semibold text-foreground">
                  {t('attribution.visits', 'Visits')}
                </TableHead>
                <TableHead className="text-right font-semibold text-foreground">
                  <div className="flex flex-col items-end">
                    <span>{t('attribution.leads', 'Leads')}</span>
                    <span className="text-xs font-normal text-muted-foreground">Visit→Lead</span>
                  </div>
                </TableHead>
                <TableHead className="text-right font-semibold text-foreground">
                  <div className="flex flex-col items-end">
                    <span>{t('attribution.sales', 'Sales')}</span>
                    <span className="text-xs font-normal text-muted-foreground">Lead→Sale</span>
                  </div>
                </TableHead>
                <TableHead className="text-right font-semibold text-foreground">
                  <div className="flex flex-col items-end">
                    <span>{t('attribution.cvr', 'CVR')}</span>
                    <span className="text-xs font-normal text-muted-foreground">Overall</span>
                  </div>
                </TableHead>
                <TableHead className="text-right font-semibold text-foreground">
                  {t('attribution.revenue', 'Revenue')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attribution.touchpoints.map((tp, index) => {
                const isDirect = tp.touchPointId === '__direct__'
                const isTopPerformer = index === 0 && tp.revenue > 0 && !isDirect
                const isAboveAverage = tp.conversionRate > avgConversionRate

                // Calculate conversion rates
                const visitToLeadRate = tp.visitCount > 0 ? (tp.leadCount / tp.visitCount) * 100 : 0
                const leadToSaleRate = tp.leadCount > 0 ? (tp.saleCount / tp.leadCount) * 100 : 0

                const performanceIndicator =
                  tp.leadCount > 0 ? (
                    isAboveAverage ? (
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-500 inline ml-1.5" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5 text-amber-500 inline ml-1.5" />
                    )
                  ) : null

                return (
                  <TableRow
                    key={tp.touchPointId}
                    className={cn(
                      'transition-all duration-200 hover:bg-muted/50 hover:shadow-sm',
                      isTopPerformer &&
                        'bg-gradient-to-r from-emerald-50/80 to-emerald-50/40 hover:from-emerald-50 hover:to-emerald-50/60'
                    )}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2.5">
                        {isTopPerformer && (
                          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 shadow-sm">
                            <Trophy className="h-4 w-4 text-white" />
                          </div>
                        )}
                        {isDirect && (
                          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-100">
                            <ArrowUpFromLine className="h-3.5 w-3.5 text-slate-500" />
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className={cn(isTopPerformer && 'font-semibold text-foreground')}>
                            {isDirect ? t('attribution.direct') : tp.touchPointName}
                          </span>
                          {isDirect ? (
                            <span className="text-xs text-muted-foreground">
                              {t('attribution.direct_description')}
                            </span>
                          ) : tp.touchPointShortUrl ? (
                            <span className="text-xs text-muted-foreground">
                              {tp.touchPointShortUrl}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="tabular-nums font-medium">
                        {tp.visitCount.toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <span
                          className={cn(
                            'tabular-nums font-semibold',
                            tp.leadCount > 0 && 'text-blue-600'
                          )}
                        >
                          {tp.leadCount}
                        </span>
                        <span
                          className={cn(
                            'text-xs tabular-nums',
                            visitToLeadRate > 0
                              ? 'text-blue-500/70 font-medium'
                              : 'text-muted-foreground'
                          )}
                        >
                          {visitToLeadRate.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <span
                          className={cn(
                            'tabular-nums font-semibold',
                            tp.saleCount > 0 && 'text-purple-600'
                          )}
                        >
                          {tp.saleCount}
                        </span>
                        <span
                          className={cn(
                            'text-xs tabular-nums',
                            leadToSaleRate > 0
                              ? 'text-purple-500/70 font-medium'
                              : 'text-muted-foreground'
                          )}
                        >
                          {leadToSaleRate.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="inline-flex items-center tabular-nums">
                          <span
                            className={cn(
                              'font-semibold',
                              tp.conversionRate > 0 && 'text-foreground'
                            )}
                          >
                            {tp.conversionRate.toFixed(1)}%
                          </span>
                          {performanceIndicator}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={cn(
                          'font-bold tabular-nums text-base',
                          tp.revenue > 0 ? 'text-emerald-600' : 'text-muted-foreground'
                        )}
                      >
                        {formatCurrencyFromCents(tp.revenue ?? 0, defaultCurrency)}
                      </span>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
