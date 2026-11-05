'use client'

import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts'
import { useTranslation } from 'react-i18next'
import { ChartConfig, ChartContainer, ChartTooltip } from '@/shared/components/ui/chart'
import { WidgetCard } from './widget-card'

// Clipboard deferred-funnel miss reasons, rendered as bars even at zero
// (architecture.md §5) so the clipboard_denied : clipboard_empty : opt_out ratio
// (the Phase 4 D-3.B signal) is always legible. Sorted desc so the dominant
// reasons read top-down.
//
// ua_mismatch + ambiguous_candidate are produced ONLY by the IP resolver, which
// is paused (LI2_IP_FALLBACK_ENABLED=false) — omitted so the card isn't cluttered
// with permanently-empty jargon bars. Re-add both when IP fallback unpauses.
const MISS_REASON_KEYS = [
  'clipboard_denied',
  'clipboard_empty',
  'opt_out',
  'no_candidate',
  'cross_tenant_blocked',
] as const

export function MissReasonDistribution({ data }: { data: Record<string, number> }) {
  const { t } = useTranslation(['domain'])

  const chartData = MISS_REASON_KEYS.map((key, index) => ({
    key,
    label: t(`domain:deepLink.analytics.miss_reason.${key}`),
    value: data?.[key] ?? 0,
    fill: `var(--chart-${(index % 6) + 1})`,
  })).sort((a, b) => b.value - a.value)

  const config = chartData.reduce(
    (acc, item) => {
      acc[item.label] = { label: item.label, color: item.fill }
      return acc
    },
    {} as Record<string, { label: string; color: string }>
  ) satisfies ChartConfig

  const total = chartData.reduce((sum, d) => sum + d.value, 0)

  return (
    <WidgetCard title={t('domain:deepLink.analytics.miss_reasons_title')}>
      <ChartContainer config={config} className="h-full w-full">
        <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
          <YAxis
            type="category"
            dataKey="label"
            width={120}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <ChartTooltip
            cursor={false}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const row = payload[0].payload as (typeof chartData)[number]
                const pct = total > 0 ? Math.round((row.value / total) * 100) : 0
                // `no_candidate` is the one bucket whose human label ("No matching tap
                // found") doesn't self-explain — it collapses two distinct causes (no
                // prior tap, OR tap was too old). Surface the explanation on hover.
                const explainKey = `domain:deepLink.analytics.miss_reason.${row.key}_tooltip`
                const explanation = t(explainKey, { defaultValue: '' })
                return (
                  <div className="bg-background max-w-xs rounded-md border p-2 shadow-lg">
                    <div className="font-medium">{row.label}</div>
                    <div className="text-muted-foreground text-sm">
                      {row.value.toLocaleString()} ({pct}%) · {row.key}
                    </div>
                    {explanation && (
                      <div className="text-muted-foreground mt-1 text-xs leading-relaxed">
                        {explanation}
                      </div>
                    )}
                  </div>
                )
              }
              return null
            }}
          />
          <Bar dataKey="value" radius={[0, 6, 6, 0]}>
            {chartData.map((entry) => (
              <Cell key={entry.key} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </WidgetCard>
  )
}
