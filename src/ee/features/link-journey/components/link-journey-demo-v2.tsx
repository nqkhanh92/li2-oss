'use client'

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
  { page_path: '/contact', page_title: 'Contact', pageviews: 540, sessions: 490, visitors: 430 },
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

// revenue is stored in cents
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
    {
      id: '3',
      event_type: 'sale',
      event_name: 'purchase',
      amount: 29900,
      currency: 'USD',
      created_at: '2025-03-23T14:00:00Z',
      customer_name: null,
      customer_email: 'dave@example.com',
    },
    {
      id: '4',
      event_type: 'lead',
      event_name: 'contact_request',
      amount: null,
      currency: null,
      created_at: '2025-03-23T10:00:00Z',
      customer_name: 'Eve Martinez',
      customer_email: null,
    },
  ],
}

export function LinkJourneyDemoV2({
  canAccess = false,
  onContinue,
}: {
  canAccess?: boolean
  onContinue?: () => void
}) {
  const { t } = useTranslation('link-journey')
  const { t: tCommon } = useTranslation('common')

  return (
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
                <p className="text-sm font-semibold text-foreground">
                  {t('demo.planUpgrade.title')}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{t('demo.planUpgrade.description')}</p>
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

      {/* Right 3/5: demo journey */}
      <div className="lg:col-span-3 space-y-2">
        {/* Demo notice */}
        <div className="flex items-center gap-2 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          {t('demo.demoNotice')}
        </div>

        {/* Mock link selector pill */}
        <div className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-card w-fit text-sm text-muted-foreground pointer-events-none select-none">
          <Link2 className="w-3.5 h-3.5 shrink-0" />
          <span className="font-medium text-foreground">Homepage CTA</span>
          <span className="text-xs">·</span>
          <span className="text-xs font-mono">example.com/abc123</span>
        </div>

        {/* Step 1: Click */}
        <JourneyStep icon={MousePointerClick} label={t('steps.click')} step={1} />
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: t('traffic.totalClicks'), value: '8,420' },
            { label: t('traffic.uniqueVisitors'), value: '3,210' },
            { label: t('traffic.sessions'), value: '4,890' },
            { label: t('traffic.bounceRate'), value: '38%' },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg border bg-card px-3 py-2">
              <p className="text-[10px] text-muted-foreground truncate">{label}</p>
              <p className="text-base font-bold">{value}</p>
            </div>
          ))}
        </div>

        {/* Step 2: Visit */}
        <JourneyStep icon={FileText} label={t('steps.visit')} step={2} />
        <div className="rounded-lg border bg-card divide-y">
          {MOCK_PAGE_FLOW.slice(0, 3).map((p) => (
            <div key={p.page_path} className="flex items-center justify-between px-3 py-2">
              <span className="text-xs font-mono text-muted-foreground truncate">
                {p.page_path}
              </span>
              <span className="text-xs font-semibold shrink-0 ml-2">
                {p.pageviews.toLocaleString()} {t('pageFlow.views')}
              </span>
            </div>
          ))}
        </div>

        {/* Step 3: Engage */}
        <JourneyStep icon={Pointer} label={t('steps.engage')} step={3} />
        <div className="rounded-lg border bg-card px-3 py-2 space-y-1.5">
          <div className="flex items-center gap-4 text-xs">
            <span className="text-muted-foreground">
              {t('behavioral.interactions')}{' '}
              <span className="font-bold text-foreground">12,840</span>
            </span>
            <span className="text-muted-foreground">
              {t('behavioral.rageClicks')} <span className="font-bold text-foreground">18</span>
            </span>
          </div>
          <div className="space-y-1">
            {MOCK_BEHAVIORAL.top_clicked_elements.map((el) => (
              <div key={el.selector_path} className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground truncate">{el.element_text}</span>
                <span className="text-xs font-semibold shrink-0 ml-2">
                  {el.click_count.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Step 4: Convert */}
        <JourneyStep icon={ShoppingCart} label={t('steps.convert')} step={4} />
        <div className="rounded-lg border bg-card px-3 py-2 space-y-1.5">
          <div className="flex items-center gap-4 text-xs">
            <span className="text-muted-foreground">
              {t('conversions.leads')} <span className="font-bold text-foreground">186</span>
            </span>
            <span className="text-muted-foreground">
              {t('conversions.sales')} <span className="font-bold text-foreground">42</span>
            </span>
            <span className="text-muted-foreground">
              {t('conversions.revenue')} <span className="font-bold text-foreground">$12,480</span>
            </span>
          </div>
          <div className="space-y-1">
            {MOCK_CONVERSIONS.recent_conversions.slice(0, 2).map((c) => (
              <div key={c.id} className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {c.customer_email ?? c.customer_name ?? t('conversions.anonymous')}
                </span>
                <span className="text-xs font-semibold shrink-0 ml-2 capitalize">
                  {c.event_type}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
