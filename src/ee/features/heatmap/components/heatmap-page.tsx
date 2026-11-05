'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { axiosApiInstance } from '@/shared/lib/axios'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { MousePointerClick, Users, Eye, X, Route, ArrowDownToLine } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import type { DateRange } from 'react-day-picker'
import type { DeviceType, HeatmapElement } from '../types'
import { useGetHeatmapClicks, useGetRageClicks, useGetScrollHeatmap, useGetTopPages } from '../hooks/queries'
import { useOrganizationStore } from '@/shared/stores/organization-store'
import { HeatmapControls } from './heatmap-controls'
import { PageTreeSidebar } from './page-tree-sidebar'
import { HeatmapCanvas } from './heatmap-canvas'
import { HeatmapElementList } from './heatmap-element-list'
import { RageClickList } from './rage-click-list'
import { CreateEventDialog } from './create-event-dialog'
import { ScrollHeatmapCanvas } from './scroll-heatmap-canvas'
import { ScrollHeatmapStats } from './scroll-heatmap-stats'

type ViewMode = 'heatmap' | 'clickmap'
type ActiveTab = 'click' | 'scroll'

function formatDateParam(date: Date): string {
  return date.toISOString().split('T')[0]
}

const DEVICE_PREVIEW_WIDTHS: Record<string, number> = {
  desktop: 1440,
  tablet: 768,
  mobile: 375,
}

const DEFAULT_RENDER_WIDTH = 1440

export function HeatmapPage() {
  const { t } = useTranslation('heatmap')
  const { org_id } = useParams<{ org_id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Deep link: read tp_id, page_path, and tp_name from URL params (from Link Journey)
  const tpIdFilter = searchParams.get('tp_id')
  const initialPagePath = searchParams.get('page_path')
  const tpName = searchParams.get('tp_name')

  const clearTpFilter = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('tp_id')
    params.delete('page_path')
    params.delete('tp_name')
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  // Date range — default 30 days when deep-linked from Link Journey, else 7 days
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - (tpIdFilter ? 30 : 7))
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

  // Filters
  const [selectedPage, setSelectedPage] = useState<string | null>(initialPagePath)
  const [selectedHostname, setSelectedHostname] = useState<string | null>(null)
  const [selectedScheme, setSelectedScheme] = useState<string>('https')
  const [deviceType, setDeviceType] = useState<DeviceType | undefined>(undefined)
  const [viewMode, setViewMode] = useState<ViewMode>('heatmap')
  const [clickOpacity, setClickOpacity] = useState(0.6)
  const [scrollOpacity, setScrollOpacity] = useState(0.35)
  const [selectedElement, setSelectedElement] = useState<HeatmapElement | null>(null)
  const [activeTab, setActiveTab] = useState<ActiveTab>('click')

  // Plan gate: check if event_tagging is allowed
  const orgPlan = useOrganizationStore((s) => s.orgPlan)
  const canCreateEvents = orgPlan?.advanced_features_allowed?.includes('event_tagging') ?? false

  // Render width — must match what the canvas displays at
  const renderWidth = deviceType ? DEVICE_PREVIEW_WIDTHS[deviceType] : DEFAULT_RENDER_WIDTH

  // Auto-select page when deep-linked and pages load
  const [autoSelected, setAutoSelected] = useState(false)

  // Queries
  const { data: pages, isLoading: pagesLoading } = useGetTopPages(org_id, fromStr, toStr, tpIdFilter)
  const { data: clicksData, isLoading: clicksLoading } = useGetHeatmapClicks(
    org_id,
    selectedPage,
    fromStr,
    toStr,
    deviceType,
    selectedHostname ?? undefined,
    renderWidth,
    tpIdFilter
  )

  // Resolve initial hostname from pages data for deep link
  const initialHostname = useMemo(() => {
    if (!initialPagePath || !pages?.length) return null
    const match = pages.find((p) => p.page_path === initialPagePath)
    return match?.hostname ?? null
  }, [pages, initialPagePath])

  // Auto-select the matching page once pages load (for deep link)
  useEffect(() => {
    if (autoSelected || !initialPagePath || !pages?.length) return
    const match = pages.find((p) => p.page_path === initialPagePath)
    if (match) {
      setSelectedPage(match.page_path)
      setSelectedHostname(match.hostname)
      setSelectedScheme(match.scheme)
      setAutoSelected(true)
    }
  }, [pages, initialPagePath, autoSelected])

  const { data: rageClicks, isLoading: rageLoading } = useGetRageClicks(
    org_id,
    selectedPage,
    fromStr,
    toStr,
    deviceType,
    selectedHostname ?? undefined,
    tpIdFilter
  )

  const { data: scrollData, isLoading: scrollLoading } = useGetScrollHeatmap(
    org_id,
    selectedPage,
    fromStr,
    toStr,
    deviceType,
    selectedHostname ?? undefined
  )

  const pageUrl = useMemo(
    () => (selectedHostname && selectedPage ? `${selectedScheme}://${selectedHostname}${selectedPage}` : null),
    [selectedScheme, selectedHostname, selectedPage]
  )

  // Toolbar session — lifted here so both controls and canvas can trigger it
  const [tokenLoading, setTokenLoading] = useState(false)
  const tokenLoadingRef = useRef(false)
  const openToolbarUrl = useCallback(async (mode: 'heatmap' | 'tagger' | 'scroll') => {
    if (!pageUrl || tokenLoadingRef.current) return
    tokenLoadingRef.current = true
    setTokenLoading(true)
    try {
      const { data } = await axiosApiInstance.post(`/organizations/${org_id}/toolbar-session`)
      const token = data.data.token
      const url = new URL(pageUrl)
      if (mode === 'tagger') {
        url.searchParams.set('li2_tagger', '1')
      } else if (mode === 'scroll') {
        url.searchParams.set('li2_scroll', '1')
      } else {
        url.searchParams.set('li2_heatmap', '1')
      }
      url.searchParams.set('li2_session', token)
      if (mode !== 'tagger') {
        if (fromStr) url.searchParams.set('li2_from', fromStr)
        if (toStr) url.searchParams.set('li2_to', toStr)
        if (deviceType) url.searchParams.set('li2_device', deviceType)
      }
      window.open(url.toString(), '_blank')
    } catch {
      // Token generation failed — toolbar will show "session expired"
    } finally {
      tokenLoadingRef.current = false
      setTokenLoading(false)
    }
  }, [pageUrl, org_id, fromStr, toStr, deviceType])

  return (
    <div className="flex h-[calc(100dvh-52px-60px)] overflow-hidden">
      {/* Left sidebar */}
      <PageTreeSidebar
        pages={pages ?? []}
        isLoading={pagesLoading}
        selectedPage={selectedPage}
        selectedHostname={selectedHostname}
        onPageChange={(page, hostname, scheme) => {
          setSelectedPage(page)
          setSelectedHostname(hostname)
          setSelectedScheme(scheme)
        }}
        initialPagePath={initialPagePath}
        initialHostname={initialHostname}
      />

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
      {/* Controls */}
      <HeatmapControls
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        deviceType={deviceType}
        onDeviceTypeChange={setDeviceType}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        pageUrl={pageUrl}
        onOpenToolbar={openToolbarUrl}
        toolbarLoading={tokenLoading}
        canCreateEvents={canCreateEvents}
      />

      {/* tp_id filter badge */}
      {tpIdFilter && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1.5 py-1">
            <Route className="h-3 w-3" />
            {tpName ? t('filter.linkFilter', { name: tpName }) : t('filter.filteredByLink')}
            <button onClick={clearTpFilter} className="ml-1 hover:text-foreground">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        </div>
      )}

      {/* Top-level heatmap type tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ActiveTab)}>
        <TabsList className="w-fit">
          <TabsTrigger value="click" className="gap-1.5">
            <MousePointerClick className="h-3.5 w-3.5" />
            {t('tabs.click')}
          </TabsTrigger>
          <TabsTrigger value="scroll" className="gap-1.5">
            <ArrowDownToLine className="h-3.5 w-3.5" />
            {t('tabs.scroll')}
          </TabsTrigger>
        </TabsList>

        {/* ── Click Heatmap Tab ── */}
        <TabsContent value="click" className="mt-4 flex flex-col gap-4">
          {/* Stats bar */}
          {selectedPage && (
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="flex items-center gap-3 py-4">
                  <div className="rounded-md bg-primary/10 p-2">
                    <MousePointerClick className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('stats.totalClicks')}</p>
                    {clicksLoading ? (
                      <Skeleton className="h-6 w-16 mt-1" />
                    ) : (
                      <p className="text-xl font-semibold tabular-nums">
                        {(clicksData?.total_clicks ?? 0).toLocaleString()}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-3 py-4">
                  <div className="rounded-md bg-primary/10 p-2">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('stats.uniqueVisitors')}</p>
                    {clicksLoading ? (
                      <Skeleton className="h-6 w-16 mt-1" />
                    ) : (
                      <p className="text-xl font-semibold tabular-nums">
                        {(clicksData?.unique_visitors ?? 0).toLocaleString()}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {!selectedPage ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Eye className="w-12 h-12 mb-3 opacity-40" />
                <p className="text-sm font-medium">{t('empty.selectPage')}</p>
                <p className="text-xs mt-1">
                  {t('empty.selectPageDesc')}
                </p>
              </CardContent>
            </Card>
          ) : clicksData && clicksData.total_clicks === 0 && !clicksLoading ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <MousePointerClick className="w-12 h-12 mb-3 opacity-40" />
                <p className="text-sm font-medium">{t('empty.noClickData')}</p>
                <p className="text-xs mt-1">
                  {t('empty.noClickDataDesc')}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <label className="text-xs text-muted-foreground whitespace-nowrap">
                  {t('controls.overlayOpacity')}
                </label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={clickOpacity}
                  onChange={(e) => setClickOpacity(Number(e.target.value))}
                  className="w-32 h-1.5 accent-primary cursor-pointer"
                />
                <span className="text-xs text-muted-foreground tabular-nums w-8">
                  {Math.round(clickOpacity * 100)}%
                </span>
              </div>

              <HeatmapCanvas
                pageUrl={pageUrl}
                grid={clicksData?.grid ?? []}
                opacity={clickOpacity}
                isLoading={clicksLoading}
                previewWidth={deviceType ? DEVICE_PREVIEW_WIDTHS[deviceType] : undefined}
                onViewOnSite={() => openToolbarUrl('heatmap')}
              />

              {viewMode === 'clickmap' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t('elements.title')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <HeatmapElementList
                      elements={clicksData?.elements ?? []}
                      onCreateEvent={canCreateEvents ? (el) => setSelectedElement(el) : undefined}
                    />
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t('rageClicks.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <RageClickList elements={rageClicks ?? []} isLoading={rageLoading} />
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ── Scroll Heatmap Tab ── */}
        <TabsContent value="scroll" className="mt-4 flex flex-col gap-4">
          {/* Stats bar */}
          {selectedPage && (
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="flex items-center gap-3 py-4">
                  <div className="rounded-md bg-primary/10 p-2">
                    <ArrowDownToLine className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('stats.totalSessions')}</p>
                    {scrollLoading ? (
                      <Skeleton className="h-6 w-16 mt-1" />
                    ) : (
                      <p className="text-xl font-semibold tabular-nums">
                        {(scrollData?.total_sessions ?? 0).toLocaleString()}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-3 py-4">
                  <div className="rounded-md bg-primary/10 p-2">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('stats.reachedBottom')}</p>
                    {scrollLoading ? (
                      <Skeleton className="h-6 w-16 mt-1" />
                    ) : (
                      <p className="text-xl font-semibold tabular-nums">
                        {(scrollData?.milestones.find((m) => m.scroll_depth_percent === 100)?.sessions_reached ?? 0).toLocaleString()}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {!selectedPage ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Eye className="w-12 h-12 mb-3 opacity-40" />
                <p className="text-sm font-medium">{t('empty.selectPageScroll')}</p>
                <p className="text-xs mt-1">
                  {t('empty.selectPageScrollDesc')}
                </p>
              </CardContent>
            </Card>
          ) : scrollData && scrollData.total_sessions === 0 && !scrollLoading ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <ArrowDownToLine className="w-12 h-12 mb-3 opacity-40" />
                <p className="text-sm font-medium">{t('empty.noScrollData')}</p>
                <p className="text-xs mt-1">
                  {t('empty.noScrollDataDesc')}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <label className="text-xs text-muted-foreground whitespace-nowrap">
                  {t('controls.overlayOpacity')}
                </label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={scrollOpacity}
                  onChange={(e) => setScrollOpacity(Number(e.target.value))}
                  className="w-32 h-1.5 accent-primary cursor-pointer"
                />
                <span className="text-xs text-muted-foreground tabular-nums w-8">
                  {Math.round(scrollOpacity * 100)}%
                </span>
              </div>

              <ScrollHeatmapCanvas
                pageUrl={pageUrl}
                milestones={scrollData?.milestones ?? []}
                totalSessions={scrollData?.total_sessions ?? 0}
                opacity={scrollOpacity}
                isLoading={scrollLoading}
                previewWidth={deviceType ? DEVICE_PREVIEW_WIDTHS[deviceType] : undefined}
                onViewOnSite={() => openToolbarUrl('scroll')}
              />

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t('scrollStats.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollHeatmapStats
                    milestones={scrollData?.milestones ?? []}
                    totalSessions={scrollData?.total_sessions ?? 0}
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Event Rule dialog */}
      <CreateEventDialog
        open={!!selectedElement}
        onOpenChange={(open) => { if (!open) setSelectedElement(null) }}
        element={selectedElement}
        pagePath={selectedPage ?? ''}
      />
      </div>
    </div>
  )
}
