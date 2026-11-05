'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Monitor, Smartphone, Tablet, MousePointerClick, Zap, Users, ExternalLink } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Button } from '@/shared/components/ui/button'
import { axiosApiInstance } from '@/shared/lib/axios'
import { SnapshotPlayerBackground } from './snapshot-player-background'

export type DeviceMode = 'all' | 'desktop' | 'tablet' | 'mobile'

export const DESKTOP_WIDTH_PRESETS = [
  { label: '1920', value: 1920, min: 1800, max: 99999 },
  { label: '1440', value: 1440, min: 1360, max: 1799 },
  { label: '1280', value: 1280, min: 1200, max: 1359 },
  { label: '1024', value: 1024, min: 900, max: 1199 },
] as const

export type DesktopWidthPreset = (typeof DESKTOP_WIDTH_PRESETS)[number]['value']

const DEVICE_FRAME_WIDTH: Record<DeviceMode, number> = {
  all: 1440,
  desktop: 1440,
  tablet: 768,
  mobile: 375,
}

const CONTENT_HEIGHT = 600

export interface DeviceTabMetrics {
  clicks?: number
  rageClicks?: number
  uniqueVisitors?: number
}

export interface DeviceCounts {
  all?: DeviceTabMetrics
  desktop?: DeviceTabMetrics
  tablet?: DeviceTabMetrics
  mobile?: DeviceTabMetrics
}

interface BrowserFramePreviewProps {
  orgId: string
  hostname: string | null
  pagePath: string | null
  pageUrl?: string | null
  deviceCounts?: DeviceCounts
  hideDeviceTabs?: boolean
  hideWidthPresets?: boolean
  toolbarMode?: 'heatmap' | 'scroll'
  fromStr?: string
  toStr?: string
  onDeviceModeChange?: (mode: DeviceMode) => void
  onDesktopWidthChange?: (width: DesktopWidthPreset) => void
  children?: React.ReactNode
}

function DeviceMetricsRow({ metrics }: { metrics: DeviceTabMetrics }) {
  return (
    <span className="flex items-center gap-2 text-[10px] tabular-nums text-muted-foreground font-normal">
      <span className="flex items-center gap-0.5">
        <MousePointerClick className="h-2.5 w-2.5" />
        {(metrics.clicks ?? 0).toLocaleString()}
      </span>
      <span className="flex items-center gap-0.5">
        <Zap className="h-2.5 w-2.5" />
        {(metrics.rageClicks ?? 0).toLocaleString()}
      </span>
      <span className="flex items-center gap-0.5">
        <Users className="h-2.5 w-2.5" />
        {(metrics.uniqueVisitors ?? 0).toLocaleString()}
      </span>
    </span>
  )
}

export function BrowserFramePreview({
  orgId,
  hostname,
  pagePath,
  pageUrl,
  deviceCounts,
  hideDeviceTabs,
  hideWidthPresets,
  toolbarMode,
  fromStr,
  toStr,
  onDeviceModeChange,
  onDesktopWidthChange,
  children,
}: BrowserFramePreviewProps) {
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('all')
  const [desktopWidth, setDesktopWidth] = useState<DesktopWidthPreset>(1920)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [toolbarLoading, setToolbarLoading] = useState(false)
  const toolbarLoadingRef = useRef(false)

  const openOnSite = async () => {
    if (!displayUrl || toolbarLoadingRef.current) return
    toolbarLoadingRef.current = true
    setToolbarLoading(true)
    try {
      const { data } = await axiosApiInstance.post(`/organizations/${orgId}/toolbar-session`)
      const token = data.data.token
      const url = new URL(displayUrl)
      if (toolbarMode === 'scroll') {
        url.searchParams.set('li2_scroll', '1')
      } else {
        url.searchParams.set('li2_heatmap', '1')
      }
      url.searchParams.set('li2_session', token)
      if (fromStr) url.searchParams.set('li2_from', fromStr)
      if (toStr) url.searchParams.set('li2_to', toStr)
      if (deviceMode !== 'all') url.searchParams.set('li2_device', deviceMode)
      window.open(url.toString(), '_blank')
    } catch {
      // token generation failed
    } finally {
      toolbarLoadingRef.current = false
      setToolbarLoading(false)
    }
  }

  useLayoutEffect(() => {
    const el = containerRef.current
    if (el && containerWidth === 0) setContainerWidth(el.clientWidth)
  })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setContainerWidth(entry.contentRect.width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const handleDeviceChange = (v: string) => {
    const mode = v as DeviceMode
    setDeviceMode(mode)
    onDeviceModeChange?.(mode)
    if (mode === 'desktop') {
      onDesktopWidthChange?.(desktopWidth)
    }
  }

  const handleDesktopWidthChange = (w: DesktopWidthPreset) => {
    setDesktopWidth(w)
    onDesktopWidthChange?.(w)
  }

  const targetFrameWidth = DEVICE_FRAME_WIDTH[deviceMode]
  const frameWidth = Math.min(targetFrameWidth, containerWidth || targetFrameWidth)

  const displayUrl =
    pageUrl ??
    (hostname && pagePath
      ? `https://${hostname}${pagePath}`
      : hostname
        ? `https://${hostname}`
        : '')

  const snapshotWidth = containerWidth > 0 ? frameWidth : 0

  return (
    <div className="flex flex-col gap-3">
      {!hideDeviceTabs && (
        <div className="inline-flex flex-col self-center">
          <Tabs value={deviceMode} onValueChange={handleDeviceChange}>
            <TabsList className="h-auto gap-1 p-1">
              <TabsTrigger value="all" className="flex-col h-auto py-2 px-3 gap-0.5 min-w-[72px]">
                <span className="text-xs font-semibold">All</span>
                {deviceCounts?.all && <DeviceMetricsRow metrics={deviceCounts.all} />}
              </TabsTrigger>
              <TabsTrigger
                value="desktop"
                className="flex-col h-auto py-2 px-3 gap-0.5 min-w-[72px]"
              >
                <span className="flex items-center gap-1.5 text-xs font-semibold">
                  <Monitor className="h-3.5 w-3.5" />
                  Desktop
                </span>
                {deviceCounts?.desktop && <DeviceMetricsRow metrics={deviceCounts.desktop} />}
              </TabsTrigger>
              <TabsTrigger
                value="tablet"
                className="flex-col h-auto py-2 px-3 gap-0.5 min-w-[72px]"
              >
                <span className="flex items-center gap-1.5 text-xs font-semibold">
                  <Tablet className="h-3.5 w-3.5" />
                  Tablet
                </span>
                {deviceCounts?.tablet && <DeviceMetricsRow metrics={deviceCounts.tablet} />}
              </TabsTrigger>
              <TabsTrigger
                value="mobile"
                className="flex-col h-auto py-2 px-3 gap-0.5 min-w-[72px]"
              >
                <span className="flex items-center gap-1.5 text-xs font-semibold">
                  <Smartphone className="h-3.5 w-3.5" />
                  Mobile
                </span>
                {deviceCounts?.mobile && <DeviceMetricsRow metrics={deviceCounts.mobile} />}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {deviceMode === 'desktop' && !hideWidthPresets && (
            <div className="w-fit self-center rounded-md flex items-center gap-1 bg-card px-[4px] py-[3px]">
              {DESKTOP_WIDTH_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handleDesktopWidthChange(preset.value)}
                  className={cn(
                    'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                    desktopWidth === preset.value
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Width measurement wrapper */}
      <div ref={containerRef} className="w-full">
        <div
          className="rounded-xl border shadow-md"
          style={{
            width: frameWidth || '100%',
            marginLeft: deviceMode !== 'desktop' && deviceMode !== 'all' ? 'auto' : undefined,
            marginRight: deviceMode !== 'desktop' && deviceMode !== 'all' ? 'auto' : undefined,
          }}
        >
          {/* Browser chrome */}
          <div className="flex items-center gap-2 border-b bg-[#e8e8e8] px-3 py-2 dark:bg-[#2d2d2d] rounded-tl-xl rounded-tr-xl overflow-hidden">
            <div className="flex shrink-0 gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#FFBD2E]" />
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#28C840]" />
            </div>
            <div className="min-w-0 flex-1 truncate rounded border bg-white px-2.5 py-0.5 text-[11px] text-muted-foreground dark:bg-[#1e1e1e]">
              {displayUrl || 'about:blank'}
            </div>
            {toolbarMode && displayUrl && (
              <Button
                variant="outline"
                size="sm"
                disabled={toolbarLoading}
                onClick={openOnSite}
                className="shrink-0 h-6 px-2 text-[11px] gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                View on site
              </Button>
            )}
          </div>

          {/* Content — heatmap canvas (children) or plain snapshot fallback */}
          <div className="relative bg-white rounded-b-xl" style={{ minHeight: CONTENT_HEIGHT }}>
            {children ??
              (snapshotWidth > 0 && (
                <SnapshotPlayerBackground
                  orgId={orgId}
                  hostname={hostname}
                  pagePath={pagePath}
                  width={snapshotWidth}
                  height={CONTENT_HEIGHT}
                  deviceType={deviceMode === 'all' ? undefined : deviceMode}
                  targetViewportWidth={deviceMode === 'desktop' ? desktopWidth : undefined}
                />
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
