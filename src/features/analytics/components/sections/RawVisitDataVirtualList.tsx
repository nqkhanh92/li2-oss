import { useIsMobile } from '@/shared/hooks/use-mobile'
import dayjs from 'dayjs'
import { Check, Copy, MousePointerClick, ScanQrCode, SmartphoneNfc } from 'lucide-react'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { InfiniteVirtualList } from '@/shared/components/ui/infinite-virtual-list'
import { useRawVisitDataInfiniteScroll } from '@/features/analytics/hooks/useRawVisitDataInfiniteScroll'
import { RawVisitDataParams } from '@/features/analytics/hooks/queries'
import { useTranslation } from 'react-i18next'

interface RawVisitDataVirtualListProps {
  orgId: string
  params: RawVisitDataParams
}

type RawVisit = {
  id: string
  touchpoint_id: string
  touchpoint_name: string
  os: string
  platform: string
  channel: string
  country: string
  city: string
  ip: string
  isp: string
  referrer: string
  created_at: string
}

function channelToAction(channel: string) {
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

export const RawVisitDataVirtualList = ({ orgId, params }: RawVisitDataVirtualListProps) => {
  const isMobile = useIsMobile()
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null)

  // Fetch data with infinite scroll
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useRawVisitDataInfiniteScroll(orgId, params)

  // Flatten paginated data
  const flatData = useMemo(() => {
    if (!data?.pages) return []
    return data.pages.flatMap((page) => page.data || [])
  }, [data])

  const totalCount = data?.pages[0]?.rowCount ?? 0

  // Responsive estimate size based on screen width
  const getEstimateSize = () => {
    if (typeof window === 'undefined') return 70
    // Mobile: taller due to wrapped content
    // Tablet/Desktop: shorter single-row layout
    return window.innerWidth < 768 ? 135 : 60
  }

  // Handle IP copy
  const handleCopyIp = async (ip: string, visitId: string) => {
    if (!ip) return
    const success = await navigator.clipboard
      .writeText(ip)
      .then(() => true)
      .catch(() => false)
    if (success) {
      setCopiedItemId(visitId)
      setTimeout(() => setCopiedItemId(null), 2000)
    }
  }

  // Desktop row component
  const DesktopRow = ({ visit }: { visit: RawVisit }) => (
    <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr_1fr_0.9fr_1.2fr_1fr] gap-x-2 sm:gap-x-3 gap-y-2 items-center text-sm">
      {/* Touchpoint Name */}
      <div className="font-semibold text-slate-900 truncate min-w-0">
        <Link href={`/org/${orgId}/short-links/${visit.touchpoint_id}`}>
          {visit.touchpoint_name}
        </Link>
      </div>

      {/* OS */}
      <div className="text-slate-600 text-xs truncate min-w-0">{visit.os}</div>

      {/* Platform */}
      <div className="text-slate-600 text-xs truncate min-w-0">{visit.platform}</div>

      {/* Location */}
      <div
        className="text-slate-600 truncate text-xs"
        title={visit.city ? `${visit.city}, ${visit.country}` : visit.country}
      >
        {visit.city ? `${visit.city}, ${visit.country}` : visit.country}
      </div>

      {/* Channel */}
      <div className="text-xs min-w-0 overflow-hidden">
        <span
          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
            visit.channel === 'LINK' ? 'bg-blue-100 text-blue-700' : 'bg-sky-100 text-sky-700'
          }`}
        >
          {channelToAction(visit.channel)}
        </span>
      </div>

      {/* IP */}
      <div className="flex items-center gap-1 text-slate-600 text-xs font-mono group truncate">
        <span className="truncate" title={visit.ip || '-'}>
          {visit.ip || '-'}
        </span>
        {visit.ip && (
          <button
            onClick={() => handleCopyIp(visit.ip, visit.id)}
            className="flex-shrink-0 p-0.5 active:bg-slate-200 rounded transition-colors"
            title="Copy IP address"
          >
            {copiedItemId === visit.id ? (
              <Check className="w-3 h-3 text-green-600" />
            ) : (
              <Copy className="w-3 h-3 text-slate-400 active:text-slate-600" />
            )}
          </button>
        )}
      </div>

      {/* Time */}
      <div className="text-slate-500 text-xs whitespace-nowrap text-right">
        {dayjs(visit.created_at).format('L, HH:mm')}
      </div>
    </div>
  )

  // Mobile row component
  const MobileRow = ({ visit }: { visit: RawVisit }) => (
    <div className="flex flex-col gap-2">
      {/* Header Row: Touchpoint name + Time */}
      <div className="grid grid-cols-[1fr_auto] gap-x-2 items-center min-w-0">
        <div className="font-semibold text-slate-900 truncate min-w-0 text-sm">
          <Link href={`/org/${orgId}/short-links/${visit.touchpoint_id}`}>
            {visit.touchpoint_name}
          </Link>
        </div>
        <div className="text-slate-500 text-[11px] sm:text-xs whitespace-nowrap">
          {dayjs(visit.created_at).format('MMM DD, HH:mm')}
        </div>
      </div>

      {/* Details Row 1: Channel + Platform/OS + Location */}
      <div className="text-xs grid grid-cols-[auto_1fr_1fr] gap-x-2 items-center min-w-0">
        {/* Channel Badge */}
        <span
          className={`flex items-center px-2 py-1 rounded-full max-w-min font-medium whitespace-nowrap ${
            visit.channel === 'LINK' ? 'bg-blue-100 text-blue-700' : 'bg-sky-100 text-sky-700'
          }`}
        >
          {channelToAction(visit.channel)}
        </span>

        {/* Platform / OS */}
        <div className="text-slate-600 truncate min-w-0">
          {visit.platform} / {visit.os}
        </div>

        {/* Location */}
        <div className="text-slate-600 truncate text-right min-w-0">
          {visit.city ? `${visit.city}, ${visit.country}` : visit.country}
        </div>
      </div>

      {/* Details Row 2: ISP, Referrer, IP */}
      <div className="flex flex-col gap-1.5 text-xs">
        {/* ISP */}
        <div className="text-slate-600 truncate">
          <span className="text-slate-500 font-medium">ISP:</span> {visit.isp || '-'}
        </div>

        {/* Referrer */}
        {visit.referrer && visit.referrer !== 'direct' && (
          <div className="text-slate-600 truncate" title={visit.referrer}>
            <span className="text-slate-500 font-medium">Referrer:</span> {visit.referrer}
          </div>
        )}

        {/* IP */}
        <div className="flex items-center gap-1 font-mono text-slate-600 min-w-0">
          <span className="text-slate-500 font-medium not-italic">IP:</span>
          <span className="truncate">{visit.ip || '-'}</span>
          {visit.ip && (
            <button
              onClick={() => handleCopyIp(visit.ip, visit.id)}
              className="flex-shrink-0 p-0.5 hover:bg-slate-200 active:bg-slate-300 rounded transition-colors"
              title="Copy IP address"
            >
              {copiedItemId === visit.id ? (
                <Check className="w-3 h-3 text-green-600" />
              ) : (
                <Copy className="w-3 h-3 text-slate-400 hover:text-slate-600" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
  const { t } = useTranslation(['common', 'analytic'])

  return (
    <div className="w-full h-full bg-background rounded-lg border border-slate-200 flex flex-col overflow-hidden">
      {/* Table Header - Desktop only */}
      <div
        className="hidden md:grid gap-x-3 px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 flex-shrink-0"
        style={{
          gridTemplateColumns:
            'minmax(0,1.2fr) minmax(0,0.8fr) minmax(0,0.8fr) minmax(0,1fr) minmax(0,0.9fr) minmax(0,1.2fr) minmax(0,1fr)',
        }}
      >
        <div>{t('analytic:label.link')}</div>
        <div>{t('analytic:label.os')}</div>
        <div>{t('analytic:label.platform')}</div>
        <div>{t('analytic:label.location')}</div>
        <div>{t('analytic:label.channel')}</div>
        <div>{t('analytic:label.ip')}</div>
        <div className="text-right">{t('analytic:label.time')}</div>
      </div>

      {/* Scrollable container for virtual list */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <InfiniteVirtualList
          data={flatData}
          rowCount={totalCount}
          isLoading={isLoading}
          isFetchingNextPage={isFetchingNextPage}
          hasNextPage={hasNextPage}
          onFetchNextPage={fetchNextPage}
          renderItem={(visit) => (
            <div className="px-3 sm:px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100">
              {isMobile ? <MobileRow visit={visit} /> : <DesktopRow visit={visit} />}
            </div>
          )}
          getItemKey={(visit) => visit.id}
          estimateSize={getEstimateSize}
          height="100%"
          emptyText="No visit data available"
          loadingText="Loading visit data..."
          overscan={5}
          scrollThreshold={100}
          containerClassName="h-full"
        />
      </div>
    </div>
  )
}
