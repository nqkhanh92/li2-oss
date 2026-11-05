'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import {
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  Users,
  ChevronLeft,
  ChevronRight,
  MousePointerClick,
  MapPin,
  User,
  Target,
  MoveHorizontal,
} from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import Image from 'next/image'
import { useGetStepVisitors, useGetFunnel } from '../hooks/queries'
import { VisitorDetail } from './visitor-detail'
import type { StepMetrics, StepVisitor } from '../types'

const STEP_COLORS = ['#F36600', '#11A5A5', '#4125B9', '#F7B713']
function getStepColor(i: number) {
  return STEP_COLORS[i % STEP_COLORS.length]
}

type FilterType = 'all' | 'proceeded' | 'dropped_off'
const DESKTOP_LIMIT = 20
const MOBILE_LIMIT = 8

// ─── Browser icon ─────────────────────────────────────────────────────

function BrowserIcon({ browser, size = 20 }: { browser: string | null; size?: number }) {
  if (!browser)
    return <Globe className="text-slate-400 shrink-0" style={{ width: size, height: size }} />
  const b = browser.toLowerCase()
  let src = ''
  if (b.includes('firefox')) src = '/assets/icons/firefox.svg'
  else if (b.includes('safari')) src = '/assets/icons/safari.svg'
  else if (b.includes('edge')) src = '/assets/icons/ms-edge.svg'
  else if (b.includes('opera')) src = '/assets/icons/opera.svg'
  else if (b.includes('brave')) src = '/assets/icons/brave.svg'
  else if (b.includes('chrome')) src = '/assets/icons/chrome.svg'
  else return <Globe className="text-slate-400 shrink-0" style={{ width: size, height: size }} />

  return <Image src={src} alt={browser} width={size} height={size} className="shrink-0" />
}

// ─── FunnelStepTabs ───────────────────────────────────────────────────

function FunnelStepTabs({
  steps,
  selectedStep,
  onSelectStep,
}: {
  steps: StepMetrics[]
  selectedStep: number
  onSelectStep: (pos: number) => void
}) {
  const { t } = useTranslation('funnels')
  // `visits`, KHÔNG `entries`: tử số ở `barHeightPct` dưới là `step.visits`. Bản của QQuik main
  // (`2bfb3f1e`) chỉ revert tử số mà để mẫu số là `entries`, nên bước nào có visits > entries thì
  // thanh vượt 100% và tràn khỏi khung. Hotfix cùng tên trên nhánh này (`d9590b4f`) revert cả hai.
  const maxVisits = Math.max(...steps.map((s) => s.visits), 1)
  const scrollRef = useRef<HTMLDivElement>(null)
  const dragState = useRef({ isDragging: false, startX: 0, scrollLeft: 0 })
  const [isHovered, setIsHovered] = useState(false)
  const [canScrollX, setCanScrollX] = useState(false)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const check = () => setCanScrollX(el.scrollWidth > el.clientWidth)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [steps])

  const onMouseDown = (e: React.MouseEvent) => {
    const el = scrollRef.current
    if (!el) return
    dragState.current = { isDragging: true, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft }
    el.style.cursor = 'grabbing'
  }
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragState.current.isDragging || !scrollRef.current) return
    e.preventDefault()
    const x = e.pageX - scrollRef.current.offsetLeft
    scrollRef.current.scrollLeft = dragState.current.scrollLeft - (x - dragState.current.startX)
  }
  const onMouseUp = () => {
    dragState.current.isDragging = false
    if (scrollRef.current) scrollRef.current.style.cursor = 'grab'
  }

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
      const canScrollX = el.scrollWidth > el.clientWidth
      if (!canScrollX) return
      e.preventDefault()
      el.scrollBy({ left: e.deltaY, behavior: 'smooth' })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isHovered && canScrollX && (
        <div className="absolute bottom-1 left-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800/70 text-white pointer-events-none">
          <MoveHorizontal className="w-3 h-3 shrink-0" />
          <span className="text-[10px] leading-none">{t('mainCard.scrollHint')}</span>
        </div>
      )}
    <div
      ref={scrollRef}
      className="overflow-x-auto cursor-grab select-none [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:h-0"
      style={{ scrollbarWidth: 'none' }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
    <div
      className="grid grid-cols-2 md:grid-cols-[var(--step-cols)] md:min-w-[var(--step-min-w)]"
      style={{
        '--step-cols': `repeat(${steps.length}, minmax(200px, 1fr))`,
        '--step-min-w': `${steps.length * 200}px`,
      } as React.CSSProperties}
    >
      {steps.map((step, i) => {
        const color = getStepColor(i)
        const isSelected = step.step_position === selectedStep
        const isLast = i === steps.length - 1
        const barHeightPct = Math.max(4, Math.round((step.visits / maxVisits) * 100))

        return (
          <button
            key={step.step_position}
            onClick={() => onSelectStep(step.step_position)}
            className={cn(
              'flex flex-col gap-2 p-4 md:p-6 text-left transition-colors hover:bg-slate-50',
              isSelected ? 'border-b-2 border-b-slate-800' : 'border-b border-b-slate-300',
              i % 2 !== 0 && 'border-l border-l-slate-300',
              i % 2 === 0 && i > 0 && 'md:border-l md:border-l-slate-300',
              isLast && steps.length % 2 !== 0 && 'border-r border-r-slate-300 md:border-r-transparent'
            )}
          >
            {/* Badge + step name */}
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="shrink-0 flex items-center justify-center w-5 h-5 rounded-[4px] text-[10px] font-semibold text-white leading-none"
                style={{ backgroundColor: color }}
              >
                {step.step_position}
              </span>
              <span className="text-s text-slate-500 truncate">{step.step_name}</span>
            </div>

            {/* Entry count */}
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-semibold text-slate-700 leading-7">
                {step.visits.toLocaleString()}
              </span>
              <span className="text-s text-slate-500">{t('mainCard.entries')}</span>
            </div>

            {/* Mini bar chart */}
            <div
              className="rounded-[8px] h-[50px] w-full relative overflow-hidden"
              style={{ backgroundColor: 'rgba(67,126,247,0.1)' }}
            >
              <div
                className="absolute bottom-0 left-0 right-0 rounded-[4px] transition-all"
                style={{ height: `${barHeightPct}%`, backgroundColor: '#437EF7' }}
              />
            </div>

            {/* Drop-off / conversion row */}
            <div className="flex items-center justify-between w-full">
              {isLast ? (
                <span className="text-s text-emerald-600">
                  {step.proceeds.toLocaleString()} {t('mainCard.conversions')}
                </span>
              ) : (
                <>
                  <span className="text-s text-red-600">
                    {step.drop_offs.toLocaleString()} {t('mainCard.dropped')}
                  </span>
                  <span className="text-s text-red-600">{step.drop_off_rate.toFixed(1)}%</span>
                </>
              )}
            </div>
          </button>
        )
      })}
    </div>
    </div>
    </div>
  )
}

// ─── Visit item row ───────────────────────────────────────────────────

function VisitorCard({
  visitor,
  totalSteps,
  isSelected,
  onClick,
}: {
  visitor: StepVisitor
  totalSteps: number
  isSelected: boolean
  onClick: () => void
}) {
  const { t } = useTranslation('funnels')
  const DeviceIcon = getDeviceIcon(visitor.device_type)

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-4 border border-slate-300 rounded-[8px] px-4 py-4 md:py-2 text-left transition-colors shrink-0',
        isSelected ? 'bg-slate-50 border-slate-400' : 'bg-white hover:bg-slate-50'
      )}
    >
      {/* Browser icon circle — shrink-0 */}
      <div className="shrink-0 bg-blue-50 flex items-center justify-center p-2 rounded-full">
        <BrowserIcon browser={visitor.browser} size={20} />
      </div>

      {/* Inner container */}
      <div className="flex flex-1 gap-4 items-center min-w-0">
        {/* Left column: 2 lines on mobile, 2 lines on desktop */}
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          {/* Line 1: visitor ID + device info */}
          <div className="flex gap-2 items-center min-w-0">
            <div className="flex gap-1 items-center shrink-0 min-w-0 flex-1">
              <User className="w-3 h-3 text-[#5F6D7E] shrink-0" />
              <span className="text-xs leading-4 text-[#5F6D7E] truncate min-w-0">
                {visitor.visitor_id}
              </span>
            </div>
            <div className="flex gap-1 items-center shrink-0">
              <DeviceIcon className="w-3 h-3 text-[#5F6D7E] shrink-0" />
              <span className="text-xs leading-4 text-[#5F6D7E] whitespace-nowrap">
                {visitor.browser}
              </span>
            </div>
          </div>
          {/* Line 2: location + date + status */}
          <div className="flex gap-2 items-center min-w-0">
            {visitor.country && (
              <div className="flex gap-1 items-center flex-1 min-w-0">
                <MapPin className="w-3 h-3 text-[#5F6D7E] shrink-0" />
                <span className="text-xs leading-4 text-[#5F6D7E] truncate min-w-0">
                  {visitor.city ? `${visitor.city}, ` : ''}{visitor.country}
                </span>
              </div>
            )}
            <span className="text-xs italic text-[#5F6D7E] whitespace-nowrap shrink-0">
              {formatRelativeTime(visitor.started_at)}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <Target className="w-3 h-3 text-[#5F6D7E] shrink-0" />
              <span className="text-xs text-slate-600 whitespace-nowrap">
                {visitor.reached_step}/{totalSteps}
              </span>
            </div>
            {visitor.completed ? (
              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs whitespace-nowrap shrink-0">
                {t('visitors.done')}
              </span>
            ) : visitor.dropped_off ? (
              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-[#fef2f2] text-[#dc2626] text-xs whitespace-nowrap shrink-0">
                Dropped
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </button>
  )
}

// ─── Session detail panel ─────────────────────────────────────────────

function SessionDetailPanel({
  sessionId,
  funnelId,
  orgId,
  onBack,
}: {
  sessionId: string
  funnelId: string
  orgId: string
  onBack: () => void
}) {
  const { t } = useTranslation('funnels')
  const { data: funnelData } = useGetFunnel(orgId, funnelId)
  const funnelSteps = funnelData?.data?.funnel_steps ?? []
  return (
    <div className="border border-[#437EF7] rounded-[16px] shadow-sm h-full overflow-hidden">
      <VisitorDetail
        orgId={orgId}
        sessionId={sessionId}
        funnelSteps={funnelSteps}
        onBack={onBack}
        panelMode
        panelTitle={t('mainCard.visitorSession', 'Visitor Session')}
      />
    </div>
  )
}

function SessionDetailPlaceholder() {
  const { t } = useTranslation('funnels')
  return (
    <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 border border-dashed border-slate-200 rounded-[16px]">
      <MousePointerClick className="w-10 h-10 opacity-30" />
      <p className="text-sm">
        {t('mainCard.selectVisitor', 'Select a visitor to view session detail')}
      </p>
    </div>
  )
}

// ─── FunnelMainCard ───────────────────────────────────────────────────

interface FunnelMainCardProps {
  funnelId: string
  steps: StepMetrics[]
  dateRange: { from: string; to: string }
}

export function FunnelMainCard({ funnelId, steps, dateRange }: FunnelMainCardProps) {
  const { org_id } = useParams<{ org_id: string }>()
  const { t } = useTranslation('funnels')

  const [selectedStepPosition, setSelectedStepPosition] = useState<number>(
    steps[0]?.step_position ?? 1
  )
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterType>('all')
  const [page, setPage] = useState(1)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768
      setIsMobile((prev) => {
        if (prev !== mobile) setPage(1)
        return mobile
      })
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const limit = isMobile ? MOBILE_LIMIT : DESKTOP_LIMIT

  const selectedStepMetrics = useMemo(
    () => steps.find((s) => s.step_position === selectedStepPosition),
    [steps, selectedStepPosition]
  )

  const isLastStep = selectedStepPosition === steps.length

  const { data, isLoading } = useGetStepVisitors(org_id, funnelId, selectedStepPosition, {
    from: dateRange.from,
    to: dateRange.to,
    filter,
    page,
    limit,
  })

  const visitors = data?.data?.visitors ?? []
  const total = data?.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / limit))

  const handleSelectStep = (position: number) => {
    setSelectedStepPosition(position)
    setSelectedSessionId(null)
    setFilter('all')
    setPage(1)
  }

  const handleFilterChange = (value: string) => {
    setFilter(value as FilterType)
    setPage(1)
    setSelectedSessionId(null)
  }

  return (
    <div className="flex flex-col gap-10 border border-slate-300 rounded-[8px] bg-white overflow-x-clip">
      {/* Step tabs */}
      <FunnelStepTabs
        steps={steps}
        selectedStep={selectedStepPosition}
        onSelectStep={handleSelectStep}
      />

      {/* Content: header + two panels */}
      <div className="flex flex-col gap-6 px-4 pb-4 md:px-6 md:pb-6">
        {/* Shared header: "Step Details" + filter tabs */}
        <div className="flex flex-col gap-2">
          <p className="text-base font-medium text-slate-700">
            {t('report.stepDetails', 'Step Details')}
          </p>
          <Tabs value={filter} onValueChange={handleFilterChange}>
            <TabsList variant="outline" className="w-full border-b border-slate-300 pb-0 gap-4">
              <TabsTrigger
                value="all"
                variant="outline"
                className="data-[state=active]:border-slate-800 text-slate-500 data-[state=active]:text-slate-800 px-0 pb-2"
              >
                {t('visitors.all')}
                {selectedStepMetrics ? ` (${selectedStepMetrics.visits})` : ''}
              </TabsTrigger>
              {!isLastStep && (
                <>
                  <TabsTrigger
                    value="proceeded"
                    variant="outline"
                    className="data-[state=active]:border-slate-800 text-slate-500 data-[state=active]:text-slate-800 px-0 pb-2"
                  >
                    {t('visitors.proceeded')}
                    {selectedStepMetrics ? ` (${selectedStepMetrics.proceeds})` : ''}
                  </TabsTrigger>
                  <TabsTrigger
                    value="dropped_off"
                    variant="outline"
                    className="data-[state=active]:border-slate-800 text-slate-500 data-[state=active]:text-slate-800 px-0 pb-2"
                  >
                    {t('visitors.droppedOff')}
                    {selectedStepMetrics ? ` (${selectedStepMetrics.drop_offs})` : ''}
                  </TabsTrigger>
                </>
              )}
            </TabsList>
          </Tabs>
        </div>

        {/* Two panels */}
        <div className="flex flex-col gap-6 md:flex-row md:gap-9 md:h-[600px]">
          {/* Left: scrollable visitor list — hidden on mobile when session selected */}
          <div className={cn('flex-1 flex flex-col min-w-0 overflow-hidden min-h-[320px] md:min-h-0', selectedSessionId && 'hidden md:flex')}>
            {isLoading ? (
              <div className="space-y-2 overflow-hidden">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-[52px] w-full rounded-[8px]" />
                ))}
              </div>
            ) : visitors.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                <Users className="w-10 h-10 opacity-40" />
                <p className="text-sm font-medium">{t('visitors.noVisitors')}</p>
                <p className="text-xs">
                  {filter !== 'all'
                    ? t('visitors.tryDifferentFilter')
                    : t('visitors.noSessionsPeriod')}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 overflow-y-auto flex-1 min-h-0 pr-2">
                {visitors.map((visitor) => (
                  <VisitorCard
                    key={visitor.session_id}
                    visitor={visitor}
                    totalSteps={steps.length}
                    isSelected={visitor.session_id === selectedSessionId}
                    onClick={() => setSelectedSessionId(visitor.session_id)}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-3 border-t border-slate-200 mt-3 shrink-0">
                <span className="text-xs text-slate-500">
                  {t('visitors.pagination', { page, total: totalPages, count: total })}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="xs"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="xs"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Right: session detail or placeholder */}
          <div className={cn('flex-1 min-w-0 overflow-hidden min-h-[400px] md:min-h-0', !selectedSessionId && 'hidden md:block')}>
            {selectedSessionId ? (
              <SessionDetailPanel
                sessionId={selectedSessionId}
                funnelId={funnelId}
                orgId={org_id}
                onBack={() => setSelectedSessionId(null)}
              />
            ) : (
              <SessionDetailPlaceholder />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Utilities ────────────────────────────────────────────────────────

function getDeviceIcon(deviceType: string | null) {
  switch (deviceType?.toLowerCase()) {
    case 'mobile':
      return Smartphone
    case 'tablet':
      return Tablet
    default:
      return Monitor
  }
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
