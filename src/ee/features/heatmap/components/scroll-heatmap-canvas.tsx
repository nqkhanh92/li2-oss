'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, ExternalLink, Info } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { axiosApiInstance } from '@/shared/lib/axios'
import { renderScrollHeatmap } from '../lib/scroll-heatmap-renderer'
import type { ScrollDepthMilestone } from '../types'

interface ScrollHeatmapCanvasProps {
  pageUrl: string | null
  milestones: ScrollDepthMilestone[]
  totalSessions: number
  opacity: number
  isLoading: boolean
  previewWidth?: number
  onViewOnSite?: () => void
}

const CONTAINER_HEIGHT = 600
const IFRAME_LOAD_TIMEOUT = 8000
const DEFAULT_RENDER_WIDTH = 1440

type EmbeddableStatus = 'checking' | 'allowed' | 'blocked'

export function ScrollHeatmapCanvas({
  pageUrl,
  milestones,
  totalSessions,
  opacity,
  isLoading,
  previewWidth,
  onViewOnSite,
}: ScrollHeatmapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [iframeStatus, setIframeStatus] = useState<'loading' | 'loaded' | 'failed'>('loading')
  const [embeddable, setEmbeddable] = useState<EmbeddableStatus>('checking')
  const [containerWidth, setContainerWidth] = useState(0)

  // Content height for scroll heatmap - use generous default to show full page scroll behavior
  // (scroll depth is % based, so we need enough height to show the zones clearly)
  const contentHeight = useMemo(() => {
    // Use 3000px minimum to show a typical long-form page
    // This allows users to scroll through the different depth zones
    return Math.max(3000, CONTAINER_HEIGHT * 2)
  }, [])

  const renderWidth = previewWidth ?? DEFAULT_RENDER_WIDTH
  const scale = containerWidth > 0 ? Math.min(1, containerWidth / renderWidth) : 1
  const offsetX = Math.max(0, (containerWidth - renderWidth * scale) / 2)

  // Add li2_preview parameter to disable tracking when page is loaded in iframe
  const iframeSrc = useMemo(() => {
    if (!pageUrl) return ''
    try {
      const url = new URL(pageUrl)
      url.searchParams.set('li2_preview', '1')
      return url.toString()
    } catch {
      return pageUrl
    }
  }, [pageUrl])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) setContainerWidth(entry.contentRect.width)
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!pageUrl) {
      setEmbeddable('blocked')
      return
    }
    setEmbeddable('checking')
    setIframeStatus('loading')
    const controller = new AbortController()
    axiosApiInstance
      .get(`/heatmap/check-embeddable?url=${encodeURIComponent(pageUrl)}`, {
        signal: controller.signal,
      })
      .then((r) => setEmbeddable(r.data.embeddable ? 'allowed' : 'blocked'))
      .catch((e) => { if (e.name !== 'CanceledError') setEmbeddable('blocked') })
    return () => controller.abort()
  }, [pageUrl])

  useEffect(() => {
    if (embeddable !== 'allowed') return
    const timeout = setTimeout(() => {
      setIframeStatus((prev) => (prev === 'loading' ? 'failed' : prev))
    }, IFRAME_LOAD_TIMEOUT)
    return () => clearTimeout(timeout)
  }, [embeddable, pageUrl])

  const handleIframeLoad = useCallback(() => setIframeStatus('loaded'), [])
  const handleIframeError = useCallback(() => setIframeStatus('failed'), [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || milestones.length === 0) return
    requestAnimationFrame(() => {
      canvas.width = renderWidth
      renderScrollHeatmap(canvas, milestones, totalSessions, contentHeight)
    })
  }, [milestones, totalSessions, renderWidth, contentHeight])

  if (isLoading) {
    return (
      <div
        className="relative rounded-lg border bg-muted/30 animate-pulse"
        style={{ height: CONTAINER_HEIGHT }}
      />
    )
  }

  if (milestones.length === 0) return null

  const showIframe = pageUrl && embeddable === 'allowed' && iframeStatus !== 'failed'

  return (
    <div
      className="relative rounded-lg border bg-muted/20 overflow-hidden"
      ref={containerRef}
      style={{ height: CONTAINER_HEIGHT }}
    >
      <div className="h-full overflow-y-auto overflow-x-hidden">
        <div style={{ height: contentHeight * scale, position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: offsetX,
              width: renderWidth,
              height: contentHeight,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
          >
            {showIframe ? (
              <iframe
                ref={iframeRef}
                src={iframeSrc}
                className="absolute inset-0 border-0 pointer-events-none"
                style={{ width: renderWidth, height: contentHeight }}
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                sandbox="allow-scripts allow-same-origin"
                loading="lazy"
              />
            ) : (
              <div className="absolute inset-0 bg-white" />
            )}

            <canvas
              ref={canvasRef}
              className="absolute inset-0 pointer-events-none"
              style={{
                width: renderWidth,
                height: contentHeight,
                opacity,
              }}
            />

            {/* Milestone anchors with dashed lines */}
            {totalSessions > 0 && [25, 50, 75, 90, 100].map((depth) => {
              const milestone = milestones.find(m => m.scroll_depth_percent === depth)
              if (!milestone || milestone.sessions_reached === 0) return null

              const y = (depth / 100) * contentHeight
              const percentage = Math.round((milestone.sessions_reached / totalSessions) * 100)

              return (
                <div
                  key={depth}
                  className="absolute right-4 -translate-y-1/2 flex items-center gap-2 pointer-events-none"
                  style={{ top: y }}
                >
                  {/* Badge */}
                  <div className="group cursor-default pointer-events-auto">
                    <div className="bg-black/90 text-white px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap backdrop-blur-md border border-white/25 shadow-xl transition-all group-hover:bg-black/95 group-hover:scale-105 group-hover:border-white/40">
                      {percentage}% reached this point
                    </div>

                    {/* Popover */}
                    <div className="hidden group-hover:block absolute right-[calc(100%+12px)] top-1/2 -translate-y-1/2 bg-black/95 text-white px-4 py-3 rounded-lg text-xs border border-white/15 shadow-xl backdrop-blur-md z-10 whitespace-nowrap">
                      <div className="font-semibold text-sm mb-1.5">Scroll Depth: {depth}%</div>
                      <div className="text-white/80">Sessions: {milestone.sessions_reached.toLocaleString()}</div>
                      <div className="text-white/80">Reach: {percentage}% of total</div>
                    </div>
                  </div>

                  {/* Dashed line (from badge to right edge) */}
                  <div
                    className="w-10 h-0.5"
                    style={{
                      backgroundImage: 'linear-gradient(to left, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.4) 50%, transparent 50%, transparent 100%)',
                      backgroundSize: '8px 2px',
                      backgroundRepeat: 'repeat-x'
                    }}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {pageUrl && embeddable === 'blocked' && (
        <div className="absolute top-3 left-3 right-3 z-10 flex items-start gap-2.5 rounded-md bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 px-3 py-2.5 text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" />
          <div className="flex-1 min-w-0">
            <span className="font-medium">Page preview unavailable</span>
            <span className="ml-1">— this site restricts iframe embedding. Scroll depth bands still show correct proportions.</span>
          </div>
          {onViewOnSite && (
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 h-6 px-2 text-xs border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:hover:bg-amber-900 dark:text-amber-300"
              onClick={onViewOnSite}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              View on site
            </Button>
          )}
        </div>
      )}

      {!pageUrl && (
        <div className="absolute top-3 left-3 right-3 z-10 flex items-center gap-2 rounded-md bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
          <Info className="h-3.5 w-3.5 shrink-0" />
          <span>Page preview unavailable. Configure a hostname in Analytics Settings to enable preview.</span>
        </div>
      )}

      {showIframe && iframeStatus === 'loading' && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
          <div className="text-sm text-muted-foreground">Loading page preview...</div>
        </div>
      )}

      {pageUrl && embeddable !== 'blocked' && onViewOnSite && (
        <div className="absolute bottom-3 right-3 z-10">
          <Button
            variant="outline"
            size="sm"
            onClick={onViewOnSite}
            className="rounded-full bg-background/90 shadow-sm text-xs text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-3 w-3" />
            View on site for pixel-perfect accuracy
          </Button>
        </div>
      )}
    </div>
  )
}
