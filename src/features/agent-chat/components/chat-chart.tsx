'use client'

/**
 * One chart on an assistant message — Track 3 of the message render (prose → approval card → chart).
 *
 * The data comes from a structured `chart` SSE event (never parsed out of the model's prose), so
 * this component is dumb: it takes a typed ChartState and draws it. This is why the chart can never
 * garble the way a model-drawn ASCII/text chart did — structured data in, real recharts out. Mirrors
 * the deep-link-analytics timeseries chart (ChartContainer + recharts + CSS-var theming).
 */

import { useMemo } from 'react'
import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts'
import { useTranslation } from 'react-i18next'
import dayjs from '@/shared/lib/dayjs'
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/shared/components/ui/chart'
import type { ChartState } from '../types'

export function ChatChart({ chart }: { chart: ChartState }) {
  // Currently one chart kind; switch here as more are added (top-links bar chart, etc.).
  if (chart.kind === 'clicks_timeseries') {
    return <ClicksTimeseriesChart chart={chart} />
  }
  return null
}

function ClicksTimeseriesChart({ chart }: { chart: ChartState }) {
  const { t } = useTranslation('agent-chat')
  const { granularity, buckets } = chart.data

  // Map the tool buckets to chart rows keyed on `start` (the bucket boundary). No transform of the
  // numbers — they are rendered exactly as the tool returned them.
  const chartData = useMemo(
    () =>
      buckets.map((b) => ({
        start: b.start,
        link_clicks: b.link_clicks,
        qr_scans: b.qr_scans,
        nfc_taps: b.nfc_taps,
      })),
    [buckets]
  )

  // Label buckets by granularity: a daily bucket is one day ("Jul 6"); a WEEKLY bucket sums 7 days
  // from its start, so label the range ("Jul 6–12") — a bare "Jul 6" would misread a weekly sum as
  // a single day. dayjs applies the viewer's tz. li2-ai returns granularity='weekly' for >31 days.
  const formatBucket = (value: string) => {
    const start = dayjs(value)
    if (granularity === 'weekly') {
      return `${start.format('MMM D')}–${start.add(6, 'day').format('D')}`
    }
    return start.format('MMM D')
  }

  // Few points → show dots so sparse real measurements are visible, not implied by interpolation.
  const showDots = chartData.length > 0 && chartData.length <= 14

  const config = {
    link_clicks: { label: t('chart.linkClicks'), color: 'var(--chart-1)' },
    qr_scans: { label: t('chart.qrScans'), color: 'var(--chart-2)' },
    nfc_taps: { label: t('chart.nfcTaps'), color: 'var(--chart-3)' },
  } satisfies ChartConfig

  if (chartData.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        {t('chart.noData')}
      </div>
    )
  }

  return (
    <div className="rounded-lg border p-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground">{t('chart.title')}</p>
      <ChartContainer config={config} className="h-[200px] w-full">
        <ComposedChart data={chartData} margin={{ left: 4, right: 12, top: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="start"
            tickFormatter={formatBucket}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={24}
          />
          <YAxis tickLine={false} axisLine={false} width={28} allowDecimals={false} />
          <ChartTooltip
            content={<ChartTooltipContent labelFormatter={(v) => formatBucket(String(v))} />}
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Area
            dataKey="link_clicks"
            type="monotone"
            fill="var(--color-link_clicks)"
            fillOpacity={0.2}
            stroke="var(--color-link_clicks)"
            strokeWidth={2}
            dot={showDots ? { r: 3 } : false}
          />
          <Line
            dataKey="qr_scans"
            type="monotone"
            stroke="var(--color-qr_scans)"
            strokeWidth={2}
            dot={showDots ? { r: 3 } : false}
          />
          <Line
            dataKey="nfc_taps"
            type="monotone"
            stroke="var(--color-nfc_taps)"
            strokeWidth={2}
            dot={showDots ? { r: 3 } : false}
          />
        </ComposedChart>
      </ChartContainer>
    </div>
  )
}
