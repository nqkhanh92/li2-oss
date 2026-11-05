'use client'

import { useMemo } from 'react'
import { Info } from 'lucide-react'
import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts'
import { useTranslation } from 'react-i18next'
import dayjs from '@/shared/lib/dayjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/shared/components/ui/chart'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip'
import {
  DeepLinkClickTimeseriesPoint,
  DeepLinkTimeseriesPoint,
} from '@/ee/features/deep-link-analytics/types'

/**
 * The deferred-attribution cohort over time (expert-3 review, 2026-05-27): this
 * tracks the SAME population as the headline funnel, not the sidelined app_open.
 *   - Area "Deferred opens" = deferred_match + deferred_miss (first-launch
 *     link-recovery attempts).
 *   - Line "Matched" = deferred_match (recovered the original link). The gap
 *     between the area and this line is the unmatched (missed) opens.
 *   - Line "Clicks" (muted, dashed) = web taps from the sibling visits RPC, shown
 *     as volume CONTEXT only — a separate population, never summed (decision D-A).
 * Buckets are server-chosen (hour for short ranges, else day) and merged by key.
 */
export function DeepLinkTimeseries({
  timeseries,
  clickTimeseries,
  bucket,
}: {
  timeseries: DeepLinkTimeseriesPoint[]
  clickTimeseries: DeepLinkClickTimeseriesPoint[]
  bucket: 'hour' | 'day'
}) {
  const { t } = useTranslation(['domain'])

  const chartData = useMemo(() => {
    const byBucket = new Map<
      string,
      { bucket: string; deferred_opens: number; matched: number; clicks: number }
    >()
    for (const p of timeseries) {
      byBucket.set(p.bucket, {
        bucket: p.bucket,
        deferred_opens: p.deferred_matches + p.deferred_misses,
        matched: p.deferred_matches,
        clicks: 0,
      })
    }
    for (const p of clickTimeseries) {
      const existing = byBucket.get(p.bucket)
      if (existing) existing.clicks = p.clicks
      else byBucket.set(p.bucket, { bucket: p.bucket, deferred_opens: 0, matched: 0, clicks: p.clicks })
    }
    return [...byBucket.values()].sort((a, b) => a.bucket.localeCompare(b.bucket))
  }, [timeseries, clickTimeseries])

  // Granularity comes from the server (it chose the bucket); never guess from the local hour
  // (the shared dayjs auto-applies the user's tz, so a bucket boundary would be misread). The
  // RPC buckets in the viewer's tz, returning each boundary as its timestamptz instant, so
  // format in local time (dayjs default) — the labels land on the viewer's own day/hour edges.
  const isHourly = bucket === 'hour'
  const formatBucket = (value: string) =>
    isHourly ? dayjs(value).format('MMM D, HH:mm') : dayjs(value).format('MMM D')

  // Sparse deferred data is the norm; show dots so real measured points are visible rather
  // than implying a continuous trend through the interpolated curve. Hide for dense ranges.
  const showDots = chartData.length > 0 && chartData.length <= 14

  const config = {
    deferred_opens: { label: t('domain:deepLink.analytics.deferred_opens'), color: 'var(--chart-1)' },
    matched: { label: t('domain:deepLink.analytics.matched'), color: 'var(--chart-2)' },
    clicks: { label: t('domain:deepLink.analytics.clicks'), color: 'var(--chart-3)' },
  } satisfies ChartConfig

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium">
            {t('domain:deepLink.analytics.timeseries_title')}
          </CardTitle>
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={t('domain:deepLink.analytics.timeseries_note')}
                  className="text-muted-foreground hover:text-foreground inline-flex"
                >
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs leading-relaxed">
                {t('domain:deepLink.analytics.timeseries_note')}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="text-muted-foreground flex h-[240px] items-center justify-center text-sm">
            {t('domain:deepLink.analytics.empty')}
          </div>
        ) : (
          <>
            <ChartContainer config={config} className="h-[240px] w-full">
              <ComposedChart data={chartData} margin={{ left: 4, right: 12, top: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="bucket"
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
                  dataKey="deferred_opens"
                  type="monotone"
                  fill="var(--color-deferred_opens)"
                  fillOpacity={0.2}
                  stroke="var(--color-deferred_opens)"
                  strokeWidth={2}
                  dot={showDots ? { r: 3 } : false}
                />
                <Line
                  dataKey="matched"
                  type="monotone"
                  stroke="var(--color-matched)"
                  strokeWidth={2}
                  dot={showDots ? { r: 3 } : false}
                />
                <Line
                  dataKey="clicks"
                  type="monotone"
                  stroke="var(--color-clicks)"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  strokeOpacity={0.6}
                  dot={false}
                />
              </ComposedChart>
            </ChartContainer>
          </>
        )}
      </CardContent>
    </Card>
  )
}
