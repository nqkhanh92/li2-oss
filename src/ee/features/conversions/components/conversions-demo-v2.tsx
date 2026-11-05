'use client'

import { useRef, useCallback, forwardRef } from 'react'
import gsap from 'gsap'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import {
  Target,
  TrendingUp,
  GitMerge,
  DollarSign,
  Sparkles,
  Users,
  ShoppingCart,
} from 'lucide-react'
import Link from 'next/link'
import { PRICING_URL } from '@/shared/constants'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import CardSwap, { Card } from '@/shared/components/animation/card-swap'
import { ConversionFunnelChart } from './funnel-chart'
import { FunnelStage } from '../types'

const FEATURES = [
  { icon: Target, color: 'text-orange-500', bg: 'bg-orange-50', key: 'trackConversions' },
  { icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-50', key: 'funnelView' },
  { icon: GitMerge, color: 'text-violet-500', bg: 'bg-violet-50', key: 'attribution' },
  { icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-50', key: 'revenue' },
]

const MOCK_STAGES: FunnelStage[] = [
  { name: 'Clicks', value: 8420, fill: '#3aaae3' },
  { name: 'Leads', value: 1253, fill: '#3762d0' },
  { name: 'Sales', value: 312, fill: '#150f5a' },
]

const MOCK_CONVERSION_RATES = { clicksToLeads: 14.9, leadsToSales: 24.9, overall: 3.7 }

const MOCK_EVENTS = [
  {
    id: '1',
    event_name: 'form_submit',
    type: 'lead',
    customer: 'alice@example.com',
    touchpoint: 'Homepage CTA',
    amount: null,
    time: '2h ago',
  },
  {
    id: '2',
    event_name: 'purchase',
    type: 'sale',
    customer: 'bob@example.com',
    touchpoint: 'Pricing Page',
    amount: '$149',
    time: '4h ago',
  },
  {
    id: '3',
    event_name: 'form_submit',
    type: 'lead',
    customer: 'carol@example.com',
    touchpoint: 'Blog Post',
    amount: null,
    time: '6h ago',
  },
  {
    id: '4',
    event_name: 'purchase',
    type: 'sale',
    customer: 'dave@example.com',
    touchpoint: 'Retargeting Ad',
    amount: '$299',
    time: '8h ago',
  },
]

const MOCK_STATS = [
  { key: 'totalCustomers', value: '1,253', icon: Users, color: 'text-cyan-500', bg: 'bg-cyan-50' },
  {
    key: 'totalLeads',
    value: '1,253',
    icon: TrendingUp,
    color: 'text-orange-500',
    bg: 'bg-orange-50',
  },
  {
    key: 'totalSales',
    value: '312',
    icon: ShoppingCart,
    color: 'text-violet-500',
    bg: 'bg-violet-50',
  },
  {
    key: 'totalRevenue',
    value: '$48,620',
    icon: DollarSign,
    color: 'text-blue-500',
    bg: 'bg-blue-50',
  },
]

const CARD_H = 520

function ConvCardInner({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-3 p-5 h-full overflow-hidden">{children}</div>
}

export const ConversionsStatsCard = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function ConversionsStatsCard(props, ref) {
  const { t } = useTranslation('conversions')
  return (
    <Card
      ref={ref}
      customClass="!bg-card !border-border shadow-lg cursor-grab active:cursor-grabbing overflow-hidden [&>*]:border-none [&>*]:origin-top-left [&>*]:scale-x-90 [&>*]:scale-y-75"
      data-swap-card
      {...props}
    >
      <ConversionFunnelChart
        data={MOCK_STAGES}
        conversionRates={MOCK_CONVERSION_RATES}
        selectedStage={null}
        setSelectedStage={() => {}}
      />
    </Card>
  )
})

export const ConversionsEventsCard = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function ConversionsEventsCard(props, ref) {
  const { t } = useTranslation('conversions')
  return (
    <Card
      ref={ref}
      customClass="!bg-card !border-border shadow-lg cursor-grab active:cursor-grabbing"
      data-swap-card
      {...props}
    >
      <ConvCardInner>
        <p className="text-sm font-semibold text-foreground">{t('events.title')}</p>
        <div className="space-y-1">
          {MOCK_EVENTS.map((event) => (
            <div
              key={event.id}
              className="flex items-center justify-between text-xs py-1.5 border-b border-border/30 last:border-0"
            >
              <div className="min-w-0">
                <p className="font-medium truncate">{event.event_name}</p>
                <p className="text-muted-foreground truncate text-[10px]">{event.customer}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                {event.amount && (
                  <span className="font-semibold text-emerald-600 text-xs">{event.amount}</span>
                )}
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${event.type === 'sale' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}
                >
                  {event.type}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-border/50 pt-2">
          <p className="text-xs font-semibold text-foreground mb-2">
            {t('events.touchpoints', 'By Link')}
          </p>
          <div className="space-y-1">
            {Array.from(new Set(MOCK_EVENTS.map((e) => e.touchpoint))).map((tp) => {
              const count = MOCK_EVENTS.filter((e) => e.touchpoint === tp).length
              return (
                <div key={tp} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground truncate">{tp}</span>
                  <span className="font-semibold shrink-0 ml-2">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      </ConvCardInner>
    </Card>
  )
})

export function ConversionsDemoV3({
  canAccess = false,
  onContinue,
}: {
  canAccess?: boolean
  onContinue?: () => void
}) {
  const { t } = useTranslation('conversions')
  const { t: tCommon } = useTranslation('common')
  const cardContainerRef = useRef<HTMLDivElement>(null)

  const handlePickUp = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const currentY = gsap.getProperty(el, 'y') as number
    el.dataset.pickupY = String(currentY)
    gsap.to(el, {
      y: currentY - 50,
      scale: 1.04,
      duration: 0.25,
      ease: 'power2.out',
      overwrite: 'auto',
      zIndex: 999,
    })
  }, [])

  const handleDrop = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    if (el.dataset.pickupY === undefined) return
    delete el.dataset.pickupY

    gsap.to(el, {
      x: 0,
      y: 0,
      z: 0,
      scale: 1,
      duration: 0.6,
      ease: 'elastic.out(0.6, 0.9)',
      overwrite: 'auto',
      zIndex: 999,
    })

    if (!cardContainerRef.current) return
    const all = Array.from(
      cardContainerRef.current.querySelectorAll('[data-swap-card]')
    ) as HTMLElement[]
    const others = all.filter((c) => c !== el)
    others.sort(
      (a, b) => (gsap.getProperty(a, 'x') as number) - (gsap.getProperty(b, 'x') as number)
    )
    const total = all.length
    others.forEach((card, i) => {
      const s = i + 1
      gsap.to(card, {
        x: s * 35,
        y: -s * 55,
        z: -s * 35 * 1.5,
        scale: 1,
        duration: 0.5,
        ease: 'power2.out',
        overwrite: 'auto',
        zIndex: total - s,
      })
    })
  }, [])

  const pickup = { onMouseDown: handlePickUp, onMouseUp: handleDrop, onMouseLeave: handleDrop }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm px-8 py-8 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left: intro + features + CTA */}
        <div className="space-y-5">
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

        {/* Right: CardSwap */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            {t('demo.demoNotice')}
          </div>

          <div
            ref={cardContainerRef}
            className="relative overflow-hidden max-[768px]:!h-[420px]"
            style={{ height: CARD_H + 80 }}
          >
            <CardSwap
              cardDistance={35}
              verticalDistance={55}
              delay={4500}
              pauseOnHover
              easing="elastic"
            >
              <ConversionsStatsCard {...pickup} />
              <ConversionsEventsCard {...pickup} />
            </CardSwap>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ConversionsDemoV2({
  canAccess = false,
  onContinue,
}: {
  canAccess?: boolean
  onContinue?: () => void
}) {
  const { t } = useTranslation('conversions')
  const { t: tCommon } = useTranslation('common')

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
          {/* Demo notice */}
          <div className="flex items-center gap-2 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            {t('demo.demoNotice')}
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-3">
            {MOCK_STATS.map(({ key, value, icon: Icon, color, bg }) => (
              <div key={key} className="rounded-lg border bg-card p-3 flex items-center gap-3">
                <div className={`p-1.5 ${bg} rounded-md shrink-0`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t(`stats.${key}`)}</p>
                  <p className="text-xl font-bold text-foreground">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Funnel chart */}
          <ConversionFunnelChart
            data={MOCK_STAGES}
            conversionRates={MOCK_CONVERSION_RATES}
            selectedStage={null}
            setSelectedStage={() => {}}
          />

          {/* Events table */}
          <div className="rounded-lg border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b">
              <p className="text-sm font-medium">{t('events.title')}</p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('events.columns.eventName')}</TableHead>
                  <TableHead>{t('events.columns.customer')}</TableHead>
                  <TableHead>{t('events.columns.touchPoint')}</TableHead>
                  <TableHead>{t('events.columns.type')}</TableHead>
                  <TableHead>{t('events.columns.amount')}</TableHead>
                  <TableHead>{t('events.columns.createdAt')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_EVENTS.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium text-xs">{event.event_name}</TableCell>
                    <TableCell className="text-primary text-xs">{event.customer}</TableCell>
                    <TableCell className="text-xs">{event.touchpoint}</TableCell>
                    <TableCell>
                      <Badge
                        variant={event.type === 'sale' ? 'default' : 'secondary'}
                        className="text-[10px] px-1.5 py-0"
                      >
                        {event.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{event.amount ?? '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{event.time}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  )
}
