'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { cn } from '@/shared/lib/utils'
import { OVERVIEW_CHART_COLORS } from '@/shared/constants/overview-colors'
import { disabledFeatures } from '@/shared/constants/disabled-features'
import type { OverviewTrendPoint } from '../types'

type Metric = 'clicks' | 'pageviews' | 'conversions'

interface OverviewTrendChartProps {
  data: OverviewTrendPoint[]
  isPro: boolean
}

const SAMPLE_PAGEVIEWS = [340, 290, 410, 380, 520, 460, 300]
const SAMPLE_CONVERSIONS = [8, 5, 12, 10, 18, 14, 7]

const HIDDEN_METRICS: Partial<Record<Metric, boolean>> = {
  pageviews: disabledFeatures.BEHAVIOR_ANALYTICS,
  conversions: disabledFeatures.ATTRIBUTION,
}

const ALL_METRICS: { key: Metric; proOnly: boolean }[] = [
  { key: 'clicks', proOnly: false },
  { key: 'pageviews', proOnly: true },
  { key: 'conversions', proOnly: true },
]

const METRICS = ALL_METRICS.filter(({ key }) => !HIDDEN_METRICS[key])

export function OverviewTrendChart({ data, isPro }: OverviewTrendChartProps) {
  const { t, i18n } = useTranslation('overview')
  const locale = i18n.language
  const [activeMetric, setActiveMetric] = useState<Metric>('clicks')

  const isLocked = !isPro && activeMetric !== 'clicks'

  const chartData = isLocked
    ? data.map((point, i) => ({
        ...point,
        pageviews: SAMPLE_PAGEVIEWS[i] ?? 0,
        conversions: SAMPLE_CONVERSIONS[i] ?? 0,
      }))
    : data

  const strokeColor = OVERVIEW_CHART_COLORS[activeMetric]
  const fillColor = `${strokeColor}10`

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-foreground">
            {t('chart.title')}
          </CardTitle>

          {/* Metric toggle tabs */}
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            {METRICS.map(({ key, proOnly }) => {
              const isActive = activeMetric === key
              const needsPro = proOnly && !isPro
              return (
                <button
                  key={key}
                  onClick={() => setActiveMetric(key)}
                  className={cn(
                    'relative rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-white text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-slate-700'
                  )}
                >
                  {t(`chart.legend.${key}`)}
                  {needsPro && (
                    <span className="ml-1 rounded border border-slate-200 bg-slate-100 px-1 py-px text-[9px] font-semibold text-slate-400">
                      PRO
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="relative h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="metricFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={strokeColor} stopOpacity={0.12} />
                  <stop offset="100%" stopColor={strokeColor} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="date"
                tickFormatter={(value: string) => {
                  const [y, m, d] = value.split('-').map(Number)
                  const date = new Date(Date.UTC(y, m - 1, d))
                  return date.toLocaleDateString(locale, { weekday: 'short', timeZone: 'UTC' })
                }}
                tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: '1px solid var(--color-border)',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
              />
              <Area
                type="monotone"
                dataKey={activeMetric}
                name={t(`chart.legend.${activeMetric}`)}
                stroke={strokeColor}
                strokeWidth={2}
                fill="url(#metricFill)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: strokeColor }}
                strokeOpacity={isLocked ? 0.25 : 1}
                fillOpacity={isLocked ? 0.05 : 1}
              />
            </AreaChart>
          </ResponsiveContainer>

          {/* Locked overlay for Pro metrics */}
          {isLocked && (
            <div className="absolute inset-0 flex items-center justify-center">
              <a
                href="https://li2.ai/pricing"
                className="rounded-lg border border-slate-200 bg-white/90 px-4 py-2 text-xs font-medium text-primary shadow-sm backdrop-blur-sm transition-colors hover:bg-white"
              >
                {t('locked.upgradeCta')}
              </a>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
