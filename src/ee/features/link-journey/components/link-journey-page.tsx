'use client'

import { useMemo, useState, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import type { DateRange } from 'react-day-picker'
import { DateRangePicker } from '@/shared/components/customize/date-range-picker'
import { Button } from '@/shared/components/ui/button'
import { Link2, MousePointerClick, FileText, Pointer, ShoppingCart } from 'lucide-react'
import { LinkJourneyDemoV4 } from './link-journey-demo-v4'
import { JourneyStep } from './journey-step'
import { useOrganizationStore } from '@/shared/stores/organization-store'
import {
  useLinkJourneyTouchPoints,
  useLinkJourneyTraffic,
  useLinkJourneyPageFlow,
  useLinkJourneyBehavioral,
  useLinkJourneyConversions,
} from '../hooks/queries'
import { LinkSelector } from './link-selector'
import { TrafficSummary } from './traffic-summary'
import { PageFlow } from './page-flow'
import { BehavioralHighlights } from './behavioral-highlights'
import { ConversionFunnel } from './conversion-funnel'

function formatDateParam(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function LinkJourneyPage() {
  const { t } = useTranslation('link-journey')
  const { org_id } = useParams<{ org_id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Plan gating
  const orgPlan = useOrganizationStore((s) => s.orgPlan)
  const isPremium =
    orgPlan?.advanced_features_allowed?.includes('conversion_tracking') ?? false

  const [showIntro, setShowIntro] = useState(() => {
    if (!isPremium) return true
    if (typeof window === 'undefined') return false
    return !localStorage.getItem('li2_link_journey_intro_seen')
  })

  function handleContinue() {
    if (typeof window !== 'undefined') localStorage.setItem('li2_link_journey_intro_seen', '1')
    setShowIntro(false)
  }

  // Date range: default last 30 days
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - 30)
    return { from, to }
  })

  const fromStr = useMemo(
    () => (dateRange?.from ? formatDateParam(dateRange.from) : ''),
    [dateRange?.from]
  )
  const toStr = useMemo(
    () => (dateRange?.to ? formatDateParam(dateRange.to) : ''),
    [dateRange?.to]
  )

  // Selected touch point from URL
  const selectedTpId = searchParams.get('tp_id')

  const handleSelectTp = useCallback(
    (tpId: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('tp_id', tpId)
      router.replace(`?${params.toString()}`, { scroll: false })
    },
    [router, searchParams]
  )

  // Queries
  const { data: touchPoints, isLoading: tpLoading } = useLinkJourneyTouchPoints(org_id)
  const { data: traffic, isLoading: trafficLoading } = useLinkJourneyTraffic(
    org_id,
    selectedTpId ?? '',
    fromStr,
    toStr
  )
  const { data: pageFlow, isLoading: pageFlowLoading } = useLinkJourneyPageFlow(
    org_id,
    selectedTpId ?? '',
    fromStr,
    toStr
  )
  const { data: behavioral, isLoading: behavioralLoading } = useLinkJourneyBehavioral(
    org_id,
    selectedTpId ?? '',
    fromStr,
    toStr
  )
  const { data: conversions, isLoading: conversionsLoading } = useLinkJourneyConversions(
    org_id,
    selectedTpId ?? '',
    fromStr,
    toStr
  )

  // Empty state: no qualifying links
  if (!tpLoading && (!touchPoints || touchPoints.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <div className="rounded-full bg-muted p-4">
          <Link2 className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="text-lg font-medium">{t('page.noJourneyTitle')}</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            {t('page.noJourneyDesc')}
          </p>
        </div>
        <div className="flex gap-3 mt-2">
          <Link href={`/org/${org_id}/short-links`}>
            <Button variant="default" size="sm">
              {t('page.createShortLink')}
            </Button>
          </Link>
          <Link href="https://docs.li2.ai/sdk/setup" target="_blank" rel="noopener">
            <Button variant="outline" size="sm">
              {t('page.sdkSetupGuide')}
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const pageContent = (
    <div className="flex flex-col gap-6">
      {/* Controls: Link Selector + Date Range */}
      <div className="flex items-center gap-4 flex-wrap">
        <LinkSelector
          touchPoints={touchPoints ?? []}
          selectedId={selectedTpId}
          onSelect={handleSelectTp}
          isLoading={tpLoading}
        />
        <DateRangePicker
          placeholder={t('page.selectDateRange')}
          value={dateRange}
          onValueChange={setDateRange}
          disableFutureDate
        />
      </div>

      {/* Journey sections: only show when a link is selected */}
      {selectedTpId && (
        <div className="flex flex-col gap-2">
          <JourneyStep icon={MousePointerClick} label={t('steps.click')} step={1} />
          <TrafficSummary data={traffic} isLoading={trafficLoading} />

          <JourneyStep icon={FileText} label={t('steps.visit')} step={2} />
          <PageFlow data={pageFlow} isLoading={pageFlowLoading} tpId={selectedTpId} tpName={touchPoints?.find((tp) => tp.id === selectedTpId)?.name} />

          <JourneyStep icon={Pointer} label={t('steps.engage')} step={3} />
          <BehavioralHighlights data={behavioral} isLoading={behavioralLoading} />

          <JourneyStep icon={ShoppingCart} label={t('steps.convert')} step={4} />
          <ConversionFunnel data={conversions} isLoading={conversionsLoading} />
        </div>
      )}

      {/* Prompt to select a link */}
      {!selectedTpId && !tpLoading && touchPoints && touchPoints.length > 0 && (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">
            {t('page.selectLinkPrompt')}
          </p>
        </div>
      )}
    </div>
  )

  if (showIntro) return <LinkJourneyDemoV4 canAccess={isPremium} onContinue={handleContinue} />

  return pageContent
}
