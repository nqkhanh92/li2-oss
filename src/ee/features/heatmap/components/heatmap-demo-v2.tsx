'use client'

import { useEffect, useRef, useState, forwardRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/components/ui/button'
import { MousePointerClick, ArrowDownToLine, Zap, LayoutList, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { PRICING_URL } from '@/shared/constants'
import { cn } from '@/shared/lib/utils'
import { renderHeatmap } from '../lib/heatmap-renderer'
import { HeatmapElementList } from './heatmap-element-list'
import { RageClickList } from './rage-click-list'
import { ScrollHeatmapStats } from './scroll-heatmap-stats'
import type {
  HeatmapElement,
  RageClickElement,
  ScrollDepthMilestone,
  HeatmapGridPoint,
} from '../types'
import CardSwap, { Card } from '@/shared/components/animation/card-swap'

const FEATURES = [
  { icon: MousePointerClick, color: 'text-blue-500', bg: 'bg-blue-50', key: 'clickMap' },
  { icon: ArrowDownToLine, color: 'text-violet-500', bg: 'bg-violet-50', key: 'scrollMap' },
  { icon: Zap, color: 'text-orange-500', bg: 'bg-orange-50', key: 'rageClicks' },
  { icon: LayoutList, color: 'text-emerald-500', bg: 'bg-emerald-50', key: 'elementStats' },
]

const MOCK_ELEMENTS: HeatmapElement[] = [
  {
    selector: 'button#cta-hero',
    text: 'Get Started Free',
    tag: 'button',
    count: 1842,
    element_id: 'cta-hero',
    element_href: null,
  },
  {
    selector: 'nav a[href="/pricing"]',
    text: 'Pricing',
    tag: 'a',
    count: 934,
    element_id: null,
    element_href: '/pricing',
  },
  {
    selector: 'nav a[href="/login"]',
    text: 'Sign In',
    tag: 'a',
    count: 521,
    element_id: null,
    element_href: '/login',
  },
]

const MOCK_RAGE_CLICKS: RageClickElement[] = [
  {
    selector: 'button.upgrade-locked',
    text: 'Upgrade Now',
    tag: 'button',
    href: null,
    rage_click_count: 18,
    affected_sessions: 12,
    last_seen: '2025-03-24T10:00:00Z',
  },
  {
    selector: 'div.feature-locked',
    text: 'Advanced Analytics',
    tag: 'div',
    href: null,
    rage_click_count: 7,
    affected_sessions: 5,
    last_seen: '2025-03-24T09:00:00Z',
  },
  {
    selector: 'a.nav-link',
    text: 'Documentation',
    tag: 'a',
    href: '/docs',
    rage_click_count: 5,
    affected_sessions: 4,
    last_seen: '2025-03-23T15:00:00Z',
  },
]

const MOCK_SCROLL_TOTAL = 4890
const MOCK_SCROLL_MILESTONES: ScrollDepthMilestone[] = [
  { scroll_depth_percent: 25, sessions_reached: 4201, pct_of_total: 86, avg_time_at_depth: 8200 },
  { scroll_depth_percent: 50, sessions_reached: 3127, pct_of_total: 64, avg_time_at_depth: 14500 },
  { scroll_depth_percent: 75, sessions_reached: 1958, pct_of_total: 40, avg_time_at_depth: 22300 },
  { scroll_depth_percent: 90, sessions_reached: 1076, pct_of_total: 22, avg_time_at_depth: 31800 },
  { scroll_depth_percent: 100, sessions_reached: 489, pct_of_total: 10, avg_time_at_depth: 45200 },
]

// Mock click points as [x_fraction, y_fraction, count].
// Fractions are relative to the canvas dimensions (content area, not chrome bar).
// y positions derived from MockPageLayout heights:
//   Nav (h-8 = 32px) center  → y ≈ 6.5%
//   Hero CTA buttons          → y ≈ 53%
//   Feature cards center      → y ≈ 83%
const MOCK_CLICK_FRACTIONS: Array<[number, number, number]> = [
  // Hero primary CTA "Get Started Free" — dominant hot zone
  [0.33, 0.53, 100],
  [0.32, 0.53, 98],
  [0.34, 0.53, 96],
  [0.33, 0.52, 94],
  [0.33, 0.54, 92],
  [0.31, 0.53, 88],
  [0.35, 0.53, 85],
  [0.32, 0.52, 80],
  [0.34, 0.54, 78],
  [0.3, 0.53, 60],
  [0.36, 0.53, 55],
  [0.33, 0.51, 50],
  [0.33, 0.55, 48],
  // Secondary CTA — noticeably cooler
  [0.5, 0.53, 22],
  [0.51, 0.53, 18],
  [0.49, 0.53, 16],
  // Pricing nav — subtle
  [0.56, 0.07, 14],
  [0.57, 0.07, 11],
  // Sign In nav — very faint
  [0.82, 0.07, 8],
]

function MockBrowserFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg overflow-hidden border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 border-b border-slate-200">
        <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
        <div className="flex-1 bg-white rounded text-[10px] text-slate-400 px-2 py-0.5 ml-2 truncate border border-slate-200">
          https://yoursite.com
        </div>
      </div>
      {children}
    </div>
  )
}

function MockPageLayout() {
  return (
    <div className="relative overflow-hidden bg-white" style={{ height: 248 }}>
      {/* Nav */}
      <div className="flex items-center justify-between px-4 h-8 border-b border-slate-100 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-14 h-3 bg-slate-800 rounded-sm" />
          <div className="w-11 h-2 bg-slate-200 rounded-sm" />
          <div className="w-9 h-2 bg-slate-200 rounded-sm" />
          <div className="w-7 h-2 bg-slate-200 rounded-sm" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-11 h-2 bg-slate-200 rounded-sm" />
          <div className="w-20 h-5 bg-slate-800 rounded" />
        </div>
      </div>

      {/* Hero */}
      <div className="px-6 pt-5 pb-4 bg-slate-50 border-b border-slate-100">
        <div className="w-3/4 h-3.5 bg-slate-300 rounded mx-auto" />
        <div className="w-1/2 h-3.5 bg-slate-300 rounded mx-auto mt-1.5" />
        <div className="w-2/5 h-2 bg-slate-200 rounded mx-auto mt-2" />
        <div className="flex justify-center gap-2 mt-4">
          <div className="w-28 h-7 bg-slate-800 rounded" />
          <div className="w-24 h-7 bg-white border border-slate-300 rounded" />
        </div>
      </div>

      {/* Feature cards */}
      <div className="px-3 pt-3 pb-2 grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="p-2.5 border border-slate-100 rounded-lg bg-white space-y-1.5">
            <div className="w-5 h-5 bg-slate-200 rounded" />
            <div className="w-full h-2 bg-slate-200 rounded-sm" />
            <div className="w-3/4 h-1.5 bg-slate-100 rounded-sm" />
            <div className="w-1/2 h-1.5 bg-slate-100 rounded-sm" />
          </div>
        ))}
      </div>

      {/* Faded footer hint */}
      <div className="px-4 pt-1 opacity-40">
        <div className="flex gap-3">
          <div className="w-20 h-2 bg-slate-200 rounded-sm" />
          <div className="w-16 h-2 bg-slate-200 rounded-sm" />
          <div className="w-24 h-2 bg-slate-200 rounded-sm" />
        </div>
      </div>
    </div>
  )
}

function ScrollHeatmapOverlay() {
  const milestonePositions = [
    { pct: 25, sessions: 4201, top: '22%', label: '25%' },
    { pct: 50, sessions: 3127, top: '44%', label: '50%' },
    { pct: 75, sessions: 1958, top: '66%', label: '75%' },
    { pct: 90, sessions: 1076, top: '82%', label: '90%' },
    { pct: 100, sessions: 489, top: '96%', label: '100%' },
  ]

  return (
    <>
      {/* Gradient heat band */}
      <div
        className="absolute inset-0 pointer-events-none rounded-b-lg"
        style={{
          background: `linear-gradient(to bottom,
            rgba(255,20,20,0.48) 0%,
            rgba(255,100,0,0.40) 20%,
            rgba(255,220,0,0.30) 38%,
            rgba(80,220,80,0.22) 55%,
            rgba(0,180,255,0.28) 72%,
            rgba(0,80,220,0.38) 90%,
            rgba(0,40,200,0.45) 100%
          )`,
        }}
      />
      {/* Depth milestone markers */}
      <div className="absolute inset-0 pointer-events-none">
        {milestonePositions.map((m) => (
          <div
            key={m.pct}
            className="absolute right-2 flex items-center gap-1"
            style={{ top: m.top, transform: 'translateY(-50%)' }}
          >
            <div className="h-px flex-1 bg-white/60" style={{ width: 16 }} />
            <div className="bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded font-medium leading-none whitespace-nowrap">
              {m.label} · {m.sessions.toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

export const HeatmapClickCard = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function HeatmapClickCard(props, ref) {
    const { t } = useTranslation('heatmap')
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      function draw() {
        if (!canvas) return
        const rect = canvas.getBoundingClientRect()
        const w = Math.round(rect.width)
        const h = Math.round(rect.height)
        if (w === 0 || h === 0) return
        const grid: HeatmapGridPoint[] = MOCK_CLICK_FRACTIONS.map(([xf, yf, count]) => ({
          x: Math.round(xf * w),
          y: Math.round(yf * h),
          count,
        }))
        renderHeatmap(canvas, grid, w, h, Math.round(w * 0.05))
      }
      const timer = setTimeout(draw, 0)
      const observer = new ResizeObserver(draw)
      observer.observe(canvas)
      return () => {
        clearTimeout(timer)
        observer.disconnect()
      }
    }, [])

    return (
      <Card
        ref={ref}
        customClass="!bg-card !border-border shadow-lg cursor-grab active:cursor-grabbing overflow-hidden"
        data-swap-card
        {...props}
      >
        <div className="flex flex-col h-full p-4 gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <MousePointerClick className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-semibold text-foreground">
              {t('demo.features.clickMap.title', 'Click Heatmap')}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 shrink-0">
            <div className="rounded-lg border bg-muted/40 p-2.5 flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 rounded-md shrink-0">
                <MousePointerClick className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">{t('stats.totalClicks')}</p>
                <p className="text-base font-bold text-foreground">12,840</p>
              </div>
            </div>
            <div className="rounded-lg border bg-muted/40 p-2.5 flex items-center gap-2">
              <div className="p-1.5 bg-violet-50 rounded-md shrink-0">
                <LayoutList className="w-3.5 h-3.5 text-violet-500" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">{t('stats.uniqueVisitors')}</p>
                <p className="text-base font-bold text-foreground">3,210</p>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <MockBrowserFrame>
              <div className="relative">
                <MockPageLayout />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                />
              </div>
            </MockBrowserFrame>
          </div>
        </div>
      </Card>
    )
  }
)

export const HeatmapRageClickCard = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function HeatmapRageClickCard(props, ref) {
  const { t } = useTranslation('heatmap')
  return (
    <Card
      ref={ref}
      customClass="!bg-card !border-border shadow-lg cursor-grab active:cursor-grabbing overflow-hidden"
      data-swap-card
      {...props}
    >
      <div className="flex flex-col h-full p-4 gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <Zap className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-semibold text-foreground">
            {t('demo.features.rageClicks.title', 'Interactions')}
          </span>
        </div>
        <div className="space-y-3 flex-1 overflow-hidden">
          <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
            <p className="text-xs font-semibold text-slate-700">{t('elements.title')}</p>
            <HeatmapElementList elements={MOCK_ELEMENTS} />
          </div>
          <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-orange-500" />
              <p className="text-xs font-semibold text-slate-700">{t('rageClicks.title')}</p>
            </div>
            <RageClickList elements={MOCK_RAGE_CLICKS} isLoading={false} />
          </div>
        </div>
      </div>
    </Card>
  )
})

export function HeatmapDemoV2({
  canAccess = false,
  onContinue,
}: {
  canAccess?: boolean
  onContinue?: () => void
}) {
  const { t } = useTranslation('heatmap')
  const { t: tCommon } = useTranslation('common')
  const [tab, setTab] = useState<'click' | 'scroll'>('click')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (tab !== 'click') return
    const canvas = canvasRef.current
    if (!canvas) return

    function draw() {
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const w = Math.round(rect.width)
      const h = Math.round(rect.height)
      if (w === 0 || h === 0) return

      const grid: HeatmapGridPoint[] = MOCK_CLICK_FRACTIONS.map(([xf, yf, count]) => ({
        x: Math.round(xf * w),
        y: Math.round(yf * h),
        count,
      }))

      renderHeatmap(canvas, grid, w, h, Math.round(w * 0.05))
    }

    const timer = setTimeout(draw, 0)
    const observer = new ResizeObserver(draw)
    observer.observe(canvas)
    return () => {
      clearTimeout(timer)
      observer.disconnect()
    }
  }, [tab])

  return (
    <div className="px-4 md:px-6 lg:px-12 py-6 grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
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

      {/* Right 3/5: demo visualization */}
      <div className="lg:col-span-3 space-y-3">
        {/* Demo notice */}
        <div className="flex items-center gap-2 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          {t('demo.demoNotice')}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
          <button
            onClick={() => setTab('click')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              tab === 'click'
                ? 'bg-white shadow-sm text-foreground'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <MousePointerClick className="w-3.5 h-3.5" />
            {t('tabs.click')}
          </button>
          <button
            onClick={() => setTab('scroll')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              tab === 'scroll'
                ? 'bg-white shadow-sm text-foreground'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            {t('tabs.scroll')}
          </button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-3">
          {tab === 'click' ? (
            <>
              <div className="rounded-lg border bg-card p-3 flex items-center gap-3">
                <div className="p-1.5 bg-blue-50 rounded-md shrink-0">
                  <MousePointerClick className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('stats.totalClicks')}</p>
                  <p className="text-xl font-bold text-foreground">12,840</p>
                </div>
              </div>
              <div className="rounded-lg border bg-card p-3 flex items-center gap-3">
                <div className="p-1.5 bg-violet-50 rounded-md shrink-0">
                  <LayoutList className="w-4 h-4 text-violet-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('stats.uniqueVisitors')}</p>
                  <p className="text-xl font-bold text-foreground">3,210</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-lg border bg-card p-3 flex items-center gap-3">
                <div className="p-1.5 bg-emerald-50 rounded-md shrink-0">
                  <ArrowDownToLine className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('stats.totalSessions')}</p>
                  <p className="text-xl font-bold text-foreground">4,890</p>
                </div>
              </div>
              <div className="rounded-lg border bg-card p-3 flex items-center gap-3">
                <div className="p-1.5 bg-amber-50 rounded-md shrink-0">
                  <Zap className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('stats.reachedBottom')}</p>
                  <p className="text-xl font-bold text-foreground">10%</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Browser frame with heatmap */}
        <MockBrowserFrame>
          <div className="relative">
            <MockPageLayout />
            {tab === 'click' ? (
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none"
              />
            ) : (
              <ScrollHeatmapOverlay />
            )}
          </div>
        </MockBrowserFrame>

        {/* Detail data below the frame */}
        {tab === 'click' ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border bg-card p-3 space-y-1">
              <p className="text-xs font-semibold text-slate-700">{t('elements.title')}</p>
              <HeatmapElementList elements={MOCK_ELEMENTS} />
            </div>
            <div className="rounded-lg border bg-card p-3 space-y-1">
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-orange-500" />
                <p className="text-xs font-semibold text-slate-700">{t('rageClicks.title')}</p>
              </div>
              <RageClickList elements={MOCK_RAGE_CLICKS} isLoading={false} />
            </div>
          </div>
        ) : (
          <div className="rounded-lg border bg-card p-3">
            <p className="text-xs font-semibold text-slate-700 mb-2">{t('scrollStats.title')}</p>
            <ScrollHeatmapStats
              milestones={MOCK_SCROLL_MILESTONES}
              totalSessions={MOCK_SCROLL_TOTAL}
            />
          </div>
        )}
      </div>
    </div>
  )
}
