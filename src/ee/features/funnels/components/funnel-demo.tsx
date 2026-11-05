'use client'

import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { GitMerge, MousePointerClick, TrendingUp, Users } from 'lucide-react'
import { FunnelStep, StepMetrics } from '../types'
import { FunnelChart } from './funnel-chart'
import { FunnelSummary } from './funnel-summary'

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
  { icon: Users, color: 'text-violet-500', bg: 'bg-violet-50', key: 'segmentVisitors' },
  { icon: GitMerge, color: 'text-amber-500', bg: 'bg-amber-50', key: 'multiStep' },
]

export function FunnelDemo() {
  const { t } = useTranslation('funnels')
  const { org_id } = useParams<{ org_id: string }>()

  return (
    <div className="space-y-6">
      {/* What is a funnel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {FEATURES.map(({ icon: Icon, color, bg, key }) => (
          <Card key={key}>
            <CardContent className="pt-5 pb-4">
              <div className="flex flex-col gap-3">
                <div className={`p-2 ${bg} rounded-lg w-fit`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {t(`demo.features.${key}.title`)}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{t(`demo.features.${key}.desc`)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Mock summary */}
      <FunnelSummary totalEntries={1240} totalConversions={210} conversionRate={16.9} />

      {/* Mock chart */}
      <Card>
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
      </Card>
    </div>
  )
}
