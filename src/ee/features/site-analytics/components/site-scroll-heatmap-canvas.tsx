'use client'

import { useEffect, useRef, useState } from 'react'
import { renderScrollHeatmap } from '@/ee/features/heatmap/lib/scroll-heatmap-renderer'
import type { ScrollDepthMilestone, DeviceType } from '@/ee/features/heatmap/types'
import { SnapshotPlayerBackground } from './snapshot-player-background'

const RENDER_WIDTH: Record<DeviceType, number> = {
  desktop: 1440,
  tablet: 768,
  mobile: 375,
}

interface SiteScrollHeatmapCanvasProps {
  orgId: string
  hostname: string | null
  pagePath: string | null
  milestones: ScrollDepthMilestone[]
  totalSessions: number
  opacity: number
  onOpacityChange?: (v: number) => void
  isLoadingData?: boolean
  deviceType?: DeviceType
  targetViewportWidth?: number
  onNoSnapshot?: () => void
}

export function SiteScrollHeatmapCanvas({
  orgId,
  hostname,
  pagePath,
  milestones,
  totalSessions,
  opacity,
  onOpacityChange,
  isLoadingData,
  deviceType,
  targetViewportWidth,
  onNoSnapshot,
}: SiteScrollHeatmapCanvasProps) {
  const outerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [pageHeight, setPageHeight] = useState(600)

  const renderWidth = targetViewportWidth ?? (deviceType ? RENDER_WIDTH[deviceType] : RENDER_WIDTH.desktop)
  const displayWidth = containerWidth || renderWidth
  const displayHeight = pageHeight * (displayWidth / renderWidth)

  useEffect(() => {
    const el = outerRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setContainerWidth(entry.contentRect.width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || milestones.length === 0) return
    canvas.width = renderWidth
    canvas.height = pageHeight
    renderScrollHeatmap(canvas, milestones, totalSessions, pageHeight)
  }, [milestones, totalSessions, renderWidth, pageHeight])

  return (
    <div ref={outerRef} className="relative w-full">
      {containerWidth > 0 && (
        <SnapshotPlayerBackground
          orgId={orgId}
          hostname={hostname}
          pagePath={pagePath}
          width={renderWidth}
          displayWidth={displayWidth}
          height={600}
          deviceType={deviceType}
          targetViewportWidth={targetViewportWidth}
          opacity={opacity}
          onOpacityChange={onOpacityChange}
          isLoadingData={isLoadingData}
          onHeightMeasured={setPageHeight}
          onNoSnapshot={onNoSnapshot}
        />
      )}

      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute top-0 left-0"
        style={{
          width: displayWidth,
          height: displayHeight,
          opacity,
        }}
      />

      {/* Depth milestone labels — positioned in display space */}
      {totalSessions > 0 &&
        [25, 50, 75, 90, 100].map((depth) => {
          const milestone = milestones.find((m) => m.scroll_depth_percent === depth)
          if (!milestone || milestone.sessions_reached === 0) return null
          const y = (depth / 100) * displayHeight
          const pct = Math.round((milestone.sessions_reached / totalSessions) * 100)
          return (
            <div
              key={depth}
              className="absolute right-4 -translate-y-1/2 flex items-center gap-2 pointer-events-none"
              style={{ top: y }}
            >
              <div className="group cursor-default pointer-events-auto">
                <div className="bg-black/90 text-white px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap backdrop-blur-md border border-white/25 shadow-xl">
                  {pct}% reached this point
                </div>
                <div className="hidden group-hover:block absolute right-[calc(100%+12px)] top-1/2 -translate-y-1/2 bg-black/95 text-white px-4 py-3 rounded-lg text-xs border border-white/15 shadow-xl z-10 whitespace-nowrap">
                  <div className="font-semibold text-sm mb-1.5">Scroll Depth: {depth}%</div>
                  <div className="text-white/80">Sessions: {milestone.sessions_reached.toLocaleString()}</div>
                  <div className="text-white/80">Reach: {pct}% of total</div>
                </div>
              </div>
              <div
                className="w-10 h-0.5"
                style={{
                  backgroundImage: 'linear-gradient(to left, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.4) 50%, transparent 50%, transparent 100%)',
                  backgroundSize: '8px 2px',
                  backgroundRepeat: 'repeat-x',
                }}
              />
            </div>
          )
        })}
    </div>
  )
}
