'use client'

import gsap from 'gsap'
import { useRef, useCallback, forwardRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/components/ui/button'
import {
  MousePointerClick,
  FileText,
  Pointer,
  ShoppingCart,
  Sparkles,
  Link2,
  GitMerge,
} from 'lucide-react'
import Link from 'next/link'
import { PRICING_URL } from '@/shared/constants'
import CardSwap, { Card } from '@/shared/components/animation/card-swap'
import { JourneyStep } from './journey-step'
import type {
  PageFlowItem,
  BehavioralHighlights as BehavioralHighlightsType,
  ConversionSummary,
} from '../types'

const FEATURES = [
  { icon: MousePointerClick, color: 'text-blue-500', bg: 'bg-blue-50', key: 'clickData' },
  { icon: FileText, color: 'text-violet-500', bg: 'bg-violet-50', key: 'pageFlow' },
  { icon: Pointer, color: 'text-orange-500', bg: 'bg-orange-50', key: 'behavioral' },
  { icon: GitMerge, color: 'text-emerald-500', bg: 'bg-emerald-50', key: 'conversions' },
]

const MOCK_PAGE_FLOW: PageFlowItem[] = [
  { page_path: '/pricing', page_title: 'Pricing', pageviews: 4201, sessions: 3180, visitors: 2840 },
  {
    page_path: '/features',
    page_title: 'Features',
    pageviews: 2130,
    sessions: 1740,
    visitors: 1560,
  },
  { page_path: '/blog/seo-tips', page_title: null, pageviews: 980, sessions: 820, visitors: 740 },
]

const MOCK_BEHAVIORAL: BehavioralHighlightsType = {
  total_interactions: 12840,
  rage_clicks: 18,
  top_clicked_elements: [
    {
      selector_path: 'button#cta-hero',
      element_text: 'Get Started Free',
      element_tag: 'button',
      click_count: 1842,
    },
    { selector_path: 'nav a', element_text: 'Pricing', element_tag: 'a', click_count: 934 },
    {
      selector_path: 'a.feature-cta',
      element_text: 'See all features',
      element_tag: 'a',
      click_count: 521,
    },
  ],
}

const MOCK_CONVERSIONS: ConversionSummary = {
  total_leads: 186,
  total_sales: 42,
  total_revenue: 1248000,
  recent_conversions: [
    {
      id: '1',
      event_type: 'sale',
      event_name: 'purchase',
      amount: 14900,
      currency: 'USD',
      created_at: '2025-03-24T08:00:00Z',
      customer_name: null,
      customer_email: 'bob@example.com',
    },
    {
      id: '2',
      event_type: 'lead',
      event_name: 'form_submit',
      amount: null,
      currency: null,
      created_at: '2025-03-24T06:30:00Z',
      customer_name: 'Alice Johnson',
      customer_email: null,
    },
  ],
}

const CARD_H = 560

function CardInner({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-3 p-5 h-full overflow-hidden">{children}</div>
}

export const LinkJourneyTrafficCard = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function LinkJourneyTrafficCard(props, ref) {
  const { t } = useTranslation('link-journey')
  return (
    <Card
      ref={ref}
      customClass="!bg-card !border-border shadow-lg cursor-grab active:cursor-grabbing"
      data-swap-card
      {...props}
    >
      <CardInner>
        <div>
          <JourneyStep icon={MousePointerClick} label={t('steps.click')} step={1} />
          <p className="text-sm font-semibold text-foreground mt-1 px-1">
            {t('demo.features.clickData.title')}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { label: t('traffic.totalClicks'), value: '8,420', accent: 'text-blue-600' },
            { label: t('traffic.uniqueVisitors'), value: '3,210', accent: 'text-violet-600' },
            { label: t('traffic.sessions'), value: '4,890', accent: 'text-emerald-600' },
            { label: t('traffic.bounceRate'), value: '38%', accent: 'text-amber-600' },
          ].map(({ label, value, accent }) => (
            <div key={label} className="rounded-lg border bg-muted/40 px-2.5 py-2">
              <p className="text-[10px] text-muted-foreground truncate">{label}</p>
              <p className={`text-base font-bold mt-0.5 ${accent}`}>{value}</p>
            </div>
          ))}
        </div>
        <div className="border-t border-border/50 pt-2">
          <JourneyStep icon={FileText} label={t('steps.visit')} step={2} />
          <p className="text-sm font-semibold text-foreground mt-1 px-1">
            {t('demo.features.pageFlow.title')}
          </p>
        </div>
        <div className="space-y-1">
          {MOCK_PAGE_FLOW.map(({ page_path, pageviews }) => {
            const pct = Math.round((pageviews / MOCK_PAGE_FLOW[0].pageviews) * 100)
            return (
              <div key={page_path} className="space-y-0.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-muted-foreground truncate max-w-[160px]">
                    {page_path}
                  </span>
                  <span className="font-semibold shrink-0 ml-2">
                    {pageviews.toLocaleString()} {t('pageFlow.views')}
                  </span>
                </div>
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-blue-400 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </CardInner>
    </Card>
  )
})

export const LinkJourneyBehavioralCard = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function LinkJourneyBehavioralCard(props, ref) {
  const { t } = useTranslation('link-journey')
  return (
    <Card
      ref={ref}
      customClass="!bg-card !border-border shadow-lg cursor-grab active:cursor-grabbing"
      data-swap-card
      {...props}
    >
      <CardInner>
        <div>
          <JourneyStep icon={Pointer} label={t('steps.engage')} step={3} />
          <p className="text-sm font-semibold text-foreground mt-1 px-1">
            {t('demo.features.behavioral.title')}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <div className="rounded-lg border bg-blue-50 px-2.5 py-2">
            <p className="text-[10px] text-muted-foreground">{t('behavioral.interactions')}</p>
            <p className="text-base font-bold text-blue-600 mt-0.5">12,840</p>
          </div>
          <div className="rounded-lg border bg-red-50 px-2.5 py-2">
            <p className="text-[10px] text-muted-foreground">{t('behavioral.rageClicks')}</p>
            <p className="text-base font-bold text-red-500 mt-0.5">18</p>
          </div>
        </div>
        <div className="space-y-1">
          {MOCK_BEHAVIORAL.top_clicked_elements.map((el) => (
            <div key={el.selector_path} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground truncate">{el.element_text}</span>
              <span className="font-semibold shrink-0 ml-2">{el.click_count.toLocaleString()}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-border/50 pt-2">
          <JourneyStep icon={ShoppingCart} label={t('steps.convert')} step={4} />
          <p className="text-sm font-semibold text-foreground mt-1 px-1">
            {t('demo.features.conversions.title')}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { label: t('conversions.leads'), value: '186', accent: 'text-blue-600' },
            { label: t('conversions.sales'), value: '42', accent: 'text-emerald-600' },
            { label: t('conversions.revenue'), value: '$12,480', accent: 'text-violet-600' },
          ].map(({ label, value, accent }) => (
            <div key={label} className="rounded-lg border bg-muted/40 px-2 py-2 text-center">
              <p className="text-[10px] text-muted-foreground">{label}</p>
              <p className={`text-sm font-bold mt-0.5 ${accent}`}>{value}</p>
            </div>
          ))}
        </div>
        <div className="space-y-1">
          {MOCK_CONVERSIONS.recent_conversions.map((c) => (
            <div key={c.id} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground truncate">
                {c.customer_email ?? c.customer_name}
              </span>
              <span
                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ml-2 ${c.event_type === 'sale' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}
              >
                {c.event_type}
              </span>
            </div>
          ))}
        </div>
      </CardInner>
    </Card>
  )
})

export function LinkJourneyDemoV4({
  canAccess = false,
  onContinue,
}: {
  canAccess?: boolean
  onContinue?: () => void
}) {
  const { t } = useTranslation('link-journey')
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
        {/* Left 1/2: intro + features + CTA */}
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-600 text-xs font-medium px-3 py-1 rounded-full">
              <Sparkles className="w-3.5 h-3.5" />
              {t('demo.badge')}
            </div>
            <h2 className="text-xl font-bold text-foreground">
              {canAccess ? t('demo.hero.title') : t('demo.planUpgrade.title')}
            </h2>
            <p className="text-sm text-slate-500">
              {canAccess ? t('demo.hero.desc') : t('demo.planUpgrade.description')}
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
                  <p className="text-sm font-semibold text-foreground">
                    {t('demo.planUpgrade.title')}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t('demo.planUpgrade.description')}
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

        {/* Right 1/2: CardSwap with 2 merged cards */}
        <div className="space-y-3">
          {/* Demo notice */}
          <div className="flex items-center gap-2 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            {t('demo.demoNotice')}
          </div>

          {/* Link selector pill */}
          <div className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-card w-fit text-sm text-muted-foreground pointer-events-none select-none">
            <Link2 className="w-3.5 h-3.5 shrink-0" />
            <span className="font-medium text-foreground">Homepage CTA</span>
            <span className="text-xs">·</span>
            <span className="text-xs font-mono">example.com/abc123</span>
          </div>

          {/* CardSwap */}
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
              <LinkJourneyTrafficCard {...pickup} />
              <LinkJourneyBehavioralCard {...pickup} />
            </CardSwap>
          </div>
        </div>
      </div>
    </div>
  )
}
