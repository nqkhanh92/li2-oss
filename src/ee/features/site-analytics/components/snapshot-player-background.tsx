'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Camera, ChevronLeft, ChevronRight, ImageOff } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { useGetPageSnapshot, type PageSnapshot } from '../hooks/queries'

async function fetchAndDecompress(url: string): Promise<unknown[]> {
  const res = await fetch(url)
  if (!res.ok || !res.body) return []
  const ds = new DecompressionStream('gzip')
  const text = await new Response(res.body.pipeThrough(ds)).text()
  return JSON.parse(text) as unknown[]
}

function formatSnapshotLabel(startedAt: string) {
  return new Date(startedAt).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export interface SnapshotPlayerBackgroundHandle {
  findSelectorAtPoint(
    displayX: number,
    displayY: number,
  ): { selector: string; rect: { x: number; y: number; width: number; height: number } } | null
  tagSelectors(selectors: string[]): void
}

interface SnapshotPlayerBackgroundProps {
  orgId: string
  hostname: string | null
  pagePath: string | null
  /**
   * Coordinate/render width — the space heatmap data lives in (e.g. 1920).
   * onHeightMeasured fires heights in this same coordinate space.
   */
  width: number
  /**
   * Visual/CSS width the snapshot should occupy on screen.
   * Defaults to `width` when omitted (no additional display scaling).
   */
  displayWidth?: number
  height: number
  deviceType?: string
  targetViewportWidth?: number
  /** Current heatmap overlay opacity (0–1), shown in the floating panel slider */
  opacity?: number
  onOpacityChange?: (v: number) => void
  /** When true, replaces "Loading snapshot…" with "Loading heatmap data…" */
  isLoadingData?: boolean
  /** CSS selector to highlight in the snapshot */
  highlightSelector?: string | null
  /** When true (default), scrolls the page to the highlighted element */
  scrollToHighlight?: boolean
  /** Called with the element's scaled display-space rect when highlight changes (null when cleared) */
  onHighlightRect?: (rect: { x: number; y: number; width: number; height: number } | null) => void
  onHeightMeasured?: (renderSpaceHeight: number) => void
  onNoSnapshot?: () => void
}

export const SnapshotPlayerBackground = forwardRef<SnapshotPlayerBackgroundHandle, SnapshotPlayerBackgroundProps>(function SnapshotPlayerBackground({
  orgId,
  hostname,
  pagePath,
  width,
  displayWidth,
  height,
  deviceType,
  targetViewportWidth,
  opacity,
  onOpacityChange,
  isLoadingData,
  highlightSelector,
  scrollToHighlight = true,
  onHighlightRect,
  onHeightMeasured,
  onNoSnapshot,
}: SnapshotPlayerBackgroundProps, ref) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const scrollMarkerRef = useRef<HTMLDivElement>(null)
  const [selectedSnapshot, setSelectedSnapshot] = useState<PageSnapshot | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [events, setEvents] = useState<any[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [recWidth, setRecWidth] = useState<number | null>(null)
  // Height in render/coordinate space (same space as `width`)
  const [renderSpaceH, setRenderSpaceH] = useState(height)
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Visual CSS width used for display. When equal to `width`, no extra scaling.
  const dw = displayWidth ?? width
  // Scale from recording width to display width
  const iframeDisplayScale = recWidth ? dw / recWidth : 1
  // Height in CSS display pixels
  const displayH = renderSpaceH * (dw / width)

  const scaleRef = useRef(1)
  useEffect(() => { scaleRef.current = iframeDisplayScale }, [iframeDisplayScale])

  useImperativeHandle(ref, () => ({
    tagSelectors(selectors) {
      const iframeDoc = iframeRef.current?.contentDocument
      if (!iframeDoc) return
      iframeDoc.querySelectorAll('[data-li2-track]').forEach(el => el.removeAttribute('data-li2-track'))
      for (const selector of selectors) {
        try { iframeDoc.querySelector(selector)?.setAttribute('data-li2-track', selector) } catch { /* invalid */ }
      }
    },
    findSelectorAtPoint(displayX, displayY) {
      const iframe = iframeRef.current
      if (!iframe) return null
      const iframeDoc = iframe.contentDocument
      if (!iframeDoc) return null
      const scale = scaleRef.current || 1
      const el = iframeDoc.elementFromPoint(displayX / scale, displayY / scale)
      if (!el) return null
      const tagged = (el as HTMLElement).closest('[data-li2-track]') as HTMLElement | null
      if (!tagged) return null
      const selector = tagged.getAttribute('data-li2-track')!
      const r = tagged.getBoundingClientRect()
      return { selector, rect: { x: r.left * scale, y: r.top * scale, width: r.width * scale, height: r.height * scale } }
    },
  }))

  // All tab (deviceType undefined) → prefer desktop snapshots over mobile/tablet
  const queryDeviceType = deviceType ?? 'desktop'
  const { data, isLoading } = useGetPageSnapshot(
    orgId,
    hostname,
    pagePath,
    queryDeviceType,
    targetViewportWidth,
  )
  const allSnapshots = [...new Map((data?.snapshots ?? []).map((s) => [s.session_id, s])).values()]
  const snapshots = deviceType
    ? allSnapshots.filter((s) => !s.device_type || s.device_type === deviceType)
    : allSnapshots

  const ALL_TAB_PREFERRED = [1440, 1920]
  const sortedSnapshots = targetViewportWidth
    ? [...snapshots].sort((a, b) => {
        const da = Math.abs((a.viewport_width ?? 0) - targetViewportWidth)
        const db = Math.abs((b.viewport_width ?? 0) - targetViewportWidth)
        return da - db
      })
    : [...snapshots].sort((a, b) => {
        const ra = ALL_TAB_PREFERRED.indexOf(a.viewport_width ?? 0)
        const rb = ALL_TAB_PREFERRED.indexOf(b.viewport_width ?? 0)
        if (ra !== -1 && rb !== -1) return ra - rb
        if (ra !== -1) return -1
        if (rb !== -1) return 1
        return 0
      })

  useEffect(() => {
    setSelectedSnapshot(null)
  }, [deviceType, targetViewportWidth, pagePath, hostname])

  useEffect(() => {
    if (sortedSnapshots.length > 0 && !selectedSnapshot) {
      setSelectedSnapshot(sortedSnapshots[0])
    }
  }, [sortedSnapshots, selectedSnapshot])

  useEffect(() => {
    if (!selectedSnapshot?.chunk_url) return
    let cancelled = false
    setLoadingEvents(true)
    setEvents([])
    setRecWidth(null)
    setRenderSpaceH(height)
    fetchAndDecompress(selectedSnapshot.chunk_url).then((evts) => {
      if (!cancelled) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const meta = evts.find((e: any) => e.type === 4) as any
        if (meta?.data?.width) setRecWidth(meta.data.width)
        setEvents(evts)
        setLoadingEvents(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [selectedSnapshot, height])

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe || !events.length || !recWidth) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const snapshotEvent = events.find((e: any) => e.type === 2) as any
    if (!snapshotEvent?.data?.node) return

    // Scale from recording width into the render/coordinate width space
    const renderScale = width / recWidth

    import('rrweb-snapshot').then(({ rebuild, createCache }) => {
      const iframeDoc = iframe.contentDocument
      if (!iframeDoc) return

      iframeDoc.open()
      iframeDoc.close()
      rebuild(snapshotEvent.data.node, { doc: iframeDoc, cache: createCache() })

      // rrweb replaces inline scripts with "SCRIPT_PLACEHOLDER". Remove script/noscript
      // so the placeholder text and noscript fallback content don't render visibly.
      iframeDoc.querySelectorAll('script, noscript').forEach((el) => el.remove())
      const hideStyle = iframeDoc.createElement('style')
      hideStyle.textContent = 'script,noscript{display:none!important}'
      ;(iframeDoc.head ?? iframeDoc.documentElement).appendChild(hideStyle)

      iframeDoc.documentElement.style.overflow = 'visible'
      iframeDoc.documentElement.style.height = 'auto'
      if (iframeDoc.body) {
        iframeDoc.body.style.overflow = 'visible'
        iframeDoc.body.style.height = 'auto'
      }

      setTimeout(() => {
        iframeDoc.defaultView?.scrollTo(0, 0)
        const measuredH = iframeDoc.documentElement.scrollHeight ?? 0
        if (measuredH > 0) {
          iframe.style.height = `${measuredH}px`
          // Height in render/coordinate space (same space as `width`)
          const rsh = Math.max(Math.ceil(measuredH * renderScale), height)
          setRenderSpaceH(rsh)
          onHeightMeasured?.(rsh)
        }
      }, 200)
    })
  }, [events, recWidth, width, height])

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    const iframeDoc = iframe.contentDocument
    if (!iframeDoc) return

    iframeDoc.querySelectorAll('[data-li2-hl]').forEach((node) => {
      const h = node as HTMLElement
      h.style.outline = ''
      h.style.outlineOffset = ''
      h.style.boxShadow = ''
      h.style.zIndex = ''
      h.removeAttribute('data-li2-hl')
    })

    if (!highlightSelector) {
      onHighlightRect?.(null)
      return
    }

    const el = iframeDoc.querySelector(highlightSelector) as HTMLElement | null
    if (!el) return

    el.style.outline = '3px solid #f59e0b'
    el.style.outlineOffset = '3px'
    el.style.boxShadow = '0 0 0 6px rgba(251,191,36,0.35), inset 0 0 0 9999px rgba(251,191,36,0.08)'
    el.style.position = 'relative'
    el.style.zIndex = '9999'
    el.setAttribute('data-li2-hl', '1')

    const rect = el.getBoundingClientRect()
    if (scrollToHighlight) {
      const marker = scrollMarkerRef.current
      if (marker) {
        marker.style.top = `${rect.top * iframeDisplayScale}px`
        requestAnimationFrame(() => {
          marker.scrollIntoView({ behavior: 'smooth', block: 'center' })
        })
      }
    }
    onHighlightRect?.({
      x: rect.left * iframeDisplayScale,
      y: rect.top * iframeDisplayScale,
      width: rect.width * iframeDisplayScale,
      height: rect.height * iframeDisplayScale,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightSelector])

  const iframeW = recWidth ?? dw
  // iframe height in recording space; the CSS transform will scale it to displayH visually
  const iframeH = Math.ceil(renderSpaceH / (width / (recWidth ?? width)))

  const showPicker = sortedSnapshots.length > 1
  const showOpacity = onOpacityChange !== undefined && opacity !== undefined
  const showPanel = showOpacity || showPicker
  const hasNoSnapshot = !hostname || !pagePath || (!isLoading && sortedSnapshots.length === 0)

  useEffect(() => {
    if (hasNoSnapshot) onNoSnapshot?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasNoSnapshot])

  if (hasNoSnapshot) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 bg-muted/20"
        style={{ width: dw, height }}
      >
        <ImageOff className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-xs text-muted-foreground">
          No session recording available for page preview
        </p>
      </div>
    )
  }

  return (
    /*
      Outer div is in CSS/display space (dw × displayH), no overflow clipping here
      so the sticky floating panel can work correctly.
    */
    <div style={{ position: 'relative', width: dw, height: displayH || height }}>
      {/* Floating collapsible panel — outside overflow:hidden so sticky engages */}
      {showPanel && (
        <div style={{ position: 'sticky', top: 12, height: 0, overflow: 'visible', zIndex: 20 }}>
          <div style={{ position: 'absolute', right: 0, top: 0 }} className="pt-3">
            {isCollapsed ? (
              <button
                onClick={() => setIsCollapsed(false)}
                className="flex items-center justify-center w-7 h-10 rounded-l-lg bg-background/70 border border-r-0 backdrop-blur-sm shadow-sm hover:bg-background transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            ) : (
              <div className="w-44 rounded-l-xl border border-r-0 bg-background/70 backdrop-blur-sm shadow-md overflow-hidden">
                {/* Opacity section (or snapshot-only header) */}
                {showOpacity ? (
                  <div className="px-3 py-2.5">
                    <div className="flex items-center gap-1 mb-1.5">
                      <span className="text-[10px] text-muted-foreground flex-1 font-medium">
                        Opacity
                      </span>
                      <span className="text-[10px] tabular-nums text-muted-foreground w-7 text-right">
                        {Math.round(opacity! * 100)}%
                      </span>
                      <button
                        onClick={() => setIsCollapsed(true)}
                        className="ml-0.5 flex items-center justify-center rounded p-0.5 hover:bg-muted/60 transition-colors"
                      >
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={opacity}
                      onChange={(e) => onOpacityChange!(Number(e.target.value))}
                      className="w-full h-1.5 accent-primary cursor-pointer"
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-[10px] text-muted-foreground font-medium">Snapshots</span>
                    <button
                      onClick={() => setIsCollapsed(true)}
                      className="flex items-center justify-center rounded p-0.5 hover:bg-muted/60 transition-colors"
                    >
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </div>
                )}

                {/* Snapshot picker list */}
                {showPicker && (
                  <>
                    <div className="border-t" />
                    <div className="px-3 pt-1.5 pb-0.5">
                      <span className="text-[9px] uppercase tracking-wide text-muted-foreground font-semibold">
                        Snapshots
                      </span>
                    </div>
                    <div className="max-h-40 overflow-y-auto pb-1.5">
                      {sortedSnapshots.map((s) => (
                        <button
                          key={s.session_id}
                          onClick={() => setSelectedSnapshot(s)}
                          className={cn(
                            'w-full text-left px-3 py-1.5 text-[10px] flex items-center gap-1.5 transition-colors',
                            selectedSnapshot?.session_id === s.session_id
                              ? 'bg-primary/10 text-primary font-semibold'
                              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                          )}
                        >
                          <Camera className="h-2.5 w-2.5 shrink-0" />
                          {formatSnapshotLabel(s.started_at)}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* iframe container — overflow:hidden clips the scaled iframe without breaking sticky above */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <div
          ref={scrollMarkerRef}
          style={{ position: 'absolute', left: 0, top: 0, height: 0, width: 0, pointerEvents: 'none' }}
        />
        {(isLoading || loadingEvents || isLoadingData) && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/30 text-xs text-muted-foreground">
            {isLoadingData ? 'Loading heatmap data…' : 'Loading snapshot…'}
          </div>
        )}

        {/* sandbox="allow-same-origin": blocks scripts, allows contentDocument access for rebuild() */}
        <iframe
          ref={iframeRef}
          sandbox="allow-same-origin"
          className="pointer-events-none absolute top-0 left-0 border-0"
          style={{
            width: iframeW,
            height: iframeH,
            transform: `scale(${iframeDisplayScale})`,
            transformOrigin: 'top left',
          }}
        />
      </div>
    </div>
  )
})
