'use client'

import { forwardRef } from 'react'
import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Card as UiCard, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { GitMerge, MousePointerClick, TrendingUp, Users, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { PRICING_URL } from '@/shared/constants'
import { FunnelStep, StepMetrics } from '../types'
import { FunnelChart } from './funnel-chart'
import { FunnelSummary } from './funnel-summary'
import CardSwap, { Card } from '@/shared/components/animation/card-swap'

const MOCK_STEPS: StepMetrics[] = [
  {
    step_position: 1,
    step_name: 'Landing Page',
    visits: 1240,
    entries: 1240,
    proceeds: 830,
    drop_offs: 410,
    drop_off_rate: 33,
    skips: 0,
  },
  {
    step_position: 2,
    step_name: 'Product Page',
    visits: 830,
    entries: 830,
    proceeds: 510,
    drop_offs: 320,
    drop_off_rate: 38,
    skips: 0,
  },
  {
    step_position: 3,
    step_name: 'Checkout',
    visits: 510,
    entries: 510,
    proceeds: 210,
    drop_offs: 300,
    drop_off_rate: 59,
    skips: 0,
  },
  {
    step_position: 4,
    step_name: 'Purchase',
    visits: 210,
    entries: 210,
    proceeds: 210,
    drop_offs: 0,
    drop_off_rate: 0,
    skips: 0,
  },
]

const MOCK_STEP_CONFIGS = new Map<number, FunnelStep>(
  MOCK_STEPS.map((s) => [
    s.step_position,
    {
      id: `mock-${s.step_position}`,
      funnel_id: 'mock',
      position: s.step_position,
      name: s.step_name,
      pattern_type: 'page',
      condition: 'contains',
      pattern: '/',
      is_required: true,
      event_name: null,
      created_at: '',
    },
  ])
)

const FEATURES = [
  { icon: MousePointerClick, color: 'text-blue-500', bg: 'bg-blue-50', key: 'trackJourney' },
  { icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50', key: 'findDropOff' },
  { icon: Users, color: 'text-violet-500', bg: 'bg-violet-50', key: 'visitorDrilldown' },
  { icon: GitMerge, color: 'text-amber-500', bg: 'bg-amber-50', key: 'multiStep' },
]

export const FunnelDemoCard = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function FunnelDemoCard(props, ref) {
    const { t } = useTranslation('funnels')
    return (
      <Card
        ref={ref}
        customClass="!bg-card !border-border shadow-lg cursor-grab active:cursor-grabbing overflow-hidden"
        data-swap-card
        {...props}
      >
        <div className="flex flex-col h-full p-4 gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <GitMerge className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-semibold text-foreground">
              {t('demo.features.trackJourney.title', 'Funnel Analytics')}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 shrink-0">
            {[
              { label: 'Entries', value: '1,240', accent: 'text-blue-600' },
              { label: 'Conversions', value: '210', accent: 'text-emerald-600' },
              { label: 'Rate', value: '16.9%', accent: 'text-amber-600' },
            ].map(({ label, value, accent }) => (
              <div key={label} className="rounded-lg border bg-muted/40 px-2 py-2 text-center">
                <p className="text-[10px] text-muted-foreground">{label}</p>
                <p className={`text-sm font-bold mt-0.5 ${accent}`}>{value}</p>
              </div>
            ))}
          </div>
          <div className="flex-1 overflow-hidden">
            <FunnelChart
              steps={MOCK_STEPS}
              totalEntries={1240}
              conversionRate={16.9}
              onStepClick={() => {}}
              stepConfigs={MOCK_STEP_CONFIGS}
              orgId="demo"
              existingEventNames={new Set()}
            />
          </div>
        </div>
      </Card>
    )
  }
)

export function FunnelDemoV2({
  canAccess = false,
  onContinue,
}: {
  canAccess?: boolean
  onContinue?: () => void
}) {
  const { t } = useTranslation('funnels')
  const { t: tCommon } = useTranslation('common')
  const { org_id } = useParams<{ org_id: string }>()

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
      {/* Left: intro + features + upgrade */}
      <div className="lg:col-span-2 space-y-5">
        {/* Hero */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-600 text-xs font-medium px-3 py-1 rounded-full">
            <Sparkles className="w-3.5 h-3.5" />
            {t('demo.badge')}
          </div>
          <h2 className="text-xl font-bold text-foreground">{t('demo.hero.title')}</h2>
          <p className="text-sm text-slate-500">{t('demo.hero.desc')}</p>
        </div>

        {/* Feature list */}
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

      {/* Right: funnel visualization */}
      <div className="lg:col-span-3 space-y-3">
        <div className="flex items-center gap-2 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          {t('demo.demoNotice')}
        </div>
        <FunnelSummary totalEntries={1240} totalConversions={210} conversionRate={16.9} />
        <UiCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">{t('report.funnelSteps')}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <FunnelChart
              steps={MOCK_STEPS}
              totalEntries={1240}
              conversionRate={16.9}
              onStepClick={() => {}}
              stepConfigs={MOCK_STEP_CONFIGS}
              orgId={org_id}
              existingEventNames={new Set()}
            />
          </CardContent>
        </UiCard>
      </div>
    </div>
  )
}
