'use client'

import { useTranslation } from 'react-i18next'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/shared/components/ui/sheet'
import { FormsDailyRow, FormsOverviewRow } from '@/core/repositories/forms-analytics.repository'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/shared/components/ui/chart'
import { CartesianGrid, Line, LineChart, XAxis } from 'recharts'
import { Skeleton } from '@/shared/components/ui/skeleton'

function formatTime(seconds: number | null): string {
  if (!seconds) return '—'
  if (seconds < 60) return `${Math.round(seconds)}s`
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

function TimeSignal({ seconds }: { seconds: number | null }) {
  const { t } = useTranslation('forms-analytics')
  if (!seconds) return null
  if (seconds < 30) return <p className="text-xs text-semantic-success mt-1">{t('detail.fastCompletion')}</p>
  if (seconds < 120) return <p className="text-xs text-muted-foreground mt-1">{t('detail.normal')}</p>
  if (seconds < 300)
    return <p className="text-xs text-semantic-warning mt-1">{t('detail.struggling')}</p>
  return <p className="text-xs text-semantic-error mt-1">{t('detail.highFriction')}</p>
}

function formLabel(row: FormsOverviewRow, unknownForm: string): string {
  return row.form_id ?? row.form_name ?? row.form_action ?? row.page_path ?? unknownForm
}

type Props = {
  form: FormsOverviewRow | null
  dailyData: FormsDailyRow[]
  isLoadingDaily: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FormDetailPanel({ form, dailyData, isLoadingDaily, open, onOpenChange }: Props) {
  const { t } = useTranslation('forms-analytics')
  if (!form) return null

  const completionPct = form.completion_pct ?? 0
  const droppedPct = Math.max(0, 100 - completionPct)

  const chartData = dailyData.map((row) => ({
    day: row.day,
    fills: row.fills,
    submits: row.submits,
  }))

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[520px] max-w-full overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-base font-semibold">{formLabel(form, t('detail.unknownForm'))}</SheetTitle>
          {form.page_path && (
            <p className="text-xs text-muted-foreground truncate">{form.page_path}</p>
          )}
        </SheetHeader>

        {/* Conversion Funnel */}
        <section className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            {t('detail.conversionFunnel')}
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="w-16 text-xs text-muted-foreground shrink-0">{t('detail.fills')}</span>
              <div className="flex-1 h-5 rounded bg-muted overflow-hidden">
                <div className="h-full bg-blue-500 rounded" style={{ width: '100%' }} />
              </div>
              <span className="w-16 text-right text-sm font-medium tabular-nums">
                {form.fills.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-16 text-xs text-muted-foreground shrink-0">{t('detail.submits')}</span>
              <div className="flex-1 h-5 rounded bg-muted overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded"
                  style={{ width: `${completionPct}%` }}
                />
              </div>
              <span className="w-16 text-right text-sm font-medium tabular-nums">
                {form.submits.toLocaleString()}
              </span>
            </div>
          </div>
          <div className="flex gap-4 mt-2 text-xs">
            <span className="text-semantic-success font-medium">{t('detail.completed', { pct: completionPct })}</span>
            <span className="text-muted-foreground">{t('detail.droppedOff', { pct: droppedPct.toFixed(1) })}</span>
          </div>
        </section>

        {/* Avg Time on Form */}
        <section className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            {t('detail.avgTimeOnForm')}
          </p>
          <p className="text-3xl font-bold">{formatTime(form.avg_time_on_form)}</p>
          <TimeSignal seconds={form.avg_time_on_form} />
        </section>

        {/* Daily Trend */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            {t('detail.dailyTrend')}
          </p>
          {isLoadingDaily ? (
            <Skeleton className="w-full h-48" />
          ) : (
            <ChartContainer
              config={{
                fills: { label: t('detail.fills'), color: 'var(--color-blue-500)' },
                submits: { label: t('detail.submits'), color: 'var(--color-green-500)' },
              }}
              className="w-full h-48"
            >
              <LineChart data={chartData} margin={{ left: 0, right: 8 }}>
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
                <Line
                  dataKey="fills"
                  type="monotone"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  dataKey="submits"
                  type="monotone"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          )}
        </section>
      </SheetContent>
    </Sheet>
  )
}
