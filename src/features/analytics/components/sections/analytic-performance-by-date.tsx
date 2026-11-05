'use client'

import { AnalyticByTagDataType } from '@/app/api/organizations/[org_id]/analytics/by-tags/route'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/shared/components/ui/chart'
import React from 'react'
import dayjs from '@/shared/lib/dayjs'
import { DateRange } from 'react-day-picker'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { useTranslation } from 'react-i18next'
import { AllTouchPointVariants } from '@/features/touch-points/types'

type AnalyticPerformanceByDateProps = {
  data: AnalyticByTagDataType['performance_by_date']
  dateRange?: DateRange
}

type SeriesKey =
  | 'total'
  | 'unique'
  | AllTouchPointVariants.QR
  | AllTouchPointVariants.LINK
  | AllTouchPointVariants.NFC

export const AnalyticPerformanceByDate = ({ data, dateRange }: AnalyticPerformanceByDateProps) => {
  const { t } = useTranslation(['dashboard', 'analytic'])
  const [visibleSeries, setVisibleSeries] = React.useState<Record<SeriesKey, boolean>>({
    total: true,
    unique: true,
    QR: false,
    LINK: false,
    NFC: false,
  })

  const toggleSeries = (key: SeriesKey) => {
    setVisibleSeries((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const chartData = React.useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return []

    const startDate = dayjs(dateRange.from)
    const endDate = dayjs(dateRange.to)
    const dateMap = new Map<
      string,
      { total: number; unique: number; QR: number; LINK: number; NFC: number }
    >()

    // Populate existing data
    if (data) {
      Object.entries(data).forEach(([date, values]) => {
        const dateKey = dayjs(date).format('YYYY-MM-DD')
        dateMap.set(dateKey, {
          total: values.total,
          unique: values.unique,
          QR: values.by_interaction_types?.[AllTouchPointVariants.QR] ?? 0,
          LINK: values.by_interaction_types?.[AllTouchPointVariants.LINK] ?? 0,
          NFC: values.by_interaction_types?.[AllTouchPointVariants.NFC] ?? 0,
        })
      })
    }

    // Fill in all dates in range with placeholders for missing data
    const result = []
    let currentDate = startDate
    while (currentDate.isBefore(endDate) || currentDate.isSame(endDate, 'day')) {
      const dateKey = currentDate.format('YYYY-MM-DD')
      const existingData = dateMap.get(dateKey)

      result.push({
        date: currentDate.format('MMM DD'),
        total: existingData?.total ?? 0,
        unique: existingData?.unique ?? 0,
        QR: existingData?.QR ?? 0,
        LINK: existingData?.LINK ?? 0,
        NFC: existingData?.NFC ?? 0,
      })

      currentDate = currentDate.add(1, 'day')
    }

    return result
  }, [data, dateRange])

  const seriesConfig = {
    total: { label: t('analytic:label.total_visits'), color: 'var(--color-secondary-blue)' },
    unique: { label: t('analytic:label.unique_visits'), color: 'var(--color-secondary-orange)' },
    QR: { label: t('dashboard:interaction_channels.scan'), color: 'var(--color-secondary-purple)' },
    LINK: {
      label: t('dashboard:interaction_channels.short_link'),
      color: 'var(--color-secondary-dark-cyan)',
    },
    NFC: { label: t('dashboard:interaction_channels.tap'), color: 'var(--color-pink-600)' },
  }

  return (
    <div className="flex flex-col gap-4 h-full overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <h3 className="text-base font-medium text-slate-700">
          {t('analytic:performance_by_date')}
        </h3>
      </div>

      <div className="flex items-center justify-start gap-1 px-1 shrink-0 flex-wrap md:flex-nowrap">
        {(Object.keys(seriesConfig) as SeriesKey[]).map((key) => (
          <button
            key={key}
            onClick={() => toggleSeries(key)}
            className="flex items-center gap-1 px-4 py-1.5 rounded hover:bg-slate-50 transition-colors"
          >
            <Checkbox
              checked={visibleSeries[key]}
              onCheckedChange={() => toggleSeries(key)}
              className="size-3.5"
            />
            <div
              className="size-3 rounded-full"
              style={{ backgroundColor: seriesConfig[key].color }}
            />
            <span className="text-sm text-slate-700">{seriesConfig[key].label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <ChartContainer config={seriesConfig} className="h-full w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(220 92% 62%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(220 92% 62%)" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="fillUnique" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(0.6776 0.192952 45.2346)" stopOpacity={0.3} />
                  <stop
                    offset="95%"
                    stopColor="oklch(0.6776 0.192952 45.2346)"
                    stopOpacity={0.05}
                  />
                </linearGradient>
                <linearGradient id="fillQR" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(0.4141 0.2126 280.37)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="oklch(0.4141 0.2126 280.37)" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="fillLINK" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(0.6548 0.1094 194.81)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="oklch(0.6548 0.1094 194.81)" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="fillNFC" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(330 81% 60%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(330 81% 60%)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="0"
                stroke="#01012E"
                strokeOpacity={0.1}
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fill: '#60646c', fontSize: 12 }}
              />
              <YAxis hide />
              <ChartTooltip content={<ChartTooltipContent />} />
              {visibleSeries.total && (
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="hsl(220 92% 62%)"
                  strokeWidth={2}
                  fill="url(#fillTotal)"
                  fillOpacity={1}
                />
              )}
              {visibleSeries.unique && (
                <Area
                  type="monotone"
                  dataKey="unique"
                  stroke="oklch(0.6776 0.192952 45.2346)"
                  strokeWidth={2}
                  fill="url(#fillUnique)"
                  fillOpacity={1}
                />
              )}
              {visibleSeries.QR && (
                <Area
                  type="monotone"
                  dataKey="QR"
                  stroke="oklch(0.4141 0.2126 280.37)"
                  strokeWidth={2}
                  fill="url(#fillQR)"
                  fillOpacity={1}
                />
              )}
              {visibleSeries.LINK && (
                <Area
                  type="monotone"
                  dataKey="LINK"
                  stroke="oklch(0.6548 0.1094 194.81)"
                  strokeWidth={2}
                  fill="url(#fillLINK)"
                  fillOpacity={1}
                />
              )}
              {visibleSeries.NFC && (
                <Area
                  type="monotone"
                  dataKey="NFC"
                  stroke="hsl(330 81% 60%)"
                  strokeWidth={2}
                  fill="url(#fillNFC)"
                  fillOpacity={1}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </div>
  )
}
