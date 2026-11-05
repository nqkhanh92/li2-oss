'use client'

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Button } from '@/shared/components/ui/button'
import {
  ArrowLeft,
  Monitor,
  Smartphone,
  Tablet,
  MapPin,
  ExternalLink,
  Clock,
  FileText,
  LogIn,
  LogOut,
  Target,
  CircleDot,
  Check,
  TriangleAlert,
} from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { useGetSessionPageviews } from '../hooks/queries'
import { computeStepMatches, findNextUnmatchedStep } from '../lib/step-matching'
import type { SessionDetail, PageviewDetail, FunnelStep } from '../types'

// ─── VisitorInfoCards ────────────────────────────────────────────────

function InfoCard({
  icon: Icon,
  label,
  primary,
  secondary,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  primary: React.ReactNode
  secondary?: React.ReactNode
}) {
  return (
    <div className="flex-1 bg-white border border-slate-300 rounded-[10px] flex flex-col gap-1 p-3 min-w-0">
      {/* Label row */}
      <div className="flex gap-1.5 h-4 items-center w-full">
        <Icon className="w-3 h-3 text-[#5F6D7E] shrink-0" />
        <span className="text-xs text-[#5F6D7E] uppercase leading-4 flex-1 min-w-0">{label}</span>
      </div>
      {/* Value */}
      <div className="flex gap-1.5 items-center flex-wrap">
        <span className="text-s font-medium text-[#1E293B] leading-5">{primary ?? '—'}</span>
        {secondary && (
          <span className="text-xs text-[#5F6D7E] leading-4">{secondary}</span>
        )}
      </div>
    </div>
  )
}

function VisitorInfoCards({ session }: { session: SessionDetail }) {
  const { t } = useTranslation('funnels')
  const DeviceIcon = getDeviceIcon(session.device_type)
  const location = [session.city, session.country].filter(Boolean).join(', ')
  const browser = [session.browser, session.browser_version].filter(Boolean).join(' ')

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <InfoCard
          icon={DeviceIcon}
          label={t('visitorDetail.browser')}
          primary={browser || null}
          secondary={[session.os, session.os_version].filter(Boolean).join(' ') || undefined}
        />
        <InfoCard
          icon={ExternalLink}
          label={t('visitorDetail.source')}
          primary={session.referrer_domain || t('visitorDetail.direct')}
        />
      </div>
      <div className="flex gap-2">
        <InfoCard
          icon={Monitor}
          label={t('visitorDetail.device')}
          primary={session.device_type ?? null}
        />
        <InfoCard
          icon={MapPin}
          label={t('visitorDetail.location')}
          primary={location || null}
        />
      </div>
    </div>
  )
}

// ─── SessionSummary ──────────────────────────────────────────────────

function SummaryRow({
  icon: Icon,
  label,
  value,
  mono,
  right,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value?: string
  mono?: boolean
  right?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between w-full">
      <div className="flex gap-1 items-center shrink-0">
        <Icon className="w-3 h-3 text-[#5F6D7E]" />
        <span className="text-xs text-[#5F6D7E] leading-4">{label}</span>
      </div>
      {right ?? (
        <span className={cn('text-xs text-[#5F6D7E] leading-4 text-right ml-2 min-w-0 break-all', mono && 'font-mono')}>
          {value ?? '—'}
        </span>
      )}
    </div>
  )
}

function SessionSummary({
  session,
  matchedCount,
  totalSteps,
  lastStepMatched,
  pageCount,
  eventCount,
  conversionCount,
}: {
  session: SessionDetail
  matchedCount: number
  totalSteps: number
  lastStepMatched: boolean
  pageCount: number
  eventCount: number
  conversionCount: number
}) {
  const { t } = useTranslation('funnels')
  const formattedStart = new Date(session.started_at).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })

  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs text-[#5F6D7E] uppercase leading-4">
        {t('visitorDetail.sessionSummary')}
      </p>
      <div className="bg-white border border-slate-300 rounded-[6px] flex flex-col gap-1.5 p-3">
        <SummaryRow icon={Clock} label={t('visitorDetail.started')} value={formattedStart} />
        <SummaryRow icon={Clock} label={t('visitorDetail.duration')} value={formatDuration(session.duration_ms)} />
        <SummaryRow icon={FileText} label={t('visitorDetail.pagesViewed')} value={String(pageCount)} />
        {eventCount > 0 && (
          <SummaryRow icon={CircleDot} label={t('visitorDetail.eventsCaptured', 'Events Captured')} value={String(eventCount)} />
        )}
        {conversionCount > 0 && (
          <SummaryRow icon={Target} label={t('visitorDetail.conversions', 'Conversions')} value={String(conversionCount)} />
        )}
        <SummaryRow icon={LogIn} label={t('visitorDetail.entryPage')} value={session.entry_page ?? '—'} mono />
        <SummaryRow icon={LogOut} label={t('visitorDetail.exitPage')} value={session.exit_page ?? '—'} mono />
        {totalSteps > 0 && (
          <SummaryRow
            icon={Target}
            label={t('visitorDetail.funnelProgress')}
            right={
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs text-[#475569] whitespace-nowrap">
                  {t('visitorDetail.stepsOf', { matched: matchedCount, total: totalSteps })}
                </span>
                {lastStepMatched ? (
                  <span className="inline-flex items-center justify-center w-[76px] px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs whitespace-nowrap">
                    {t('visitorDetail.completed')}
                  </span>
                ) : (
                  <span className="inline-flex items-center justify-center w-[76px] px-3 py-1 rounded-full bg-[#fef2f2] text-[#dc2626] text-xs whitespace-nowrap">
                    {t('visitorDetail.dropped')}
                  </span>
                )}
              </div>
            }
          />
        )}
      </div>
    </div>
  )
}

// ─── ActionTimeline ──────────────────────────────────────────────────

function TimelineDot({
  matched,
  isEntry,
  isEvent,
  isConversion,
}: {
  matched: boolean
  isEntry: boolean
  isEvent: boolean
  isConversion: boolean
}) {
  if (isEntry) return <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
  if (isConversion) return <div className="w-2 h-2 rounded-full bg-violet-500 shrink-0" />
  if (isEvent) return <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
  if (matched) return <div className="w-2 h-2 rounded-full bg-[#437EF7] shrink-0" />
  return <div className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />
}

function TimelineItem({
  pageview,
  matchedStep,
  isEntry,
  isLast,
}: {
  pageview: PageviewDetail
  matchedStep?: FunnelStep
  isEntry: boolean
  isLast: boolean
}) {
  const { t } = useTranslation('funnels')
  const isEvent = !!pageview.event_name
  const isConversion = !!pageview.event_type
  const time = new Date(pageview.timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  return (
    <div className="flex gap-3 items-start">
      {/* Left: dot vertically centered with header row, then line */}
      <div className="flex flex-col items-center self-stretch shrink-0">
        <div className="h-6 flex items-center justify-center shrink-0">
          <TimelineDot matched={!!matchedStep} isEntry={isEntry} isEvent={isEvent} isConversion={isConversion} />
        </div>
        {!isLast && <div className="w-px flex-1 bg-slate-300 min-h-[8px]" />}
      </div>

      {/* Right: content */}
      <div className="flex-1 flex flex-col gap-0.5 pb-4 min-w-0">
        {/* Header: time + badges */}
        <div className="flex gap-2 h-6 items-center">
          <span className="font-mono text-xs text-[#475569] shrink-0">{time}</span>
          {isEntry && (
            <span className="text-xs uppercase text-[#475569]">
              {t('visitorDetail.entry')}
            </span>
          )}
          {isConversion && (
            <span className="text-xs uppercase text-violet-500">
              {pageview.event_type}
            </span>
          )}
          {isEvent && !isConversion && (
            <span className="text-xs uppercase text-amber-500">
              {t('visitorDetail.eventBadge', 'Event')}
            </span>
          )}
          {matchedStep && (
            <span className="text-xs uppercase text-[#437EF7]">
              {t('visitorDetail.stepBadge', { position: matchedStep.position })}
            </span>
          )}
        </div>

        {/* Label + path */}
        <p className="text-s text-[#1E293B] leading-5 truncate">
          {isConversion
            ? (pageview.event_type === 'lead' ? t('visitorDetail.leadConversion', 'Lead Conversion') : t('visitorDetail.saleConversion', 'Sale Conversion'))
            : isEvent
            ? pageview.event_name
            : (pageview.page_title || pageview.page_path)}
        </p>
        {!isConversion && <p className="text-xs text-[#94A3B8] leading-4 truncate">{pageview.page_path}</p>}

        {/* Matched rule */}
        {matchedStep && (
          <div className="flex gap-1 items-center mt-0.5">
            <Check className="w-3 h-3 text-green-600 shrink-0" />
            <span className="text-xs font-medium text-green-600 whitespace-nowrap">
              {t('visitorDetail.matched')} &ldquo;{matchedStep.condition} {matchedStep.pattern}&rdquo;
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function TimelineExit({
  nextUnmatchedStep,
}: {
  lastPageview: PageviewDetail
  nextUnmatchedStep: FunnelStep | null
}) {
  const { t } = useTranslation('funnels')
  return (
    <div className="flex gap-3 items-start">
      <div className="flex flex-col items-center shrink-0">
        <div className="h-6 flex items-center justify-center shrink-0">
          <div className="w-2 h-2 rounded-full bg-[#DC2626] shrink-0" />
        </div>
      </div>
      <div className="flex-1 flex flex-col gap-0.5 pb-2 min-w-0">
        <div className="flex gap-2 h-6 items-center">
          <span className="text-xs uppercase text-[#DC2626]">{t('visitorDetail.exit')}</span>
        </div>
        {nextUnmatchedStep && (
          <div className="flex gap-1 items-center">
            <TriangleAlert className="w-3 h-3 text-yellow-600 shrink-0" />
            <span className="text-xs font-medium text-yellow-600 whitespace-nowrap">
              {t('visitorDetail.droppedBefore', { position: nextUnmatchedStep.position, name: nextUnmatchedStep.name })}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function ActionTimeline({
  pageviews,
  funnelSteps,
}: {
  pageviews: PageviewDetail[]
  funnelSteps: FunnelStep[]
}) {
  const { t } = useTranslation('funnels')
  const matchedSteps = useMemo(
    () => computeStepMatches(pageviews, funnelSteps),
    [pageviews, funnelSteps]
  )

  // Display sort: chronological, with tie-breaking for same-millisecond records.
  // Logical order within the same timestamp:
  //   0 — regular pageviews (page load must precede any interaction)
  //   1 — custom events (event_name set)
  //   2 — conversion events (event_type set)
  // Within the same type, matched lower-step records come first.
  const sortedPageviews = useMemo(() => {
    const typeOrder = (pv: PageviewDetail) =>
      pv.event_type !== null ? 2 : pv.event_name !== null ? 1 : 0

    return [...pageviews].sort((a, b) => {
      const aTime = new Date(a.timestamp).getTime()
      const bTime = new Date(b.timestamp).getTime()
      if (aTime !== bTime) return aTime - bTime
      const tDiff = typeOrder(a) - typeOrder(b)
      if (tDiff !== 0) return tDiff
      const aStep = matchedSteps.get(a.id)
      const bStep = matchedSteps.get(b.id)
      if (aStep && bStep) return aStep.position - bStep.position
      if (aStep) return -1
      if (bStep) return 1
      return 0
    })
  }, [pageviews, matchedSteps])

  const nextUnmatched = useMemo(
    () => findNextUnmatchedStep(matchedSteps, funnelSteps),
    [matchedSteps, funnelSteps]
  )

  if (pageviews.length === 0) {
    return (
      <div className="text-center py-8 text-[#5F6D7E] text-xs">
        {t('visitorDetail.noPageviews')}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs text-[#5F6D7E] uppercase leading-4">
        {t('visitorDetail.pageJourney')}
      </p>
      <div className="bg-white border border-slate-300 rounded-[6px] p-3">
        {sortedPageviews.map((pv, index) => (
          <TimelineItem
            key={pv.id}
            pageview={pv}
            matchedStep={matchedSteps.get(pv.id)}
            isEntry={index === 0}
            isLast={index === sortedPageviews.length - 1}
          />
        ))}
        <TimelineExit
          lastPageview={pageviews[pageviews.length - 1]}
          nextUnmatchedStep={nextUnmatched}
        />
      </div>
    </div>
  )
}

// ─── VisitorDetail (main container) ──────────────────────────────────

interface VisitorDetailProps {
  orgId: string
  sessionId: string
  funnelSteps: FunnelStep[]
  onBack: () => void
  hideBackButton?: boolean
  panelMode?: boolean
  panelTitle?: string
}

export function VisitorDetail({
  orgId,
  sessionId,
  funnelSteps,
  onBack,
  hideBackButton,
  panelMode,
  panelTitle,
}: VisitorDetailProps) {
  const { t } = useTranslation('funnels')
  const { data, isLoading } = useGetSessionPageviews(orgId, sessionId)

  const session = data?.data?.session
  const pageviews = data?.data?.pageviews ?? []

  const matchedSteps = useMemo(
    () => (session ? computeStepMatches(pageviews, funnelSteps) : new Map()),
    [pageviews, funnelSteps, session]
  )

  const pageCount = useMemo(() => pageviews.filter((pv) => pv.event_name === null && pv.event_type === null).length, [pageviews])
  const eventCount = useMemo(() => pageviews.filter((pv) => pv.event_name !== null).length, [pageviews])
  const conversionCount = useMemo(() => pageviews.filter((pv) => pv.event_type !== null).length, [pageviews])

  const backButton = !hideBackButton && (
    <Button variant="ghost" size="sm" onClick={onBack} className="text-slate-500 -ml-2">
      <ArrowLeft className="w-4 h-4 mr-1" />
      {t('visitorDetail.backToVisitors')}
    </Button>
  )

  if (panelMode) {
    const stickyHeader = (
      <div className="px-4 pt-4 pb-3 shrink-0 flex flex-col gap-1 border-b border-slate-100">
        <div className="flex items-center gap-1">
          {!hideBackButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="md:hidden -ml-2 text-slate-500 shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          {panelTitle && (
            <p className="text-base font-medium text-slate-700">{panelTitle}</p>
          )}
        </div>
        {session && (
          <>
            <p className="text-xs text-[#5F6D7E] leading-4 truncate">
              {t('visitorDetail.sessionLabel')} {session.session_id}
            </p>
            <p className="text-xs text-[#5F6D7E] leading-4 truncate">
              {t('visitorDetail.visitorLabel')} {session.visitor_id}
            </p>
          </>
        )}
      </div>
    )

    if (isLoading) {
      return (
        <div className="h-full flex flex-col overflow-hidden">
          {panelTitle && (
            <div className="px-4 pt-4 pb-3 shrink-0 border-b border-slate-100 flex items-center gap-1">
              {!hideBackButton && (
                <Button variant="ghost" size="sm" onClick={onBack} className="md:hidden -ml-2 text-slate-500 shrink-0">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
              <p className="text-base font-medium text-slate-700">{panelTitle}</p>
            </div>
          )}
          <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      )
    }

    if (!session) {
      return (
        <div className="h-full flex flex-col overflow-hidden">
          {panelTitle && (
            <div className="px-4 pt-4 pb-3 shrink-0 border-b border-slate-100 flex items-center gap-1">
              {!hideBackButton && (
                <Button variant="ghost" size="sm" onClick={onBack} className="md:hidden -ml-2 text-slate-500 shrink-0">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
              <p className="text-base font-medium text-slate-700">{panelTitle}</p>
            </div>
          )}
          <div className="flex-1 flex items-center justify-center text-[#5F6D7E]">
            <CircleDot className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-xs">{t('visitorDetail.sessionNotFound')}</p>
          </div>
        </div>
      )
    }

    const lastStepMatched =
      funnelSteps.length > 0 &&
      Array.from(matchedSteps.values()).some(
        (s) => s.position === funnelSteps[funnelSteps.length - 1].position
      )

    return (
      <div className="h-full flex flex-col overflow-hidden">
        {stickyHeader}
        <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4 flex flex-col gap-3">
          <VisitorInfoCards session={session} />
          <SessionSummary
            session={session}
            matchedCount={matchedSteps.size}
            totalSteps={funnelSteps.length}
            lastStepMatched={lastStepMatched}
            pageCount={pageCount}
            eventCount={eventCount}
            conversionCount={conversionCount}
          />
          <ActionTimeline pageviews={pageviews} funnelSteps={funnelSteps} />
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {backButton}
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="space-y-3">
        {backButton}
        <div className="text-center py-12 text-[#5F6D7E]">
          <CircleDot className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-xs">{t('visitorDetail.sessionNotFound')}</p>
        </div>
      </div>
    )
  }

  const lastStepMatched =
    funnelSteps.length > 0 &&
    Array.from(matchedSteps.values()).some(
      (s) => s.position === funnelSteps[funnelSteps.length - 1].position
    )

  return (
    <div className="flex flex-col gap-3">
      {backButton}

      {/* Session / Visitor IDs */}
      <div className="flex flex-col gap-1">
        <p className="text-xs text-[#5F6D7E] leading-4 truncate">
          {t('visitorDetail.sessionLabel')} {session.session_id}
        </p>
        <p className="text-xs text-[#5F6D7E] leading-4 truncate">
          {t('visitorDetail.visitorLabel')} {session.visitor_id}
        </p>
      </div>

      {/* 2×2 info cards */}
      <VisitorInfoCards session={session} />

      {/* Session summary */}
      <SessionSummary
        session={session}
        matchedCount={matchedSteps.size}
        totalSteps={funnelSteps.length}
        lastStepMatched={lastStepMatched}
        pageCount={pageCount}
        eventCount={eventCount}
        conversionCount={conversionCount}
      />

      {/* Page journey */}
      <ActionTimeline pageviews={pageviews} funnelSteps={funnelSteps} />
    </div>
  )
}

// ─── Utilities ───────────────────────────────────────────────────────

function getDeviceIcon(deviceType: string | null) {
  switch (deviceType?.toLowerCase()) {
    case 'mobile': return Smartphone
    case 'tablet': return Tablet
    default: return Monitor
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return '<1s'
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes === 0) return `${seconds}s`
  if (minutes < 60) return `${minutes}m ${seconds}s`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m`
}
