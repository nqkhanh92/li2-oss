'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { renderHeatmap } from '@/ee/features/heatmap/lib/heatmap-renderer'
import type { HeatmapGridPoint, DeviceType } from '@/ee/features/heatmap/types'
import { SnapshotPlayerBackground, type SnapshotPlayerBackgroundHandle } from './snapshot-player-background'

const RENDER_WIDTH: Record<DeviceType, number> = {
  desktop: 1440,
  tablet: 768,
  mobile: 375,
}

export interface ClickHighlightInfo {
  source: 'clicks'
  label: string
  tag?: string
  count: number
  shareOfTotal: number
  rank: number
}

export interface RageHighlightInfo {
  source: 'rage'
  label: string
  tag?: string
  rageCount: number
  affectedSessions: number
}

export type HighlightInfo = ClickHighlightInfo | RageHighlightInfo

const OVERLAY_W = 220
const OVERLAY_H = 130
const GAP = 10

interface SiteClickHeatmapCanvasProps {
  orgId: string
  hostname: string | null
  pagePath: string | null
  grid: HeatmapGridPoint[]
  opacity: number
  onOpacityChange?: (v: number) => void
  deviceType?: DeviceType
  targetViewportWidth?: number
  isLoadingData?: boolean
  highlightSelector?: string | null
  highlightInfo?: HighlightInfo | null
  onHeightMeasured?: (renderSpaceHeight: number) => void
  onNoSnapshot?: () => void
  hoverSelectors?: string[]
  onCanvasClick?: (selector: string | null) => void
  scrollToHighlight?: boolean
}

export function SiteClickHeatmapCanvas({
  orgId,
  hostname,
  pagePath,
  grid,
  opacity,
  onOpacityChange,
  deviceType,
  targetViewportWidth,
  isLoadingData,
  highlightSelector,
  highlightInfo,
  onHeightMeasured,
  onNoSnapshot,
  hoverSelectors,
  onCanvasClick,
  scrollToHighlight = true,
}: SiteClickHeatmapCanvasProps) {
  const { t } = useTranslation('heatmap')
  const outerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)
  const [pageHeight, setPageHeight] = useState(600)
  const [highlightRect, setHighlightRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const snapshotRef = useRef<SnapshotPlayerBackgroundHandle>(null)
  const rafRef = useRef<number | null>(null)
  const [hoverResult, setHoverResult] = useState<{ selector: string; rect: { x: number; y: number; width: number; height: number } } | null>(null)

  const renderWidth = targetViewportWidth ?? (deviceType ? RENDER_WIDTH[deviceType] : RENDER_WIDTH.desktop)
  const displayWidth = containerWidth || renderWidth
  const displayHeight = pageHeight * (displayWidth / renderWidth)

  useEffect(() => {
    const el = outerRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        setContainerWidth(entry.contentRect.width)
        setContainerHeight(entry.contentRect.height)
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!highlightSelector) setHighlightRect(null)
  }, [highlightSelector])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = renderWidth
    canvas.height = pageHeight
    if (grid.length > 0) {
      renderHeatmap(canvas, grid, renderWidth, pageHeight)
    } else {
      canvas.getContext('2d')?.clearRect(0, 0, renderWidth, pageHeight)
    }
  }, [grid, renderWidth, pageHeight])

  // Re-tag tracked elements whenever the selector list changes (O(n) DOM writes, then O(depth) on each hover)
  useEffect(() => {
    snapshotRef.current?.tagSelectors(hoverSelectors ?? [])
  }, [hoverSelectors])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!snapshotRef.current) return
    if (rafRef.current !== null) return
    const outerRect = outerRef.current!.getBoundingClientRect()
    const x = e.clientX - outerRect.left
    const y = e.clientY - outerRect.top
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      const result = snapshotRef.current?.findSelectorAtPoint(x, y)
      setHoverResult(result ?? null)
    })
  }, [])

  const handleMouseLeave = useCallback(() => {
    setHoverResult(null)
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
  }, [])

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!snapshotRef.current) return
    const outerRect = outerRef.current!.getBoundingClientRect()
    const x = e.clientX - outerRect.left
    const y = e.clientY - outerRect.top
    const result = snapshotRef.current.findSelectorAtPoint(x, y)
    onCanvasClick?.(result?.selector ?? null)
  }, [onCanvasClick])

  useEffect(() => () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current) }, [])

  // Compute overlay position anchored to the highlighted element
  const overlayStyle = (() => {
    if (!highlightRect) return null
    const ch = containerHeight || displayHeight
    const elCenterX = highlightRect.x + highlightRect.width / 2
    const elBottom = highlightRect.y + highlightRect.height

    // Prefer below the element; fall back to above if no room
    const fitsBelow = elBottom + GAP + OVERLAY_H < ch
    const top = fitsBelow ? elBottom + GAP : highlightRect.y - OVERLAY_H - GAP

    // Center horizontally on element, clamp within container
    let left = elCenterX - OVERLAY_W / 2
    left = Math.max(GAP, Math.min(left, displayWidth - OVERLAY_W - GAP))

    return { top, left }
  })()

  return (
    <div ref={outerRef} className="relative w-full">
      {containerWidth > 0 && (
        <SnapshotPlayerBackground
          ref={snapshotRef}
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
          highlightSelector={highlightSelector}
          scrollToHighlight={scrollToHighlight}
          onHighlightRect={setHighlightRect}
          onHeightMeasured={(h) => {
            setPageHeight(h)
            onHeightMeasured?.(h)
            // Re-tag after iframe rebuilds (DOM is recreated)
            snapshotRef.current?.tagSelectors(hoverSelectors ?? [])
          }}
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

      {/* Mouse capture overlay — sits above canvas, enables hover + click on heatmap */}
      {containerWidth > 0 && (
        <div
          className="absolute top-0 left-0 z-10"
          style={{ width: displayWidth, height: displayHeight, cursor: hoverResult ? 'pointer' : 'default' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleCanvasClick}
        />
      )}

      {/* Hover highlight — shown for non-selected hovered elements */}
      {hoverResult && hoverResult.selector !== highlightSelector && (
        <div
          className="pointer-events-none absolute z-20"
          style={{
            left: hoverResult.rect.x,
            top: hoverResult.rect.y,
            width: hoverResult.rect.width,
            height: hoverResult.rect.height,
            outline: '2px dashed rgba(245,158,11,0.8)',
            outlineOffset: '2px',
            boxShadow: '0 0 0 4px rgba(251,191,36,0.12)',
          }}
        />
      )}

      {/* Click highlight — shown for the selected element, above hover */}
      {highlightRect && (
        <div
          className="pointer-events-none absolute"
          style={{
            left: highlightRect.x,
            top: highlightRect.y,
            width: highlightRect.width,
            height: highlightRect.height,
            zIndex: 21,
            outline: '3px solid #f59e0b',
            outlineOffset: '3px',
            boxShadow: '0 0 0 6px rgba(251,191,36,0.3), inset 0 0 0 9999px rgba(251,191,36,0.08)',
          }}
        />
      )}

      {/* Stats overlay anchored to the highlighted element */}
      {highlightInfo && overlayStyle && (
        <div
          className="pointer-events-none absolute z-30 min-w-[200px] max-w-[240px] rounded-xl border bg-white/92 backdrop-blur-md shadow-xl overflow-hidden"
          style={{ top: overlayStyle.top, left: overlayStyle.left }}
        >
          <div className={`px-3 py-2 border-b ${highlightInfo.source === 'rage' ? 'bg-red-50/80' : 'bg-amber-50/80'}`}>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {highlightInfo.source === 'clicks' ? t('elementOverlay.clickElement') : t('elementOverlay.rageClickElement')}
            </p>
            <p className="!text-s font-semibold text-foreground truncate mt-0.5">{highlightInfo.label}</p>
            {highlightInfo.tag && (
              <code className="text-[10px] text-muted-foreground">{`<${highlightInfo.tag}>`}</code>
            )}
          </div>
          <div className="px-3 py-2 space-y-1.5">
            {highlightInfo.source === 'clicks' ? (
              <>
                <StatRow label={t('elementOverlay.clicks')} value={highlightInfo.count.toLocaleString()} />
                <StatRow label={t('elementOverlay.shareOfTotal')} value={`${highlightInfo.shareOfTotal}%`} accent />
                <StatRow label={t('elementOverlay.rank')} value={`#${highlightInfo.rank}`} />
              </>
            ) : (
              <>
                <StatRow label={t('elementOverlay.rageClicks')} value={highlightInfo.rageCount.toLocaleString()} accent color="red" />
                <StatRow label={t('elementOverlay.affectedSessions')} value={highlightInfo.affectedSessions.toLocaleString()} />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function StatRow({ label, value, accent, color }: { label: string; value: string; accent?: boolean; color?: 'red' }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={
        accent
          ? color === 'red'
            ? 'text-[11px] font-bold text-red-500'
            : 'text-[11px] font-bold text-amber-600'
          : 'text-[11px] font-semibold text-foreground'
      }>
        {value}
      </span>
    </div>
  )
}
