'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, ExternalLink, Info } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { axiosApiInstance } from '@/shared/lib/axios'
import { renderHeatmap } from '../lib/heatmap-renderer'
import type { HeatmapGridPoint } from '../types'

interface HeatmapCanvasProps {
  pageUrl: string | null
  grid: HeatmapGridPoint[]
  opacity: number
  isLoading: boolean
  previewWidth?: number // Device-specific width (undefined = desktop default)
  onViewOnSite?: () => void
}

const CONTAINER_HEIGHT = 600
const IFRAME_LOAD_TIMEOUT = 8000
const DEFAULT_RENDER_WIDTH = 1440

type EmbeddableStatus = 'checking' | 'allowed' | 'blocked'

export function HeatmapCanvas({
  pageUrl,
  grid,
  opacity,
  isLoading,
  previewWidth,
  onViewOnSite,
}: HeatmapCanvasProps) {
  const { t } = useTranslation('heatmap')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [iframeStatus, setIframeStatus] = useState<'loading' | 'loaded' | 'failed'>('loading')
  const [embeddable, setEmbeddable] = useState<EmbeddableStatus>('checking')
  const [containerWidth, setContainerWidth] = useState(0)

  // Content height from grid data — covers all click points
  const contentHeight = useMemo(() => {
    if (grid.length === 0) return CONTAINER_HEIGHT
    const maxY = Math.max(...grid.map((p) => p.y))
    return Math.max(CONTAINER_HEIGHT, maxY + 40)
  }, [grid])

  // Fixed render width — iframe and canvas always render at this size
  const renderWidth = previewWidth ?? DEFAULT_RENDER_WIDTH

  // CSS zoom to fit container width (zoom affects layout unlike transform: scale)
  const zoom = containerWidth > 0 ? Math.min(1, containerWidth / renderWidth) : 1

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

  // Measure initial width synchronously before first paint
  useLayoutEffect(() => {
    const container = containerRef.current
    if (container && containerWidth === 0) {
      setContainerWidth(container.clientWidth)
    }
  })

  // Track container width via ResizeObserver for ongoing resize
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

  // Pre-flight: server-side X-Frame-Options / CSP check before loading iframe
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

  // Iframe load timeout (only relevant when embeddable === 'allowed')
  useEffect(() => {
    if (embeddable !== 'allowed') return

    const timeout = setTimeout(() => {
      setIframeStatus((prev) => (prev === 'loading' ? 'failed' : prev))
    }, IFRAME_LOAD_TIMEOUT)

    return () => clearTimeout(timeout)
  }, [embeddable, pageUrl])

  const handleIframeLoad = useCallback(() => {
    setIframeStatus('loaded')
  }, [])

  const handleIframeError = useCallback(() => {
    setIframeStatus('failed')
  }, [])

  // Render heatmap at fixed render width (no re-render on container resize)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || grid.length === 0 || renderWidth === 0) return

    requestAnimationFrame(() => {
      renderHeatmap(canvas, grid, renderWidth, contentHeight)
    })
  }, [grid, renderWidth, contentHeight])

  if (isLoading) {
    return (
      <div
        className="relative rounded-lg border bg-muted/30 animate-pulse"
        style={{ height: CONTAINER_HEIGHT }}
      />
    )
  }

  if (grid.length === 0) {
    return null
  }

  const showIframe = pageUrl && embeddable === 'allowed' && iframeStatus !== 'failed'

  return (
    <div
      className="relative rounded-lg border bg-muted/20 overflow-hidden"
      ref={containerRef}
      style={{ height: CONTAINER_HEIGHT }}
    >
      {/* Scroll wrapper */}
      <div className="h-full overflow-auto">
        {/* Zoomed content — zoom shrinks both visual AND layout (unlike transform: scale).
            This means overflow-x-hidden clips at the correct visual boundary. */}
        <div
          className="relative mx-auto"
          style={{
            width: renderWidth,
            height: contentHeight,
            zoom,
          }}
        >
          {/* Background: iframe (no clicks) or white fallback */}
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

          {/* Heatmap canvas overlay */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none"
            style={{
              width: renderWidth,
              height: contentHeight,
              opacity,
            }}
          />
        </div>
      </div>

      {/* Blocked banner — site blocks iframe embedding */}
      {pageUrl && embeddable === 'blocked' && (
        <div className="absolute top-3 left-3 right-3 z-10 flex items-start gap-2.5 rounded-md bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 px-3 py-2.5 text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" />
          <div className="flex-1 min-w-0">
            <span className="font-medium">{t('canvas.pagePreviewUnavailable')}</span>
            <span className="ml-1">{t('canvas.iframeBlocked')}</span>
          </div>
          {onViewOnSite && (
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 h-6 px-2 text-xs border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:hover:bg-amber-900 dark:text-amber-300"
              onClick={onViewOnSite}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              {t('canvas.viewOnSiteButton')}
            </Button>
          )}
        </div>
      )}

      {/* No URL banner */}
      {!pageUrl && (
        <div className="absolute top-3 left-3 right-3 z-10 flex items-center gap-2 rounded-md bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
          <Info className="h-3.5 w-3.5 shrink-0" />
          <span>{t('canvas.noHostname')}</span>
        </div>
      )}

      {/* iframe loading overlay */}
      {showIframe && iframeStatus === 'loading' && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
          <div className="text-sm text-muted-foreground">{t('canvas.loadingPreview')}</div>
        </div>
      )}

      {/* Always-visible "View on site" tip — shown when iframe is rendering or allowed */}
      {pageUrl && embeddable !== 'blocked' && onViewOnSite && (
        <div className="absolute bottom-3 right-3 z-10">
          <Button
            variant="outline"
            size="sm"
            onClick={onViewOnSite}
            className="rounded-full bg-background/90 shadow-sm text-xs text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-3 w-3" />
            {t('canvas.viewForAccuracy')}
          </Button>
        </div>
      )}
    </div>
  )
}
