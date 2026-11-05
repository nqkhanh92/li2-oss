'use client'

import { useEffect, useMemo, useState } from 'react'
import { MousePointerClick, Users, Zap, LayoutTemplate } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { SiteClickElementList } from '../site-click-element-list'
import { SiteRageClickList } from '../site-rage-click-list'
import { useGetHeatmapClicks, useGetRageClicks } from '@/ee/features/heatmap/hooks/queries'
import type { DeviceType } from '@/ee/features/heatmap/types'
import type { SitePageTypeBreakdown } from '../../types'
import { BrowserFramePreview, type DeviceMode, type DeviceCounts } from '../browser-frame-preview'
import { SiteClickHeatmapCanvas, type HighlightInfo } from '../site-click-heatmap-canvas'

const DEVICE_WIDTH: Record<string, number> = {
  desktop: 1440,
  tablet: 768,
  mobile: 375,
}

const sumRage = (arr: { rage_click_count: number }[] | undefined) =>
  arr?.reduce((s, e) => s + e.rage_click_count, 0) ?? 0

interface SiteClicksTabProps {
  orgId: string
  selectedPage: string | null
  selectedHostname: string | null
  selectedScheme?: string
  fromStr: string
  toStr: string
  byType: SitePageTypeBreakdown[]
}

export function SiteClicksTab({
  orgId,
  selectedPage,
  selectedHostname,
  selectedScheme = 'https',
  fromStr,
  toStr,
  byType,
}: SiteClicksTabProps) {
  const [deviceType, setDeviceType] = useState<DeviceType | undefined>(undefined)
  // undefined = waiting for snapshot height; null = no snapshot available; number = measured
  const [targetHeight, setTargetHeight] = useState<number | null | undefined>(undefined)
  const [highlight, setHighlight] = useState<{ source: 'clicks' | 'rage'; selector: string } | null>(null)
  const [scrollToHighlight, setScrollToHighlight] = useState(true)
  const [opacity, setOpacity] = useState(0.75)

  const targetWidth = deviceType ? DEVICE_WIDTH[deviceType] : 1440

  // Reset whenever the page/host changes so we wait for the new snapshot height
  useEffect(() => {
    setTargetHeight(undefined)
    setHighlight(null)
  }, [selectedPage, selectedHostname])

  // Block query until snapshot height is resolved (number) or confirmed unavailable (null)
  const heightReady = targetHeight !== undefined
  const { data: clicksData, isLoading: clicksLoading } = useGetHeatmapClicks(
    orgId,
    heightReady ? selectedPage : null,
    fromStr,
    toStr,
    deviceType,
    selectedHostname ?? undefined,
    targetWidth,
    undefined,
    targetHeight ?? undefined
  )

  // Parallel count queries for each device tab badge
  const hostname = selectedHostname ?? undefined
  const { data: countAll } = useGetHeatmapClicks(
    orgId,
    selectedPage,
    fromStr,
    toStr,
    undefined,
    hostname,
    1440
  )
  const { data: countDesktop } = useGetHeatmapClicks(
    orgId,
    selectedPage,
    fromStr,
    toStr,
    'desktop',
    hostname,
    1440
  )
  const { data: countTablet } = useGetHeatmapClicks(
    orgId,
    selectedPage,
    fromStr,
    toStr,
    'tablet',
    hostname,
    768
  )
  const { data: countMobile } = useGetHeatmapClicks(
    orgId,
    selectedPage,
    fromStr,
    toStr,
    'mobile',
    hostname,
    375
  )

  const { data: rageAll,     isLoading: rageAllLoading }     = useGetRageClicks(orgId, selectedPage, fromStr, toStr, undefined,  hostname)
  const { data: rageDesktop, isLoading: rageDesktopLoading } = useGetRageClicks(orgId, selectedPage, fromStr, toStr, 'desktop',  hostname)
  const { data: rageTablet,  isLoading: rageTabletLoading }  = useGetRageClicks(orgId, selectedPage, fromStr, toStr, 'tablet',   hostname)
  const { data: rageMobile,  isLoading: rageMobileLoading }  = useGetRageClicks(orgId, selectedPage, fromStr, toStr, 'mobile',   hostname)

  const rageClicks = deviceType === 'desktop' ? rageDesktop
    : deviceType === 'tablet' ? rageTablet
    : deviceType === 'mobile' ? rageMobile
    : rageAll
  const rageLoading = deviceType === 'desktop' ? rageDesktopLoading
    : deviceType === 'tablet' ? rageTabletLoading
    : deviceType === 'mobile' ? rageMobileLoading
    : rageAllLoading

  const deviceCounts: DeviceCounts = {
    all:     { clicks: countAll?.total_clicks,     rageClicks: sumRage(rageAll),     uniqueVisitors: countAll?.unique_visitors },
    desktop: { clicks: countDesktop?.total_clicks, rageClicks: sumRage(rageDesktop), uniqueVisitors: countDesktop?.unique_visitors },
    tablet:  { clicks: countTablet?.total_clicks,  rageClicks: sumRage(rageTablet),  uniqueVisitors: countTablet?.unique_visitors },
    mobile:  { clicks: countMobile?.total_clicks,  rageClicks: sumRage(rageMobile),  uniqueVisitors: countMobile?.unique_visitors },
  }

  const totalClicksAll = clicksData?.total_clicks ?? 0

  const highlightInfo: HighlightInfo | null = (() => {
    if (!highlight) return null
    if (highlight.source === 'clicks') {
      const el = clicksData?.elements.find(e => e.selector === highlight.selector)
      if (!el) return null
      const rank = (clicksData?.elements.indexOf(el) ?? 0) + 1
      const share = totalClicksAll > 0 ? Math.round((el.count / totalClicksAll) * 100) : 0
      return { source: 'clicks', label: el.text || el.selector, tag: el.tag ?? undefined, count: el.count, shareOfTotal: share, rank }
    }
    const el = rageClicks?.find(e => e.selector === highlight.selector)
    if (!el) return null
    return { source: 'rage', label: el.text || el.selector, tag: el.tag ?? undefined, rageCount: el.rage_click_count, affectedSessions: el.affected_sessions }
  })()

  const clickCount = byType.find((t) => t.type === 'click')?.count ?? 0
  const rageCount = byType.find((t) => t.type === 'rage_click')?.count ?? 0

  const pageUrl =
    selectedHostname && selectedPage
      ? `${selectedScheme}://${selectedHostname}${selectedPage}`
      : selectedHostname
        ? `${selectedScheme}://${selectedHostname}`
        : null

  const handleDeviceModeChange = (mode: DeviceMode) => {
    setDeviceType(mode === 'all' ? undefined : (mode as DeviceType))
    setTargetHeight(undefined)
    setHighlight(null)
  }

  const handleClicksElementClick = (selector: string) => {
    setScrollToHighlight(true)
    setHighlight((prev) => prev?.source === 'clicks' && prev.selector === selector ? null : { source: 'clicks', selector })
  }

  const handleRageElementClick = (selector: string) => {
    setScrollToHighlight(true)
    setHighlight((prev) => prev?.source === 'rage' && prev.selector === selector ? null : { source: 'rage', selector })
  }

  const handleNoSnapshot = () => setTargetHeight(null)

  const hoverSelectors = useMemo(() => [
    ...(clicksData?.elements ?? []).map(e => e.selector),
    ...(rageClicks ?? []).map(e => e.selector),
  ], [clicksData?.elements, rageClicks])

  const handleCanvasElementClick = (selector: string | null) => {
    setScrollToHighlight(false)
    if (!selector) { setHighlight(null); return }
    const inClicks = clicksData?.elements.some(e => e.selector === selector)
    if (inClicks) setHighlight((prev) => prev?.source === 'clicks' && prev.selector === selector ? null : { source: 'clicks', selector })
    else setHighlight((prev) => prev?.source === 'rage' && prev.selector === selector ? null : { source: 'rage', selector })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="bg-slate-50 flex items-center justify-center rounded-lg shrink-0 size-10">
              <MousePointerClick className="size-5 stroke-2 text-blue-500" />
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-sm text-slate-500">Clicks</p>
              {clicksLoading ? (
                <Skeleton className="h-6 w-16 mt-1" />
              ) : (
                <p className="font-semibold text-xl leading-none text-slate-700">
                  {clickCount.toLocaleString()}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="bg-slate-50 flex items-center justify-center rounded-lg shrink-0 size-10">
              <Zap className="size-5 stroke-2 text-red-500" />
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-sm text-slate-500">Rage Clicks</p>
              {clicksLoading ? (
                <Skeleton className="h-6 w-16 mt-1" />
              ) : (
                <p className="font-semibold text-xl leading-none text-slate-700">
                  {rageCount.toLocaleString()}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="bg-slate-50 flex items-center justify-center rounded-lg shrink-0 size-10">
              <Users className="size-5 stroke-2 text-violet-500" />
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-sm text-slate-500">Unique Visitors</p>
              {clicksLoading ? (
                <Skeleton className="h-6 w-16 mt-1" />
              ) : (
                <p className="font-semibold text-xl leading-none text-slate-700">
                  {(countAll?.unique_visitors ?? 0).toLocaleString()}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedPage !== null ? (
        <>
          {/* Click Map + Rage Clicks side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="rounded-2xl">
              <CardHeader className="px-5 pt-5 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50">
                      <MousePointerClick className="h-3.5 w-3.5 text-blue-500" />
                    </div>
                    <CardTitle className="!text-s font-semibold text-foreground">Click Map</CardTitle>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground tabular-nums">
                    {(clicksData?.elements.length ?? 0).toLocaleString()} elements
                  </span>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5 pt-0">
                <SiteClickElementList
                  elements={clicksData?.elements ?? []}
                  isLoading={!heightReady || clicksLoading}
                  selectedSelector={highlight?.source === 'clicks' ? highlight.selector : null}
                  onElementClick={handleClicksElementClick}
                />
              </CardContent>
            </Card>
            <Card className="rounded-2xl">
              <CardHeader className="px-5 pt-5 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50">
                      <Zap className="h-3.5 w-3.5 text-red-500" />
                    </div>
                    <CardTitle className="!text-s font-semibold text-foreground">Rage Clicks</CardTitle>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground tabular-nums">
                    {(rageClicks?.length ?? 0).toLocaleString()} elements
                  </span>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5 pt-0">
                <SiteRageClickList
                  elements={rageClicks ?? []}
                  isLoading={rageLoading}
                  selectedSelector={highlight?.source === 'rage' ? highlight.selector : null}
                  onElementClick={handleRageElementClick}
                />
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted/60">
              <LayoutTemplate className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-foreground">Select a specific page to view</p>
            <p className="mt-1.5 max-w-xs text-xs text-muted-foreground">
              Click a page in the sidebar to see the Click Map, Rage Clicks, and heatmap overlay for that page.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Click heatmap inside browser chrome */}
      {selectedPage !== null && (
        <BrowserFramePreview
          orgId={orgId}
          hostname={selectedHostname}
          pagePath={selectedPage}
          pageUrl={pageUrl}
          deviceCounts={deviceCounts}
          hideWidthPresets
          toolbarMode="heatmap"
          fromStr={fromStr}
          toStr={toStr}
          onDeviceModeChange={handleDeviceModeChange}
        >
          <SiteClickHeatmapCanvas
            key={`${selectedPage}-${deviceType ?? 'all'}`}
            orgId={orgId}
            hostname={selectedHostname}
            pagePath={selectedPage}
            grid={clicksData?.grid ?? []}
            opacity={opacity}
            onOpacityChange={setOpacity}
            deviceType={deviceType}
            targetViewportWidth={deviceType === 'desktop' ? 1440 : undefined}
            isLoadingData={heightReady && clicksLoading}
            highlightSelector={highlight?.selector ?? null}
            highlightInfo={highlightInfo}
            onHeightMeasured={(h) => setTargetHeight(h)}
            onNoSnapshot={handleNoSnapshot}
            hoverSelectors={hoverSelectors}
            onCanvasClick={handleCanvasElementClick}
            scrollToHighlight={scrollToHighlight}
          />
        </BrowserFramePreview>
      )}

    </div>
  )
}
