'use client'

import { useState } from 'react'
import { ArrowDownToLine, Users, LayoutTemplate } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { ScrollHeatmapStats } from '@/ee/features/heatmap/components/scroll-heatmap-stats'
import { useGetScrollHeatmap } from '@/ee/features/heatmap/hooks/queries'
import { BrowserFramePreview } from '../browser-frame-preview'
import { SiteScrollHeatmapCanvas } from '../site-scroll-heatmap-canvas'

interface SiteScrollTabProps {
  orgId: string
  selectedPage: string | null
  selectedHostname: string | null
  selectedScheme?: string
  fromStr: string
  toStr: string
}

export function SiteScrollTab({
  orgId,
  selectedPage,
  selectedHostname,
  selectedScheme = 'https',
  fromStr,
  toStr,
}: SiteScrollTabProps) {
  const [opacity, setOpacity] = useState(0.5)

  const { data: scrollData, isLoading: scrollLoading } = useGetScrollHeatmap(
    orgId,
    selectedPage,
    fromStr,
    toStr,
    undefined,
    selectedHostname ?? undefined,
  )

  const reachedBottom = scrollData?.milestones.find((m) => m.scroll_depth_percent === 100)?.sessions_reached ?? 0

  const pageUrl =
    selectedHostname && selectedPage
      ? `${selectedScheme}://${selectedHostname}${selectedPage}`
      : selectedHostname
        ? `${selectedScheme}://${selectedHostname}`
        : null

  return (
    <div className="flex flex-col gap-4">
      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="bg-slate-50 flex items-center justify-center rounded-lg shrink-0 size-10">
              <ArrowDownToLine className="size-5 stroke-2 text-violet-500" />
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-sm text-slate-500">Sessions w/ Scroll</p>
              {scrollLoading ? (
                <Skeleton className="h-6 w-16 mt-1" />
              ) : (
                <p className="font-semibold text-xl leading-none text-slate-700">
                  {(scrollData?.total_sessions ?? 0).toLocaleString()}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="bg-slate-50 flex items-center justify-center rounded-lg shrink-0 size-10">
              <Users className="size-5 stroke-2 text-blue-500" />
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-sm text-slate-500">Reached Bottom</p>
              {scrollLoading ? (
                <Skeleton className="h-6 w-16 mt-1" />
              ) : (
                <p className="font-semibold text-xl leading-none text-slate-700">
                  {reachedBottom.toLocaleString()}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scroll depth stats table */}
      <Card className="rounded-2xl">
        <CardHeader className="px-6 pt-6 pb-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium text-slate-700">Scroll Depth Breakdown</CardTitle>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground">Low</span>
              <div
                className="h-2.5 w-24 rounded-full"
                style={{ background: 'linear-gradient(to right, #4f46e5, #437ef7, #16a34a, #f7b713, #dc2626)' }}
              />
              <span className="text-[11px] text-muted-foreground">High</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-6 pb-6 pt-0">
          <ScrollHeatmapStats
            milestones={scrollData?.milestones ?? []}
            totalSessions={scrollData?.total_sessions ?? 0}
            isLoading={scrollLoading}
          />
        </CardContent>
      </Card>

      {selectedPage !== null ? (
        <BrowserFramePreview
          orgId={orgId}
          hostname={selectedHostname}
          pagePath={selectedPage}
          pageUrl={pageUrl}
          hideDeviceTabs
          toolbarMode="scroll"
          fromStr={fromStr}
          toStr={toStr}
        >
          <SiteScrollHeatmapCanvas
            orgId={orgId}
            hostname={selectedHostname}
            pagePath={selectedPage}
            milestones={scrollData?.milestones ?? []}
            totalSessions={scrollData?.total_sessions ?? 0}
            opacity={opacity}
            onOpacityChange={setOpacity}
            isLoadingData={scrollLoading}
          />
        </BrowserFramePreview>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted/60">
              <LayoutTemplate className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-foreground">Select a specific page to view</p>
            <p className="mt-1.5 max-w-xs text-xs text-muted-foreground">
              Click a page in the sidebar to see the scroll heatmap and depth breakdown for that page.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
