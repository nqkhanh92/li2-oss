'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { eventWithTime } from 'rrweb/typings/types'
import { Globe, MousePointerClick, ArrowDown, Play, Pause, Maximize, Tag } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/components/ui/button'
import { Switch } from '@/shared/components/ui/switch'
import { Label } from '@/shared/components/ui/label'
import 'rrweb-player/dist/style.css'

const RRWEB_FULL_SNAPSHOT = 2
const RRWEB_META = 4
const RRWEB_INCREMENTAL = 3
const SRC_MOUSE_INTERACTION = 2
const SRC_MUTATION = 0
const SRC_SCROLL = 3
const MOUSE_CLICK = 2
const SCROLL_DEBOUNCE_MS = 2000
const SCROLL_MIN_CHANGE_PX = 100

type SummaryType = 'page' | 'click' | 'scroll'

interface SummaryEvent {
  key: string
  type: SummaryType
  offsetMs: number
  label: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildNodeMap(node: any, map: Map<number, any>) {
  if (!node || node.id == null) return
  map.set(node.id, node)
  if (node.childNodes) {
    for (const child of node.childNodes) buildNodeMap(child, map)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getInnerText(node: any): string {
  if (!node) return ''
  if (typeof node.textContent === 'string') return node.textContent.trim()
  if (!node.childNodes) return ''
  return node.childNodes
    .map(getInnerText)
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function describeClickedNode(node: any, x: number, y: number): string {
  if (!node) return `Click (${x}, ${y})`
  const text = getInnerText(node).slice(0, 50)
  if (text) return `Click on "${text}"`
  const tag: string = node.tagName?.toLowerCase() ?? ''
  const placeholder: string = node.attributes?.placeholder ?? ''
  const ariaLabel: string = node.attributes?.['aria-label'] ?? ''
  const title: string = node.attributes?.title ?? ''
  const fallback = placeholder || ariaLabel || title
  if (fallback) return `Click on "${fallback.slice(0, 50)}"`
  if (tag) return `Click on <${tag}>`
  return `Click (${x}, ${y})`
}

function extractSummaryEvents(events: eventWithTime[]): SummaryEvent[] {
  if (!events.length) return []
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp)
  const startTs = sorted[0].timestamp
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nodeMap = new Map<number, any>()
  for (const e of sorted) {
    if (e.type === RRWEB_FULL_SNAPSHOT) {
      nodeMap.clear()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      buildNodeMap((e as any).data?.node, nodeMap)
    } else if (e.type === RRWEB_INCREMENTAL) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d = (e as any).data
      if (d?.source === SRC_MUTATION && d.adds) {
        for (const added of d.adds) {
          if (added.node) buildNodeMap(added.node, nodeMap)
        }
      }
    }
  }
  const maxScrollY = new Map<number, number>()
  for (const e of sorted) {
    if (e.type === RRWEB_INCREMENTAL) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d = (e as any).data
      if (d?.source === SRC_SCROLL && d.y != null) {
        const y = Math.round(d.y)
        if (y > (maxScrollY.get(d.id) ?? 0)) maxScrollY.set(d.id, y)
      }
    }
  }
  const result: SummaryEvent[] = []
  const lastScrollAt = new Map<number, number>()
  const lastScrollY = new Map<number, number>()
  for (let i = 0; i < sorted.length; i++) {
    const e = sorted[i]
    const offset = e.timestamp - startTs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = (e as any).data
    if (e.type === RRWEB_META) {
      let path = d?.href ?? '/'
      try { path = new URL(d?.href).pathname || '/' } catch { /* keep href */ }
      result.push({ key: `page-${i}`, type: 'page', offsetMs: offset, label: `Navigate to "${path}"` })
      lastScrollAt.clear()
      lastScrollY.clear()
    } else if (e.type === RRWEB_INCREMENTAL) {
      if (d?.source === SRC_MOUSE_INTERACTION && d?.type === MOUSE_CLICK) {
        const node = nodeMap.get(d.id)
        const x = Math.round(d?.x ?? 0)
        const y = Math.round(d?.y ?? 0)
        result.push({ key: `click-${i}`, type: 'click', offsetMs: offset, label: describeClickedNode(node, x, y) })
      } else if (d?.source === SRC_SCROLL) {
        const nodeId: number = d.id
        const y = Math.round(d?.y ?? 0)
        if (!lastScrollY.has(nodeId)) {
          lastScrollY.set(nodeId, y)
          lastScrollAt.set(nodeId, offset)
        } else {
          const prevY = lastScrollY.get(nodeId)!
          const prevTime = lastScrollAt.get(nodeId)!
          if (Math.abs(y - prevY) >= SCROLL_MIN_CHANGE_PX && offset - prevTime >= SCROLL_DEBOUNCE_MS) {
            lastScrollAt.set(nodeId, offset)
            lastScrollY.set(nodeId, y)
            const maxY = maxScrollY.get(nodeId) ?? 0
            const label = maxY > 0 ? `Scroll to ${Math.round((y / maxY) * 100)}%` : `Scroll to ${y}px`
            result.push({ key: `scroll-${i}`, type: 'scroll', offsetMs: offset, label })
          }
        }
      }
    }
  }
  return result
}

function formatOffset(ms: number): string {
  if (ms == null || isNaN(ms) || ms < 0 || ms > 1000 * 60 * 60 * 24 * 7) return '0:00'
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function PlayerControls({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  player,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  replayer,
  currentMs,
  totalMs,
  isPlaying,
  onSeek,
  onPlayPause,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  player: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  replayer: any
  currentMs: number
  totalMs: number
  isPlaying: boolean
  onSeek: (ms: number) => void
  onPlayPause: () => void
}) {
  const [speed, setSpeed] = useState(1)
  const [skipInactive, setSkipInactive] = useState(true)

  const handleSpeedChange = (s: number) => {
    setSpeed(s)
    player?.setSpeed(s)
  }

  const handleSkipInactiveChange = (checked: boolean) => {
    setSkipInactive(checked)
    player?.toggleSkipInactive()
  }

  const handleFullscreen = () => {
    if (!replayer?.wrapper) return
    const el = replayer.wrapper.parentElement?.parentElement
    if (!el) return
    if (document.fullscreenElement) document.exitFullscreen()
    else el.requestFullscreen()
  }

  return (
    <div className="bg-background/95 backdrop-blur-sm border-t p-4 space-y-4">
      {/* Progress Bar */}
      <div className="flex items-center gap-4 group">
        <span className="text-[11px] font-mono tabular-nums text-muted-foreground w-10 text-right shrink-0">
          {formatOffset(currentMs)}
        </span>
        <div className="relative flex-1 h-1.5 bg-slate-300 rounded-full cursor-pointer">
          <input
            type="range"
            min={0}
            max={totalMs || 1}
            value={currentMs}
            onChange={(e) => onSeek(Number(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div 
            className="absolute h-full bg-primary rounded-full pointer-events-none"
            style={{ width: `${Math.min(100, Math.max(0, (currentMs / (totalMs || 1)) * 100))}%` }}
          />
          <div 
            className="absolute top-1/2 w-[2px] h-3.5 bg-primary pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ 
              left: `${Math.min(100, Math.max(0, (currentMs / (totalMs || 1)) * 100))}%`, 
              transform: `translate(-50%, -50%)` 
            }}
          />
        </div>
        <span className="text-[11px] font-mono tabular-nums text-muted-foreground w-10 shrink-0">
          {formatOffset(totalMs)}
        </span>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full hover:bg-primary/10 hover:text-primary transition-all active:scale-95"
            onClick={onPlayPause}
          >
            {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
          </Button>
          <div className="h-4 w-px bg-border mx-1" />
          <div className="flex items-center bg-muted/50 rounded-lg p-1 border">
            {[1, 2, 4, 8].map((s) => (
              <button
                key={s}
                onClick={() => handleSpeedChange(s)}
                className={cn(
                  'px-3 py-1 rounded-md text-[10px] font-bold transition-all',
                  speed === s ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Switch
              id="skip-inactive"
              checked={skipInactive}
              onCheckedChange={handleSkipInactiveChange}
              className="scale-75"
            />
            <Label htmlFor="skip-inactive" className="text-[11px] font-medium text-muted-foreground cursor-pointer select-none">
              Skip inactive
            </Label>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground rounded-lg"
            onClick={handleFullscreen}
          >
            <Maximize className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function EventTimeline({
  events,
  currentMs,
  playerHeight,
  onSeek,
}: {
  events: SummaryEvent[]
  currentMs: number
  playerHeight: number
  onSeek: (offsetMs: number) => void
}) {
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [isLg, setIsLg] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    setIsLg(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsLg(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const activeIndex = useMemo(() => {
    let idx = -1
    for (let i = 0; i < events.length; i++) {
      if (events[i].offsetMs <= currentMs) idx = i
      else break
    }
    return idx
  }, [events, currentMs])

  useEffect(() => {
    itemRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [activeIndex])

  return (
    <div
      className="w-full lg:w-64 shrink-0 flex flex-col border rounded-xl overflow-hidden bg-background shadow-sm"
      style={isLg ? { height: playerHeight || undefined } : { maxHeight: '14rem' }}
    >
      <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2">
        <Tag className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Events</span>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-border/50">
        {events.length === 0 ? (
          <div className="p-8 text-xs text-muted-foreground text-center">No events recorded</div>
        ) : (
          events.map((ev, i) => {
            const Icon = ev.type === 'page' ? Globe : ev.type === 'scroll' ? ArrowDown : MousePointerClick
            const isMuted = i <= activeIndex
            return (
              <button
                key={ev.key}
                ref={(el) => { itemRefs.current[i] = el }}
                onClick={() => onSeek(ev.offsetMs)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-all text-xs group',
                  isMuted && 'opacity-40'
                )}
              >
                <div className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                  ev.type === 'page' && 'bg-blue-500/10 text-blue-500',
                  ev.type === 'click' && 'bg-green-500/10 text-green-500',
                  ev.type === 'scroll' && 'bg-orange-500/10 text-orange-500',
                )}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate group-hover:text-primary transition-colors">{ev.label}</div>
                  <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                    {formatOffset(ev.offsetMs)}
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

interface SessionReplayPlayerProps {
  events: eventWithTime[]
}

export function SessionReplayPlayer({ events }: SessionReplayPlayerProps) {
  const playerAreaRef = useRef<HTMLDivElement>(null)
  const seekRef = useRef<((offsetMs: number) => void) | null>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [playerHeight, setPlayerHeight] = useState(0)
  const [currentMs, setCurrentMs] = useState(0)

  useEffect(() => {
    if (!playerAreaRef.current) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w) setContainerWidth(Math.floor(w))
    })
    ro.observe(playerAreaRef.current)
    return () => ro.disconnect()
  }, [])

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => a.timestamp - b.timestamp)
  }, [events])

  const { metaWidth, metaHeight } = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const meta = sortedEvents.find((e) => e.type === RRWEB_META) as any
    return {
      metaWidth: (meta?.data?.width as number) || 1280,
      metaHeight: (meta?.data?.height as number) || 720,
    }
  }, [sortedEvents])

  const summaryEvents = useMemo(() => extractSummaryEvents(sortedEvents), [sortedEvents])

  return (
    <div className="flex flex-col lg:flex-row gap-4 items-start">
      <div ref={playerAreaRef} className="flex-1 min-w-0 w-full">
        {containerWidth > 0 && (
          <Player
            events={sortedEvents}
            metaWidth={metaWidth}
            metaHeight={metaHeight}
            containerWidth={containerWidth}
            seekRef={seekRef}
            onTimeUpdate={setCurrentMs}
            onHeightChange={setPlayerHeight}
          />
        )}
      </div>
      <EventTimeline
        events={summaryEvents}
        currentMs={currentMs}
        playerHeight={playerHeight}
        onSeek={(offset) => {
          if (seekRef.current) {
            try {
              seekRef.current(offset)
              setCurrentMs(offset)
            } catch (e) {
              console.error('Failed to seek from timeline:', e)
            }
          }
        }}
      />
    </div>
  )
}

const MAX_PLAYER_HEIGHT = 720

function Player({
  events,
  metaWidth,
  metaHeight,
  containerWidth,
  seekRef,
  onTimeUpdate,
  onHeightChange,
}: {
  events: eventWithTime[]
  metaWidth: number
  metaHeight: number
  containerWidth: number
  seekRef: React.MutableRefObject<((offsetMs: number) => void) | null>
  onTimeUpdate: (offsetMs: number) => void
  onHeightChange: (h: number) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const onTimeUpdateRef = useRef(onTimeUpdate)
  const onHeightChangeRef = useRef(onHeightChange)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [player, setPlayer] = useState<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [replayer, setReplayer] = useState<any>(null)
  const [currentMs, setCurrentMs] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [totalMs, setTotalMs] = useState(() => {
    if (!events.length) return 0
    return events[events.length - 1].timestamp - events[0].timestamp
  })

  // Scale down only — never upscale. Fit both width and max height.
  const cssScale = containerWidth > 0
    ? Math.min(1, containerWidth / metaWidth, MAX_PLAYER_HEIGHT / metaHeight)
    : 1
  const scaledHeight = Math.round(metaHeight * cssScale)

  useEffect(() => { onTimeUpdateRef.current = onTimeUpdate }, [onTimeUpdate])
  useEffect(() => { onHeightChangeRef.current = onHeightChange }, [onHeightChange])

  const [currentUrl, setCurrentUrl] = useState<string>(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const meta = events.find((e) => e.type === RRWEB_META) as any
    return meta?.data?.href ?? ''
  })

  useEffect(() => {
    if (!wrapperRef.current) return
    const ro = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect.height
      if (h) onHeightChangeRef.current(Math.floor(h))
    })
    ro.observe(wrapperRef.current)
    return () => ro.disconnect()
  }, [])

  // Smooth progress and state update loop
  useEffect(() => {
    if (!replayer) return
    let rafId: number
    const update = () => {
      if (typeof replayer.getCurrentTime === 'function') {
        const offset = replayer.getCurrentTime()
        if (offset >= 0 && offset < 1000 * 60 * 60 * 24) {
          setCurrentMs(offset)
          onTimeUpdateRef.current(offset)
        }
      }
      if (replayer.timer && typeof replayer.timer.isActive === 'function') {
        setIsPlaying(replayer.timer.isActive())
      }
      rafId = requestAnimationFrame(update)
    }
    rafId = requestAnimationFrame(update)
    return () => cancelAnimationFrame(rafId)
  }, [replayer])

  // Initialize rrweb-player at the recording's exact native dimensions.
  // containerWidth is intentionally excluded from deps — resize is handled
  // via CSS transform (cssScale) without recreating the player.
  useEffect(() => {
    if (!containerRef.current || events.length < 2) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let p: any = null

    import('rrweb-player').then(({ default: rrwebPlayer }) => {
      if (!containerRef.current) return
      p = new rrwebPlayer({
        target: containerRef.current,
        props: { events, width: metaWidth, height: metaHeight, autoPlay: false, showController: false },
      })
      setPlayer(p)

      const rp = p.getReplayer()
      setReplayer(rp)

      const meta = p.getMetaData()
      if (meta && meta.totalTime && meta.totalTime > 0) {
        setTotalMs(meta.totalTime)
      }

      const handlePlay = () => setIsPlaying(true)
      const handlePause = () => setIsPlaying(false)

      p.addEventListener('play', handlePlay)
      p.addEventListener('pause', handlePause)
      p.addEventListener('resume', handlePlay)
      p.addEventListener('finish', handlePause)

      rp.on('play', handlePlay)
      rp.on('pause', handlePause)
      rp.on('resume', handlePlay)
      rp.on('finish', handlePause)

      seekRef.current = (offsetMs: number) => {
        if (typeof p.goto === 'function') {
          try {
            p.goto(offsetMs)
            setCurrentMs(offsetMs)
          } catch (e) {
            console.warn('Replayer goto failed (normal during init):', e)
          }
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rp.on('event-cast', (event: any) => {
        if (event.type === RRWEB_META && event.data?.href) setCurrentUrl(event.data.href)
      })
    })
    return () => {
      seekRef.current = null
      p?.$destroy?.()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, metaWidth, metaHeight, seekRef])

  return (
    <div ref={wrapperRef} className="rounded-xl overflow-hidden border bg-background shadow-sm flex flex-col">
      <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b">
        <div className="flex gap-1.5 shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400/80 shadow-sm" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/80 shadow-sm" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-400/80 shadow-sm" />
        </div>
        <div className="flex-1 bg-background border rounded-lg px-3 py-1.5 text-[11px] text-muted-foreground font-mono truncate min-w-0 flex items-center gap-2 shadow-sm">
          <Globe className="h-3.5 w-3.5 shrink-0 opacity-70" />
          <span className="truncate">{currentUrl || '—'}</span>
        </div>
      </div>

      {/* Recording area: always rendered at native metaWidth×metaHeight, then CSS-scaled to fit */}
      <div
        className="bg-black flex items-start justify-center overflow-hidden"
        style={{ height: scaledHeight }}
      >
        <div
          style={{
            width: metaWidth,
            height: metaHeight,
            transform: `scale(${cssScale})`,
            transformOrigin: 'top center',
            flexShrink: 0,
          }}
        >
          <div
            ref={containerRef}
            className={cn(
              '[&_.rr-player]:!shadow-none [&_.rr-player]:!bg-transparent',
              '[&_.rr-player__frame]:!shadow-none [&_.rr-player__frame]:!bg-transparent',
            )}
          />
        </div>
      </div>

      <PlayerControls
        player={player}
        replayer={replayer}
        currentMs={currentMs}
        totalMs={totalMs}
        isPlaying={isPlaying}
        onSeek={(ms) => {
          if (player && replayer?.wrapper) {
            try {
              player.goto(ms)
              setCurrentMs(ms)
            } catch (e) {
              console.error('Failed to seek from controls:', e)
            }
          }
        }}
        onPlayPause={() => {
          if (isPlaying) player?.pause()
          else player?.play()
          setIsPlaying(!isPlaying) // Optimistic toggle
        }}
      />
    </div>
  )
}
