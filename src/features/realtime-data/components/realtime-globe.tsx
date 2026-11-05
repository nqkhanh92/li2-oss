'use client'

import { useEffect, useState } from 'react'
import { RealtimeTouchpoint, IInteractionChannel } from './columns'
import { useTranslation } from 'react-i18next'
// COMMENTED OUT - Globe related imports
// import { useRef, useMemo } from 'react'
// import worldJson from '@/public/json/countries.geo.json'
// import {
//   getCountryCoordinates,
//   getCityCoordinatesApprox,
//   getCountryNameFromIso,
// } from '@/shared/utils/geocode'
import { getCountryNameFromIso } from '@/shared/utils/geocode'
// Note: Three.js is a dependency of react-globe.gl, not explicitly in package.json
// This avoids the "Multiple instances of Three.js" warning
// import { MeshPhongMaterial } from 'three'
// import { type GlobeMethods } from 'react-globe.gl'
// import Globe from 'react-globe.gl'
import { cn } from '@/shared/lib/utils'
import {
  MousePointerClick,
  ScanQrCode,
  Copy,
  Check,
  SmartphoneNfc,
  User,
  UserRound,
} from 'lucide-react'
import dayjs from '@/shared/lib/dayjs'
import { useIsMobile } from '@/shared/hooks/use-mobile'
import Link from 'next/link'
import { RealtimeInteractionsList } from './realtime-interactions-list'
import { LiveDot } from './live-dot'
import { disabledFeatures } from '@/shared/constants/disabled-features'

// The Visitor column resolves a customer profile through conversion_events, which is
// attribution data. The API drops those fields under the same flag.
const SHOW_VISITOR = !disabledFeatures.ATTRIBUTION

// Link, Action, Country, Platform, IP, [Visitor], Time
const ACTIVITY_GRID_COLUMNS = `repeat(${SHOW_VISITOR ? 7 : 6}, minmax(0,1fr))`

interface RealtimeGlobeProps {
  orgId: string
  /** Total rows in the selected window, from the list query's rowCount */
  totalCount: number
  listData: RealtimeTouchpoint[]
  isLoadingList?: boolean
  isFetchingNextPage?: boolean
  hasNextPage?: boolean
  onFetchNextPage?: () => void
  className?: string
  showLegend?: boolean
  showCity?: boolean
  timeWindowLabel?: string
}

function channelToAction(channel: IInteractionChannel) {
  switch (channel) {
    case 'QR':
      return (
        <>
          <ScanQrCode className="w-3 h-3" />
          Scan
        </>
      )
    case 'NFC':
      return (
        <>
          <SmartphoneNfc className="w-3 h-3" />
          Tap
        </>
      )
    default:
      return (
        <>
          <MousePointerClick className="w-3 h-3" />
          Click
        </>
      )
  }
}

// Cross-browser compatible copy to clipboard function
async function copyToClipboard(text: string): Promise<boolean> {
  // Try modern API first (most browsers)
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Fall back to legacy method if modern API fails
    }
  }

  // Legacy method for older browsers and insecure contexts
  try {
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    const success = document.execCommand('copy')
    document.body.removeChild(textArea)
    return success
  } catch {
    return false
  }
}

const TIME_UNITS = [
  { threshold: 60, divisor: 1, label: 's' },
  { threshold: 3600, divisor: 60, label: 'm' },
  { threshold: 86400, divisor: 3600, label: 'h' },
  { threshold: 604800, divisor: 86400, label: 'd' },
  { threshold: 2592000, divisor: 604800, label: 'w' },
  { threshold: 31536000, divisor: 2592000, label: 'mo' },
  { threshold: Infinity, divisor: 31536000, label: 'y' },
]

const shortenTimeAgo = (created_at: string) => {
  if (typeof window === 'undefined') return ''

  const duration = dayjs.duration(dayjs().diff(dayjs(created_at)))
  if (window.innerWidth <= 768) {
    const seconds = Math.floor(duration.asSeconds())
    const unit = TIME_UNITS.find((u) => seconds < u.threshold)
    return unit ? `${Math.floor(seconds / unit.divisor)}${unit.label}` : ''
  }

  return duration.humanize()
}

export const RealtimeGlobe = ({
  orgId,
  totalCount,
  listData,
  isLoadingList,
  isFetchingNextPage,
  hasNextPage,
  onFetchNextPage,
  className,
  showLegend = false,
  showCity = false,
  timeWindowLabel,
}: RealtimeGlobeProps) => {
  // COMMENTED OUT - Globe related refs and state
  // const globeEl = useRef<GlobeMethods | undefined>()
  // const parentRef = useRef<HTMLDivElement>(null)
  // const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  // const [globeWidth, setGlobeWidth] = useState(500)
  // const [globeHeight, setGlobeHeight] = useState(300)

  const { t } = useTranslation(['realtime', 'common'])
  const isMobile = useIsMobile()
  // const [hoveredHex, setHoveredHex] = useState<any>(null)
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null)
  const [isXlScreen, setIsXlScreen] = useState(false)

  // COMMENTED OUT - Globe related code
  // Transform realtime data to hex bin points for the hex bin layer
  // const hexBinPoints = useMemo(() => {
  //   if (!globeData || globeData.length === 0) return []

  //   // Aggregate interactions by location to avoid duplicate points
  //   const locationMap = new Map<
  //     string,
  //     {
  //       lat: number
  //       lng: number
  //       weight: number
  //       interactions: RealtimeTouchpoint[]
  //     }
  //   >()

  //   globeData.forEach((interaction) => {
  //     const coords = interaction.city
  //       ? getCityCoordinatesApprox(interaction.country, interaction.city)
  //       : getCountryCoordinates(interaction.country)

  //     if (!coords) return

  //     // Create unique key for this location
  //     const key = `${coords.lat.toFixed(2)},${coords.lng.toFixed(2)}`

  //     const existing = locationMap.get(key)
  //     if (existing) {
  //       existing.weight += 1
  //       existing.interactions.push(interaction)
  //     } else {
  //       locationMap.set(key, {
  //         lat: coords.lat,
  //         lng: coords.lng,
  //         weight: 1,
  //         interactions: [interaction],
  //       })
  //     }
  //   })

  //   return Array.from(locationMap.values())
  // }, [globeData])

  // // Find location with most interactions
  // const topLocation = useMemo(() => {
  //   if (hexBinPoints.length === 0) return null

  //   // Find the point with highest weight
  //   const maxPoint = hexBinPoints.reduce(
  //     (max, point) => (point.weight > max.weight ? point : max),
  //     hexBinPoints[0]
  //   )

  //   return maxPoint
  // }, [hexBinPoints])

  // // Get the newest data location (most recent interaction)
  // const newestLocation = useMemo(() => {
  //   if (!globeData || globeData.length === 0) return null

  //   // The globeData is already sorted by most recent first
  //   const newestInteraction = globeData[0]
  //   const coords = newestInteraction.city
  //     ? getCityCoordinatesApprox(newestInteraction.country, newestInteraction.city)
  //     : getCountryCoordinates(newestInteraction.country)

  //   return coords || null
  // }, [globeData])

  // Handle XL breakpoint detection for conditional Globe rendering
  useEffect(() => {
    const updateBreakpoint = () => {
      if (typeof window !== 'undefined') {
        // Check if screen is XL or larger (1280px)
        setIsXlScreen(window.innerWidth >= 1280)
      }
    }

    // Run immediately on mount
    updateBreakpoint()

    // Update on resize
    window.addEventListener('resize', updateBreakpoint)

    return () => {
      window.removeEventListener('resize', updateBreakpoint)
    }
  }, [])

  // COMMENTED OUT - Globe dimension tracking
  // useEffect(() => {
  //   const updateDimensions = () => {
  //     if (typeof window !== 'undefined') {
  //       if (parentRef.current) {
  //         const container = document.getElementById('globe-container')
  //         if (container) {
  //           setGlobeWidth(container.clientWidth)
  //         }
  //         // Set height based on parent container
  //         const height = parentRef.current.clientHeight
  //         if (height > 0) {
  //           setGlobeHeight(height)
  //         }
  //       }
  //     }
  //   }

  //   // Throttled version of updateDimensions
  //   const throttledUpdate = () => {
  //     // Clear any pending timeout
  //     if (resizeTimeoutRef.current) {
  //       clearTimeout(resizeTimeoutRef.current)
  //     }

  //     // Set new timeout - only execute after 250ms of no resize events
  //     resizeTimeoutRef.current = setTimeout(() => {
  //       updateDimensions()
  //     }, 250)
  //   }

  //   // Run immediately on mount for initial sizing
  //   updateDimensions()

  //   // Use throttled version for resize events
  //   window.addEventListener('resize', throttledUpdate)

  //   return () => {
  //     window.removeEventListener('resize', throttledUpdate)
  //     // Clean up any pending timeout on unmount
  //     if (resizeTimeoutRef.current) {
  //       clearTimeout(resizeTimeoutRef.current)
  //     }
  //   }
  // }, [])

  // COMMENTED OUT - Globe related code
  // Jump to newest location when auto-update is enabled
  // useEffect(() => {
  //   if (!autoUpdate || !globeEl.current || !newestLocation) return

  //   globeEl.current.controls().autoRotate = false

  //   // Jump to the newest data location
  //   globeEl.current.pointOfView(
  //     {
  //       lat: newestLocation.lat,
  //       lng: newestLocation.lng,
  //       altitude: 2,
  //     },
  //     800
  //   )
  // }, [autoUpdate, newestLocation])

  // // Convert TopoJSON to GeoJSON features for hexed polygons
  // const hexPolygons = useMemo(() => {
  //   // const countries = feature(worldJson as any, (worldJson as any).objects.countries) as any
  //   return worldJson.features || []
  // }, [])

  // const hexPolygonColor = useMemo(
  //   () => (d: any) => {
  //     // Use polygon index or id to generate stable random value
  //     const hash = d.properties?.NAME_LEN || d.properties?.LONG_LEN || Math.random()
  //     const opacity = (hash * 0.1) / 1.5 + 0.1
  //     return `rgba(148, 163, 184, ${opacity})`
  //   },
  //   []
  // )

  // Total interactions count
  //const totalInteractions = data?.length || 0

  // Handle IP copy
  const handleCopyIp = async (ip: string, visitId: string) => {
    if (!ip) return
    const success = await copyToClipboard(ip)
    if (success) {
      setCopiedItemId(visitId)
      setTimeout(() => setCopiedItemId(null), 2000)
    }
  }

  // Desktop row component
  const DesktopRow = ({ interaction }: { interaction: RealtimeTouchpoint }) => (
    <div
      className="grid gap-x-3 gap-y-2 items-center text-sm"
      style={{
        gridTemplateColumns: ACTIVITY_GRID_COLUMNS,
      }}
    >
      {/* Link Name */}
      <div className="font-semibold text-slate-900 truncate min-w-0">
        <Link href={`/org/${orgId}/short-links/${interaction.touchpoint_id}`}>
          {interaction.touchpoint_name}
        </Link>
      </div>

      {/* Channel Badge */}
      <div className="flex min-w-0 overflow-hidden">
        <span
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
            interaction.channel === 'LINK' ? 'bg-blue-100 text-blue-700' : 'bg-sky-100 text-sky-700'
          }`}
        >
          {channelToAction(interaction.channel)}
        </span>
      </div>

      {/* Location */}
      <div
        className="text-slate-600 truncate text-xs min-w-0"
        title={
          showCity && interaction.city
            ? `${interaction.city}, ${getCountryNameFromIso(interaction.country)}`
            : getCountryNameFromIso(interaction.country)
        }
      >
        {showCity && interaction.city
          ? `${interaction.city}, ${getCountryNameFromIso(interaction.country)}`
          : getCountryNameFromIso(interaction.country)}
      </div>

      {/* Device/OS */}
      <div className="text-slate-600 text-xs truncate min-w-0">
        {interaction.platform} / {interaction.os}
      </div>

      {/* IP */}
      <div className="flex items-center gap-1 text-slate-600 text-xs font-mono group truncate min-w-0">
        <span className="truncate" title={interaction.ip || '-'}>
          {interaction.ip || '-'}
        </span>
        {interaction.ip && (
          <button
            onClick={() => handleCopyIp(interaction.ip!, interaction.id)}
            className="flex-shrink-0 p-0.5 active:bg-slate-200 rounded transition-colors"
            title="Copy IP address"
          >
            {copiedItemId === interaction.id ? (
              <Check className="w-3 h-3 text-green-600" />
            ) : (
              <Copy className="w-3 h-3 text-slate-400 active:text-slate-600" />
            )}
          </button>
        )}
      </div>

      {/* Visitor */}
      {SHOW_VISITOR && (
        <div className="min-w-0">
          {interaction.customer_name ||
          interaction.customer_email ||
          interaction.customer_external_id ? (
            <div className="flex items-center gap-1.5">
              <div className="shrink-0 w-5 h-5 rounded-full bg-secondary/10 flex items-center justify-center">
                <User className="w-3 h-3 text-secondary" />
              </div>
              <p className="text-xs font-medium text-slate-700 truncate">
                {interaction.customer_name ||
                  interaction.customer_email ||
                  interaction.customer_external_id}
              </p>
            </div>
          ) : interaction.visitor_id ? (
            <div className="flex items-center gap-1.5">
              <div className="shrink-0 w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center">
                <UserRound className="w-3 h-3 text-slate-400" />
              </div>
              <p className="text-xs text-slate-400 truncate" title={interaction.visitor_id}>
                {interaction.visitor_id}
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-300">—</p>
          )}
        </div>
      )}

      {/* Time */}
      <div className="text-slate-500 text-xs whitespace-nowrap text-right">
        {shortenTimeAgo(interaction.created_at)} {t('common:label.ago')}
      </div>
    </div>
  )

  // Mobile row component
  const MobileRow = ({ interaction }: { interaction: RealtimeTouchpoint }) => (
    <div className="flex flex-col gap-2">
      {/* Header Row: Link name + Time */}
      <div className="grid grid-cols-[1fr_auto] gap-x-2 items-center">
        <div className="font-semibold text-slate-900 truncate min-w-0 text-sm">
          <Link href={`/org/${orgId}/short-links/${interaction.touchpoint_id}`}>
            {interaction.touchpoint_name}
          </Link>
        </div>
        <div className="text-slate-500 text-[11px] sm:text-xs whitespace-nowrap">
          {shortenTimeAgo(interaction.created_at)} {t('common:label.ago')}
        </div>
      </div>

      {/* Action Row: Channel badge + Location */}
      <div className="text-xs grid grid-cols-[1fr_1fr_auto] gap-x-2 items-center">
        {/* Channel Badge */}
        <span
          className={`flex items-center gap-1 px-2 py-1 rounded-full max-w-min font-medium whitespace-nowrap ${
            interaction.channel === 'LINK' ? 'bg-blue-100 text-blue-700' : 'bg-sky-100 text-sky-700'
          }`}
        >
          {channelToAction(interaction.channel)}
        </span>

        {/* Platform / OS */}
        <div className="text-slate-600">
          {interaction.platform} / {interaction.os}
        </div>

        {/* Location */}
        <div className="text-slate-600 truncate">
          {showCity && interaction.city
            ? `${interaction.city}, ${getCountryNameFromIso(interaction.country)}`
            : getCountryNameFromIso(interaction.country)}
        </div>
      </div>

      {/* Details Row: Referrer, IP, Visitor */}
      <div className="flex flex-col gap-1.5 text-xs">
        {/* Referrer */}
        {interaction.referrer && (
          <div className="text-slate-600 truncate" title={interaction.referrer}>
            <span className="text-slate-500 font-medium">Referrer:</span> {interaction.referrer}
          </div>
        )}

        {/* IP */}
        <div className="flex items-center gap-1 font-mono text-slate-600">
          <span className="text-slate-500 font-medium not-italic">IP:</span>
          <span className="truncate">{interaction.ip || '-'}</span>
          {interaction.ip && (
            <button
              onClick={() => handleCopyIp(interaction.ip!, interaction.id)}
              className="flex-shrink-0 p-0.5 hover:bg-slate-200 active:bg-slate-300 rounded transition-colors"
              title="Copy IP address"
            >
              {copiedItemId === interaction.id ? (
                <Check className="w-3 h-3 text-green-600" />
              ) : (
                <Copy className="w-3 h-3 text-slate-400 hover:text-slate-600" />
              )}
            </button>
          )}
        </div>

        {/* Visitor */}
        {SHOW_VISITOR &&
          (interaction.customer_name ||
          interaction.customer_email ||
          interaction.customer_external_id ? (
            <div className="flex items-center gap-1.5">
              <div className="shrink-0 w-4 h-4 rounded-full bg-secondary/10 flex items-center justify-center">
                <User className="w-2.5 h-2.5 text-secondary" />
              </div>
              <p className="text-xs font-medium text-slate-700 truncate">
                {interaction.customer_name ||
                  interaction.customer_email ||
                  interaction.customer_external_id}
              </p>
            </div>
          ) : interaction.visitor_id ? (
            <div className="flex items-center gap-1.5">
              <div className="shrink-0 w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center">
                <UserRound className="w-2.5 h-2.5 text-slate-400" />
              </div>
              <p className="text-xs text-slate-400 truncate" title={interaction.visitor_id}>
                {interaction.visitor_id}
              </p>
            </div>
          ) : null)}
      </div>
    </div>
  )

  // COMMENTED OUT - Globe related code
  // Initialize globe on ready
  // const handleGlobeReady = () => {
  //   if (!globeEl.current) return

  //   const controls = globeEl.current.controls()

  //   // Keep auto-rotate disabled for better performance
  //   controls.autoRotate = false
  //   controls.enableRotate = true

  //   // Jump to location with most interactions if available
  //   if (topLocation) {
  //     globeEl.current.pointOfView(
  //       {
  //         lat: topLocation.lat,
  //         lng: topLocation.lng,
  //         altitude: 2,
  //       },
  //       1500
  //     )
  //   }
  // }

  return (
    <div
      // ref={parentRef}
      className={cn(
        'grid grid-cols-1 gap-4 h-full', // xl:grid-cols-[minmax(400px,1fr)_2fr]
        className
      )}
    >
      {/* Globe Section - Only mounted on XL screens. change to isXlScreen later */}
      {false && (
        <div className="relative h-full">
          {/* Stats Panel */}
          {/* <div className="absolute top-4 right-4 bg-background border border-slate-200 rounded-lg p-4 shadow-lg z-10">
          <div className="text-xs font-semibold text-slate-600 mb-2">
            {t('common:text.realtime_interactions')}
          </div>
          <div className="text-2xl font-bold text-slate-900">{totalInteractions}</div>
          <div className="text-xs text-slate-500 mt-1">{t('realtime:last_24_hours')}</div>
        </div> */}

          {/* Globe */}
          <div id="globe-container" className="bg-card rounded-2xl overflow-hidden w-full h-full">
            {/* <Globe
            ref={globeEl}
            width={globeWidth}
            height={globeHeight}
            atmosphereColor="rgba(170, 170, 200, 0.8)"
            backgroundColor="rgba(0,0,0,0)"
            globeMaterial={
              new MeshPhongMaterial({
                color: 'rgb(228, 228, 231)',
                transparent: false,
                opacity: 1,
              })
            }
            // Hexed Polygons Layer
            hexPolygonUseDots
            hexPolygonsData={hexPolygons}
            hexPolygonResolution={3}
            hexPolygonMargin={0.2}
            hexPolygonAltitude={0.001}
            hexPolygonColor={(d) => hexPolygonColor(d)}
            // Hex Bin Layer
            hexBinPointsData={hexBinPoints}
            hexBinPointLat="lat"
            hexBinPointLng="lng"
            hexBinPointWeight="weight"
            hexBinResolution={3}
            hexBinMerge={true}
            hexAltitude={(d) => d.sumWeight * 0.0025}
            hexTopColor={(d) => {
              const intensity = Math.min(d.sumWeight / 5, 1)
              return `rgba(37, 99, 235, ${0.7 + intensity * 0.3})`
            }}
            hexSideColor={(d) => {
              const intensity = Math.min(d.sumWeight / 5, 1)
              return `rgba(186, 230, 253, ${0.4 + intensity * 0.3})`
            }}
            // Rings configuration
            ringColor={() => (t: number) => `rgba(255, 100, 50, ${1 - t})`}
            ringMaxRadius={3}
            ringPropagationSpeed={3}
            enablePointerInteraction={false}
            onGlobeReady={handleGlobeReady}
          /> */}
          </div>

          {/* Legend */}
          {showLegend && (
            <div className="absolute bottom-4 left-4 bg-background border border-slate-200 rounded-lg p-3 shadow-lg z-10">
              <div className="text-xs font-semibold text-slate-600 mb-2">
                {t('realtime:visualization_layers')}
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-4 h-3 bg-slate-500 rounded opacity-40"></div>
                  <span>{t('realtime:country_outlines')}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-4 h-3 bg-gradient-to-r from-blue-400 to-blue-600 rounded"></div>
                  <span>{t('realtime:interaction_clusters')}</span>
                </div>
                <div className="text-xs text-slate-500 mt-1 pt-1 border-t border-slate-200">
                  {t('realtime:taller_hexagons')}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Interactions List */}
      <div className="w-full bg-card rounded-2xl border border-slate-200 flex flex-col h-full min-h-0 overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-slate-200 flex-shrink-0">
          <div className="flex flex-col items-start justify-between gap-2 sm:gap-3">
            <div className="flex-1 w-full">
              <h3 className="text-sm font-semibold text-slate-900">
                {t('realtime:recent_interactions')}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {t('realtime:interactions_count', {
                  count: totalCount,
                  window: timeWindowLabel || '24 hours',
                })}
              </p>
            </div>
            <LiveDot label={t('realtime:auto_update')} />
          </div>
        </div>
        {/* Table Header - Desktop only */}
        <div
          className="hidden md:grid gap-x-3 px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 flex-shrink-0"
          style={{
            gridTemplateColumns: ACTIVITY_GRID_COLUMNS,
          }}
        >
          <div>{t('realtime:table.headers.linkName')}</div>
          <div>{t('realtime:table.headers.action')}</div>
          <div>{t('realtime:table.headers.country')}</div>
          <div>{t('realtime:table.headers.platform')}</div>
          <div>{t('common:label.ip')}</div>
          {SHOW_VISITOR && <div>{t('realtime:table.headers.visitor', 'Visitor')}</div>}
          <div className="text-right">{t('realtime:table.headers.time')}</div>
        </div>

        {/* Scrollable container for virtual list */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <RealtimeInteractionsList
            data={listData}
            isLoading={isLoadingList}
            isFetchingNextPage={isFetchingNextPage}
            hasNextPage={hasNextPage}
            onFetchNextPage={onFetchNextPage}
            renderRow={(interaction, isMobile) => (
              <div className="px-3 sm:px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100">
                {isMobile ? (
                  <MobileRow interaction={interaction} />
                ) : (
                  <DesktopRow interaction={interaction} />
                )}
              </div>
            )}
            className="h-full"
            containerClassName="h-full"
          />
        </div>
      </div>
    </div>
  )
}
