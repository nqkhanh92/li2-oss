'use client'

import { useParams } from 'next/navigation'
import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useRealtimeInteractionsInfinite } from '../hooks/use-realtime-interactions-infinite'
import { useRealtimeSummary } from '../hooks/use-realtime-summary'
import { useRealtimeTopLinks } from '../hooks/use-realtime-top-links'
import { SkeletonCard } from '@/shared/components/customize/skeleton-card'
import { RealtimeGlobe } from './realtime-globe'
import { RealtimeHeroMetrics } from './realtime-hero-metrics'
import { RealtimeTopLinks } from './realtime-top-links'
import { cn } from '@/shared/lib/utils'

/**
 * Cửa sổ thời gian tính bằng giờ vì cả API lẫn RPC `get_realtime_data_v4` chỉ nhận `p_last_hours`
 * (cap 168 ở route). Nhãn đi qua i18n để tiếng Việt đọc được "3 ngày" thay vì "3d".
 */
export const TIME_WINDOWS = [
  { labelKey: 'realtime:time_window.h24', value: 24 },
  { labelKey: 'realtime:time_window.d3', value: 72 },
  { labelKey: 'realtime:time_window.d7', value: 168 },
] as const

export const DEFAULT_WINDOW = TIME_WINDOWS[0]

/**
 * `showSummary` tắt dải thẻ tổng ở trên. Khi khối này nằm trong trang Analytics thì những con số
 * đó đã có ở phần Overview phía trên, lặp lại chỉ làm trang dài thêm.
 */
const RealtimeData = ({ showSummary = true }: { showSummary?: boolean } = {}) => {
  const { org_id } = useParams<{ org_id: string }>()
  const { t } = useTranslation(['realtime'])
  const [lastHours, setLastHours] = useState<number>(DEFAULT_WINDOW.value)

  const { data: summary, isLoading: isLoadingSummary } = useRealtimeSummary(org_id, {
    enabled: showSummary,
  })

  const { data: topLinks, isLoading: isLoadingTopLinks } = useRealtimeTopLinks(org_id, lastHours, 5)

  const {
    data: listPages,
    isLoading: isLoadingList,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useRealtimeInteractionsInfinite({
    p_last_hours: lastHours,
    p_organization_id: org_id,
    pageSize: 10,
  })

  const listData = useMemo(() => {
    if (!listPages?.pages) return []
    return listPages.pages.flatMap((page) => page.data)
  }, [listPages])

  // rowCount is the full window total: the repository drops p_limit for this RPC,
  // so the route counts every row before it slices the page
  const totalCount = listPages?.pages?.[0]?.rowCount ?? 0

  const timeWindowLabel = t(
    TIME_WINDOWS.find((tw) => tw.value === lastHours)?.labelKey ?? DEFAULT_WINDOW.labelKey
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Fixed-window live summary — these cards do not respond to the selector below */}
      {showSummary && <RealtimeHeroMetrics summary={summary} isLoading={isLoadingSummary} />}

      {/* Time-window selector scopes only the map, top links, and activity feed */}
      <div className="flex items-center justify-end">
        <div className="flex rounded-lg border border-slate-200 overflow-hidden">
          {TIME_WINDOWS.map((tw) => (
            <button
              key={tw.value}
              onClick={() => setLastHours(tw.value)}
              aria-pressed={lastHours === tw.value}
              className={cn(
                'px-3 py-1.5 text-xs font-medium transition-colors',
                lastHours === tw.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-slate-600 hover:bg-slate-50'
              )}
            >
              {t(tw.labelKey)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <RealtimeTopLinks topLinks={topLinks} isLoading={isLoadingTopLinks} />
        <div className="lg:col-span-2">
          {!isLoadingList ? (
            <RealtimeGlobe
              orgId={org_id}
              totalCount={totalCount}
              listData={listData}
              isLoadingList={isLoadingList}
              isFetchingNextPage={isFetchingNextPage}
              hasNextPage={hasNextPage}
              onFetchNextPage={fetchNextPage}
              timeWindowLabel={timeWindowLabel}
            />
          ) : (
            <SkeletonCard />
          )}
        </div>
      </div>
    </div>
  )
}

export default RealtimeData
