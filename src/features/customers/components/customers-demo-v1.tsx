'use client'

import { forwardRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/components/ui/button'
import {
  Users,
  DollarSign,
  ShoppingCart,
  UserPlus,
  TrendingUp,
  Sparkles,
  MousePointer,
} from 'lucide-react'
import Link from 'next/link'
import { PRICING_URL } from '@/shared/constants'
import { cn } from '@/shared/lib/utils'
import CardSwap, { Card } from '@/shared/components/animation/card-swap'

const MOCK_CUSTOMERS = [
  {
    id: '1',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    country: '🇺🇸',
    ltv: '$149',
    sales: 3,
    isNew: false,
  },
  {
    id: '2',
    name: 'Bob Smith',
    email: 'bob@corp.io',
    country: '🇬🇧',
    ltv: '$89',
    sales: 1,
    isNew: true,
  },
  {
    id: '3',
    name: 'Linh Nguyen',
    email: 'linh@startup.vn',
    country: '🇻🇳',
    ltv: '$240',
    sales: 5,
    isNew: false,
  },
  {
    id: '4',
    name: 'Carlos Mendes',
    email: 'carlos@biz.co',
    country: '🇧🇷',
    ltv: '$65',
    sales: 1,
    isNew: true,
  },
]

const MOCK_JOURNEY = [
  {
    type: 'first_visit' as const,
    label: 'First Visit',
    sub: 'example.com/promo → /pricing',
    icon: MousePointer,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  {
    type: 'lead' as const,
    label: 'Lead',
    sub: 'Newsletter Signup form',
    icon: UserPlus,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
  },
  {
    type: 'sale' as const,
    label: 'Sale · $149',
    sub: 'purchase event · 3 days later',
    icon: ShoppingCart,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
]

const FEATURES = [
  { icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-50', key: 'profiles' },
  { icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50', key: 'ltv' },
  { icon: MousePointer, color: 'text-blue-500', bg: 'bg-blue-50', key: 'journey' },
  { icon: ShoppingCart, color: 'text-violet-500', bg: 'bg-violet-50', key: 'conversions' },
]

export const CustomersDemoCard = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function CustomersDemoCard(props, ref) {
    return (
      <Card
        ref={ref}
        customClass="!bg-card !border-border shadow-lg cursor-grab active:cursor-grabbing overflow-hidden"
        data-swap-card
        {...props}
      >
        <div className="flex flex-col h-full p-4 gap-3">
          {/* Header */}
          <div className="flex items-center gap-2 shrink-0">
            <Users className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-semibold text-foreground">Customer Profiles</span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 shrink-0">
            {[
              { label: 'Customers', value: '1,248', accent: 'text-indigo-600' },
              { label: 'Revenue', value: '$18.4k', accent: 'text-emerald-600' },
              { label: 'Avg LTV', value: '$14.76', accent: 'text-violet-600' },
            ].map(({ label, value, accent }) => (
              <div key={label} className="rounded-lg border bg-muted/40 px-2 py-2 text-center">
                <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
                <p className={`text-sm font-bold mt-0.5 ${accent}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Customer list */}
          <div className="flex-1 overflow-hidden space-y-1.5">
            {MOCK_CUSTOMERS.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors"
              >
                {/* Avatar */}
                <div className="w-7 h-7 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center shrink-0">
                  <span className="text-[11px] font-bold text-indigo-600">{c.name.charAt(0)}</span>
                </div>
                {/* Name + email */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-foreground truncate">
                      {c.name}
                    </span>
                    {c.isNew && (
                      <span className="shrink-0 text-[9px] font-bold px-1 py-0.5 rounded bg-blue-100 text-blue-600">
                        NEW
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {c.country} {c.email}
                  </p>
                </div>
                {/* LTV + sales */}
                <div className="shrink-0 text-right">
                  <p className="text-[11px] font-bold text-emerald-600">{c.ltv}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {c.sales} sale{c.sales !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    )
  }
)

export const CustomersJourneyCard = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function CustomersJourneyCard(props, ref) {
  return (
    <Card
      ref={ref}
      customClass="!bg-card !border-border shadow-lg cursor-grab active:cursor-grabbing overflow-hidden"
      data-swap-card
      {...props}
    >
      <div className="flex flex-col h-full p-4 gap-3">
        {/* Header */}
        <div className="flex items-center gap-2 shrink-0">
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-semibold text-foreground">Customer Journey</span>
        </div>

        {/* Customer chip */}
        <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg border bg-muted/30 shrink-0">
          <div className="w-7 h-7 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center shrink-0">
            <span className="text-[11px] font-bold text-indigo-600">A</span>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-foreground">Alice Johnson</p>
            <p className="text-[10px] text-muted-foreground">🇺🇸 alice@example.com</p>
          </div>
          <div className="ml-auto shrink-0">
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
              LTV $149
            </span>
          </div>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-hidden relative">
          {/* Connector line */}
          <div className="absolute left-[18px] top-3 bottom-3 w-0.5 bg-gradient-to-b from-blue-300 via-violet-300 to-emerald-300 rounded-full" />
          <div className="space-y-3">
            {MOCK_JOURNEY.map(({ type, label, sub, icon: Icon, color, bg, border }) => (
              <div key={type} className="relative flex gap-3 items-start">
                <div
                  className={cn(
                    'relative z-10 shrink-0 w-9 h-9 rounded-xl flex items-center justify-center border shadow-sm',
                    bg,
                    border
                  )}
                >
                  <Icon className={cn('w-4 h-4', color)} />
                </div>
                <div className={cn('flex-1 rounded-xl border px-3 py-2', bg, border)}>
                  <p className={cn('text-[11px] font-semibold', color)}>{label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Attribution chip */}
        <div className="shrink-0 flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200">
          <DollarSign className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <p className="text-[10px] text-indigo-700 font-medium">
            Attributed via <span className="font-bold">example.com/promo</span> · Homepage CTA
          </p>
        </div>
      </div>
    </Card>
  )
})

export function CustomersDemoV1({
  canAccess = false,
  onContinue,
}: {
  canAccess?: boolean
  onContinue?: () => void
}) {
  const { t } = useTranslation('customers')
  const { t: tCommon } = useTranslation('common')

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm px-8 py-8 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left: intro + features + CTA */}
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 text-xs font-medium px-3 py-1 rounded-full">
              <Sparkles className="w-3.5 h-3.5" />
              {t('demo.badge', 'Customer Intelligence')}
            </div>
            <h2 className="text-xl font-bold text-foreground">
              {t('demo.hero.title', 'Know every customer behind every click')}
            </h2>
            <p className="text-sm text-slate-500">
              {t(
                'demo.hero.desc',
                'Build complete customer profiles — identify who clicks your links, track their journey from first touch to sale, and measure lifetime value.'
              )}
            </p>
          </div>

          <div className="space-y-3">
            {FEATURES.map(({ icon: Icon, color, bg, key }) => (
              <div key={key} className="flex gap-3 items-start">
                <div className={`p-1.5 ${bg} rounded-lg shrink-0`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {t(`demo.features.${key}.title`, key)}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t(`demo.features.${key}.desc`, '')}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {canAccess ? (
            <Button variant="default" size="lg" className="w-full" onClick={onContinue}>
              {t('demo.getStarted.cta', 'View Customer Profiles')}
            </Button>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {t('plan_upgrade.title', 'Upgrade to unlock')}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t(
                      'plan_upgrade.description',
                      'Customer profiles are available on paid plans.'
                    )}
                  </p>
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

        {/* Right: CardSwap demo */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            {t('demo.demoNotice', 'Sample data — your real customers will appear here')}
          </div>

          <div className="relative overflow-hidden" style={{ height: 480 }}>
            <CardSwap
              cardDistance={30}
              verticalDistance={40}
              delay={4000}
              pauseOnHover
              easing="elastic"
            >
              <CustomersDemoCard />
              <CustomersJourneyCard />
            </CardSwap>
          </div>
        </div>
      </div>
    </div>
  )
}
