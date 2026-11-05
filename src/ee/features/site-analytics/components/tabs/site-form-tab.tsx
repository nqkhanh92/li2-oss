'use client'

import { useMemo } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/shared/components/ui/chart'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { cn } from '@/shared/lib/utils'
import { useGetFormsOverview, useGetFormsDaily } from '@/ee/features/forms-analytics/hooks/queries'
import { FormsOverviewTable } from '@/ee/features/forms-analytics/components/forms-overview-table'

function formatTime(seconds: number | null | undefined): string {
  if (!seconds) return '—'
  if (seconds < 60) return `${Math.round(seconds)}s`
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return s > 0 ? `${m}m ${s}s` : `${m}m`
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

interface SiteFormTabProps {
  orgId: string
  fromStr: string
  toStr: string
  selectedPage: string | null
  selectedHostname: string | null
}

export function SiteFormTab({
  orgId,
  fromStr,
  toStr,
  selectedPage,
  selectedHostname,
}: SiteFormTabProps) {
  const { data: overview, isLoading: isLoadingOverview } = useGetFormsOverview(orgId, {
    date_from: fromStr,
    date_to: toStr,
    hostname: selectedHostname ?? undefined,
  })

  const { data: daily, isLoading: isLoadingDaily } = useGetFormsDaily(orgId, {
    date_from: fromStr,
    date_to: toStr,
    page_path: selectedPage ?? undefined,
    hostname: selectedHostname ?? undefined,
  })

  // Filter overview client-side by page_path when a specific page is selected
  const filteredOverview = useMemo(() => {
    if (!overview) return []
    if (selectedPage !== null) return overview.filter((r) => r.page_path === selectedPage)
    return overview
  }, [overview, selectedPage])

  const totalFills = filteredOverview.reduce((s, r) => s + r.fills, 0)
  const totalSubmits = filteredOverview.reduce((s, r) => s + r.submits, 0)
  const avgCompletionPct =
    filteredOverview.length > 0
      ? filteredOverview.reduce((s, r) => s + (r.completion_pct ?? 0), 0) / filteredOverview.length
      : 0
  const avgTimeOnForm =
    filteredOverview.length > 0
      ? filteredOverview.reduce((s, r) => s + (r.avg_time_on_form ?? 0), 0) /
        filteredOverview.length
      : null

  const completionClass =
    avgCompletionPct >= 50
      ? 'text-green-600'
      : avgCompletionPct >= 25
        ? 'text-amber-600'
        : 'text-red-600'

  const chartData = useMemo(
    () => (daily ?? []).map((r) => ({ day: r.day, fills: r.fills, submits: r.submits })),
    [daily],
  )

  return (
    <div className="flex flex-col gap-6">
      {/* KPI Cards */}
      {isLoadingOverview ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Total Fills" value={totalFills.toLocaleString()} sub="Form interactions" />
          <KpiCard
            label="Total Submits"
            value={totalSubmits.toLocaleString()}
            sub="Completed submissions"
          />
          <KpiCard
            label="Avg Completion Rate"
            value={`${avgCompletionPct.toFixed(1)}%`}
            valueClass={completionClass}
            sub="Fills → submits"
          />
          <KpiCard
            label="Avg Time on Form"
            value={formatTime(avgTimeOnForm)}
            sub="Until submission"
          />
        </div>
      )}

      {/* Trend Chart */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <p className="text-sm font-semibold">Form Activity Over Time</p>
        {isLoadingDaily ? (
          <Skeleton className="w-full h-52" />
        ) : (
          <ChartContainer
            config={{
              fills: { label: 'Fills', color: '#3b82f6' },
              submits: { label: 'Submits', color: '#22c55e' },
            }}
            className="w-full h-52"
          >
            <AreaChart data={chartData} margin={{ left: 0, right: 8 }}>
              <defs>
                <linearGradient id="sa-fillsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="sa-submitsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} className="stroke-muted" />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tick={{ fontSize: 11 }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                dataKey="fills"
                type="monotone"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#sa-fillsGrad)"
              />
              <Area
                dataKey="submits"
                type="monotone"
                stroke="#22c55e"
                strokeWidth={2}
                fill="url(#sa-submitsGrad)"
              />
            </AreaChart>
          </ChartContainer>
        )}
      </div>

      {/* Forms Table */}
      <div className="space-y-3">
        <p className="text-sm font-semibold">Forms</p>
        {isLoadingOverview ? (
          <Skeleton className="w-full h-48 rounded-lg" />
        ) : (
          <FormsOverviewTable data={filteredOverview} onRowClick={() => {}} />
        )}
      </div>
    </div>
  )
}
