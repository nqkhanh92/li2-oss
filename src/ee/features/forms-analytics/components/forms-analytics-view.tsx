'use client'

import React from 'react'
import { useTranslation } from 'react-i18next'
import { DateRange } from 'react-day-picker'
import { DateRangePicker } from '@/shared/components/customize/date-range-picker'
import { FormsOverviewRow, FormsDailyRow } from '@/core/repositories/forms-analytics.repository'
import { FormsOverviewTable } from './forms-overview-table'
import { FormDetailPanel } from './form-detail-panel'
import { Skeleton } from '@/shared/components/ui/skeleton'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/shared/components/ui/chart'
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts'
import { cn } from '@/shared/lib/utils'

function formatTime(seconds: number | null | undefined): string {
  if (!seconds) return '—'
  if (seconds < 60) return `${Math.round(seconds)}s`
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

function completionClass(pct: number): string {
  if (pct >= 50) return 'text-green-600'
  if (pct >= 25) return 'text-amber-600'
  return 'text-red-600'
}

function KpiCard({
  label,
  value,
  sub,
  valueClass,
}: {
  label: string
  value: React.ReactNode
  sub?: string
  valueClass?: string
}) {
  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col gap-1">
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <p className={cn('text-2xl font-bold truncate', valueClass)}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

export interface FormsAnalyticsViewProps {
  overview: FormsOverviewRow[]
  trendData: FormsDailyRow[]
  dailyData: FormsDailyRow[]
  isLoadingOverview: boolean
  isLoadingTrend: boolean
  isLoadingDaily: boolean
  dateRange: DateRange
  onDateRangeChange: (v: DateRange) => void
  selectedForm: FormsOverviewRow | null
  onRowClick: (row: FormsOverviewRow) => void
  sheetOpen: boolean
  onSheetOpenChange: (open: boolean) => void
  showDetailPanel?: boolean
}

export function FormsAnalyticsView({
  overview,
  trendData,
  dailyData,
  isLoadingOverview,
  isLoadingTrend,
  isLoadingDaily,
  dateRange,
  onDateRangeChange,
  selectedForm,
  onRowClick,
  sheetOpen,
  onSheetOpenChange,
  showDetailPanel = true,
}: FormsAnalyticsViewProps) {
  const { t } = useTranslation('forms-analytics')

  const totalFills = overview.reduce((s, r) => s + r.fills, 0)
  const totalSubmits = overview.reduce((s, r) => s + r.submits, 0)
  const avgCompletionPct =
    overview.length > 0
      ? overview.reduce((s, r) => s + (r.completion_pct ?? 0), 0) / overview.length
      : 0
  const avgTimeOnForm =
    overview.length > 0
      ? overview.reduce((s, r) => s + (r.avg_time_on_form ?? 0), 0) / overview.length
      : null
  const bestForm = overview.reduce<FormsOverviewRow | null>(
    (best, r) => (!best || (r.completion_pct ?? 0) > (best.completion_pct ?? 0) ? r : best),
    null
  )
  const bestFormLabel =
    bestForm?.form_id ?? bestForm?.form_name ?? bestForm?.form_action ?? bestForm?.page_path ?? '—'

  const chartData = trendData.map((row) => ({
    day: row.day,
    fills: row.fills,
    submits: row.submits,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-l font-semibold">{t('page.title')}</h1>
        <DateRangePicker
          placeholder={t('page.selectDateRange')}
          value={dateRange}
          onValueChange={(v) => v && onDateRangeChange(v)}
          disableFutureDate
        />
      </div>

      {/* KPI Cards */}
      {isLoadingOverview ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          <KpiCard label={t('kpi.totalFills')} value={totalFills.toLocaleString()} sub={t('kpi.totalFillsSub')} />
          <KpiCard label={t('kpi.totalSubmits')} value={totalSubmits.toLocaleString()} sub={t('kpi.totalSubmitsSub')} />
          <KpiCard
            label={t('kpi.avgCompletionRate')}
            value={`${avgCompletionPct.toFixed(1)}%`}
            valueClass={completionClass(avgCompletionPct)}
            sub={t('kpi.avgCompletionRateSub')}
          />
          <KpiCard label={t('kpi.avgTimeOnForm')} value={formatTime(avgTimeOnForm)} sub={t('kpi.avgTimeOnFormSub')} />
          <KpiCard
            label={t('kpi.bestPerformingForm')}
            value={bestFormLabel}
            sub={bestForm ? t('kpi.bestPerformingFormSub', { pct: bestForm.completion_pct ?? 0 }) : undefined}
          />
        </div>
      )}

      {/* Trend Chart */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <p className="text-sm font-medium">{t('chart.completionTrend')}</p>
        {isLoadingTrend ? (
          <Skeleton className="w-full h-52" />
        ) : (
          <ChartContainer
            config={{
              fills: { label: t('chart.fills'), color: '#3b82f6' },
              submits: { label: t('chart.submits'), color: '#22c55e' },
            }}
            className="w-full h-52"
          >
            <AreaChart data={chartData} margin={{ left: 0, right: 8 }}>
              <defs>
                <linearGradient id="fillsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="submitsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} className="stroke-muted" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32} tick={{ fontSize: 11 }} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name, props) => {
                      const fills = props.payload?.fills ?? 0
                      const submits = props.payload?.submits ?? 0
                      const dayPct = fills > 0 ? ((submits / fills) * 100).toFixed(1) + '%' : '—'
                      return name === 'submits'
                        ? [t('chart.completionLabel', { value, pct: dayPct }), t('chart.submits')]
                        : [`${value}`, t('chart.fills')]
                    }}
                  />
                }
              />
              <Area dataKey="fills" type="monotone" stroke="#3b82f6" strokeWidth={2} fill="url(#fillsGrad)" />
              <Area dataKey="submits" type="monotone" stroke="#22c55e" strokeWidth={2} fill="url(#submitsGrad)" />
            </AreaChart>
          </ChartContainer>
        )}
      </div>

      {/* Table */}
      <div className="space-y-3">
        <p className="text-sm font-medium">{t('table.title')}</p>
        {isLoadingOverview ? (
          <Skeleton className="w-full h-48 rounded-lg" />
        ) : (
          <FormsOverviewTable data={overview} onRowClick={onRowClick} />
        )}
      </div>

      {/* Detail Sheet */}
      {showDetailPanel && (
        <FormDetailPanel
          form={selectedForm}
          dailyData={dailyData}
          isLoadingDaily={isLoadingDaily}
          open={sheetOpen}
          onOpenChange={onSheetOpenChange}
        />
      )}
    </div>
  )
}
