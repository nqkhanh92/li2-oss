'use client'

import { forwardRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/components/ui/button'
import { ClipboardList, Timer, TrendingUp, AlertCircle, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { PRICING_URL } from '@/shared/constants'
import { cn } from '@/shared/lib/utils'
import { FormsOverviewRow, FormsDailyRow } from '@/core/repositories/forms-analytics.repository'
import { FormsOverviewTable } from './forms-overview-table'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/shared/components/ui/chart'
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts'
import CardSwap, { Card } from '@/shared/components/animation/card-swap'

const MOCK_OVERVIEW: FormsOverviewRow[] = [
  {
    form_id: 'contact-form',
    form_name: 'Contact Us',
    form_action: null,
    page_path: '/contact',
    fills: 312,
    submits: 218,
    completion_pct: 70,
    avg_time_on_form: 87,
  },
  {
    form_id: 'newsletter',
    form_name: 'Newsletter Signup',
    form_action: null,
    page_path: '/blog',
    fills: 541,
    submits: 189,
    completion_pct: 35,
    avg_time_on_form: 24,
  },
  {
    form_id: 'checkout',
    form_name: 'Checkout Form',
    form_action: null,
    page_path: '/checkout',
    fills: 204,
    submits: 41,
    completion_pct: 20,
    avg_time_on_form: 142,
  },
  {
    form_id: 'demo-request',
    form_name: 'Request a Demo',
    form_action: null,
    page_path: '/pricing',
    fills: 97,
    submits: 72,
    completion_pct: 74,
    avg_time_on_form: 63,
  },
]

const MOCK_DAILY: FormsDailyRow[] = [
  { day: 'Mar 1', fills: 42, submits: 28 },
  { day: 'Mar 5', fills: 67, submits: 45 },
  { day: 'Mar 9', fills: 53, submits: 31 },
  { day: 'Mar 13', fills: 89, submits: 61 },
  { day: 'Mar 17', fills: 74, submits: 52 },
  { day: 'Mar 21', fills: 112, submits: 78 },
  { day: 'Mar 25', fills: 95, submits: 70 },
]

const FEATURES = [
  { icon: ClipboardList, color: 'text-blue-500', bg: 'bg-blue-50', key: 'trackFills' },
  { icon: Timer, color: 'text-violet-500', bg: 'bg-violet-50', key: 'avgTime' },
  { icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50', key: 'completionRate' },
  { icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-50', key: 'dropOff' },
]

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

export const FormsAnalyticsDemoCard = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function FormsAnalyticsDemoCard(props, ref) {
  const { t } = useTranslation('forms-analytics')
  const totalFills = MOCK_OVERVIEW.reduce((s, r) => s + r.fills, 0)
  const totalSubmits = MOCK_OVERVIEW.reduce((s, r) => s + r.submits, 0)
  const avgCompletionPct =
    MOCK_OVERVIEW.reduce((s, r) => s + (r.completion_pct ?? 0), 0) / MOCK_OVERVIEW.length
  const chartData = MOCK_DAILY.map((r) => ({ day: r.day, fills: r.fills, submits: r.submits }))

  return (
    <Card
      ref={ref}
      customClass="!bg-card !border-border shadow-lg cursor-grab active:cursor-grabbing overflow-hidden"
      data-swap-card
      {...props}
    >
      <div className="flex flex-col h-full p-4 gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <ClipboardList className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-semibold text-foreground">
            {t('demo.features.trackFills.title', 'Form Analytics')}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 shrink-0">
          {[
            {
              label: t('kpi.totalFills'),
              value: totalFills.toLocaleString(),
              accent: 'text-blue-600',
            },
            {
              label: t('kpi.totalSubmits'),
              value: totalSubmits.toLocaleString(),
              accent: 'text-emerald-600',
            },
            {
              label: t('kpi.avgCompletionRate'),
              value: `${avgCompletionPct.toFixed(1)}%`,
              accent: completionClass(avgCompletionPct),
            },
          ].map(({ label, value, accent }) => (
            <div key={label} className="rounded-lg border bg-muted/40 px-2 py-2 text-center">
              <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
              <p className={`text-sm font-bold mt-0.5 ${accent}`}>{value}</p>
            </div>
          ))}
        </div>
        <div className="flex-1 overflow-hidden">
          <ChartContainer
            config={{
              fills: { label: t('chart.fills'), color: '#3b82f6' },
              submits: { label: t('chart.submits'), color: '#22c55e' },
            }}
            className="w-full h-full"
          >
            <AreaChart data={chartData} margin={{ left: 0, right: 8 }}>
              <defs>
                <linearGradient id="cardFillsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="cardSubmitsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} className="stroke-muted" />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tickMargin={6}
                minTickGap={32}
                tick={{ fontSize: 10 }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                dataKey="fills"
                type="monotone"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#cardFillsGrad)"
              />
              <Area
                dataKey="submits"
                type="monotone"
                stroke="#22c55e"
                strokeWidth={2}
                fill="url(#cardSubmitsGrad)"
              />
            </AreaChart>
          </ChartContainer>
        </div>
      </div>
    </Card>
  )
})

export function FormsAnalyticsDemoV2({
  canAccess = false,
  onContinue,
}: {
  canAccess?: boolean
  onContinue?: () => void
}) {
  const { t } = useTranslation('forms-analytics')
  const { t: tCommon } = useTranslation('common')

  const totalFills = MOCK_OVERVIEW.reduce((s, r) => s + r.fills, 0)
  const totalSubmits = MOCK_OVERVIEW.reduce((s, r) => s + r.submits, 0)
  const avgCompletionPct =
    MOCK_OVERVIEW.reduce((s, r) => s + (r.completion_pct ?? 0), 0) / MOCK_OVERVIEW.length
  const avgTimeOnForm =
    MOCK_OVERVIEW.reduce((s, r) => s + (r.avg_time_on_form ?? 0), 0) / MOCK_OVERVIEW.length
  const bestForm = MOCK_OVERVIEW.reduce<FormsOverviewRow | null>(
    (best, r) => (!best || (r.completion_pct ?? 0) > (best.completion_pct ?? 0) ? r : best),
    null
  )
  const chartData = MOCK_DAILY.map((r) => ({ day: r.day, fills: r.fills, submits: r.submits }))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        {/* Left 2/5: intro + features + upgrade */}
        <div className="lg:col-span-2 space-y-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-600 text-xs font-medium px-3 py-1 rounded-full">
              <Sparkles className="w-3.5 h-3.5" />
              {t('demo.badge')}
            </div>
            <h2 className="text-xl font-bold text-foreground">{t('demo.hero.title')}</h2>
            <p className="text-sm text-slate-500">{t('demo.hero.desc')}</p>
          </div>

          <div className="space-y-3">
            {FEATURES.map(({ icon: Icon, color, bg, key }) => (
              <div key={key} className="flex gap-3 items-start">
                <div className={`p-1.5 ${bg} rounded-lg shrink-0`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {t(`demo.features.${key}.title`)}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{t(`demo.features.${key}.desc`)}</p>
                </div>
              </div>
            ))}
          </div>

          {canAccess ? (
            <Button variant="default" size="lg" className="w-full" onClick={onContinue}>
              {t('demo.getStarted.cta')}
            </Button>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{t('plan_upgrade.title')}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{t('plan_upgrade.description')}</p>
                </div>
              </div>
              <Link href={PRICING_URL} className="shrink-0">
                <Button
                  variant="default"
                  size="sm"
                  className="gap-2"
                  iconLeft={<Sparkles className="w-3.5 h-3.5" />}
                >
                  {tCommon('cta.upgrade_plan')}
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Right 3/5: demo data */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center gap-2 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            {t('demo.demoNotice')}
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
            <KpiCard
              label={t('kpi.totalFills')}
              value={totalFills.toLocaleString()}
              sub={t('kpi.totalFillsSub')}
            />
            <KpiCard
              label={t('kpi.totalSubmits')}
              value={totalSubmits.toLocaleString()}
              sub={t('kpi.totalSubmitsSub')}
            />
            <KpiCard
              label={t('kpi.avgCompletionRate')}
              value={`${avgCompletionPct.toFixed(1)}%`}
              valueClass={completionClass(avgCompletionPct)}
              sub={t('kpi.avgCompletionRateSub')}
            />
            <KpiCard
              label={t('kpi.avgTimeOnForm')}
              value={formatTime(avgTimeOnForm)}
              sub={t('kpi.avgTimeOnFormSub')}
            />
            <KpiCard
              label={t('kpi.bestPerformingForm')}
              value={bestForm?.form_name ?? '—'}
              sub={
                bestForm
                  ? t('kpi.bestPerformingFormSub', { pct: bestForm.completion_pct ?? 0 })
                  : undefined
              }
            />
          </div>

          {/* Trend Chart */}
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <p className="text-sm font-medium">{t('chart.completionTrend')}</p>
            <ChartContainer
              config={{
                fills: { label: t('chart.fills'), color: '#3b82f6' },
                submits: { label: t('chart.submits'), color: '#22c55e' },
              }}
              className="w-full h-44"
            >
              <AreaChart data={chartData} margin={{ left: 0, right: 8 }}>
                <defs>
                  <linearGradient id="demoFillsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="demoSubmitsGrad" x1="0" y1="0" x2="0" y2="1">
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
                  fill="url(#demoFillsGrad)"
                />
                <Area
                  dataKey="submits"
                  type="monotone"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fill="url(#demoSubmitsGrad)"
                />
              </AreaChart>
            </ChartContainer>
          </div>

          {/* Table */}
          <div className="space-y-2">
            <p className="text-sm font-medium">{t('table.title')}</p>
            <FormsOverviewTable data={MOCK_OVERVIEW} onRowClick={() => {}} />
          </div>
        </div>
      </div>
    </div>
  )
}
