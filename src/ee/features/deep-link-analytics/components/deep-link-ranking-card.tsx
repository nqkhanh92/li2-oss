'use client'

import { ReactNode, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Card } from '@/shared/components/ui/card'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { cn } from '@/shared/lib/utils'
import {
  DeepLinkAnalyticsQueryParams,
  useDeepLinkRanking,
} from '@/ee/features/deep-link-analytics/hooks/queries'
import { DeepLinkRankingGroupBy, DeepLinkRankingRow } from '@/ee/features/deep-link-analytics/types'

const PAGE_SIZE = 10

export type SortKey = 'clicks' | 'direct_opens' | 'matched'

export interface RankingLeaf {
  value: string
  label: string
  groupBy: DeepLinkRankingGroupBy
}

export type RankingSubTab = { value: string; label: string; subTabs: RankingLeaf[] }
// A tab whose body is arbitrary content (e.g. a RankingRowsList fed by static summary rows).
export type RankingContentTab = { value: string; label: string; content: ReactNode }
export type RankingTab = RankingLeaf | RankingSubTab | RankingContentTab

export interface DeepLinkRankingCardProps {
  title: string
  filters: DeepLinkAnalyticsQueryParams
  tabs: RankingTab[]
  /** Sortable metrics shown per row. Card A: all three; Card B: ['clicks'] only. */
  columns: SortKey[]
  /** Drill-down handler (Card A passes it; Card B omits it → rows are not clickable). */
  onRowClick?: (groupBy: DeepLinkRankingGroupBy, key: string) => void
}

const hasSub = (t: RankingTab): t is RankingSubTab => 'subTabs' in t
const hasContent = (t: RankingTab): t is RankingContentTab => 'content' in t

// Presentational ranked bar-row list: client-side sort + 10/page. Fed by either a queried leaf
// (Link/Tag/Space/Referrer/UTM) or static rows (e.g. Channel from the already-loaded summary).
// Page is clamped (not reset via effect) so re-derived static row arrays don't thrash the page.
export function RankingRowsList({
  rows,
  isLoading,
  columns,
  groupBy,
  onRowClick,
}: {
  rows: DeepLinkRankingRow[]
  isLoading: boolean
  columns: SortKey[]
  groupBy?: DeepLinkRankingGroupBy
  onRowClick?: (groupBy: DeepLinkRankingGroupBy, key: string) => void
}) {
  const { t } = useTranslation(['domain'])
  const [sortKey, setSortKey] = useState<SortKey>('clicks')
  const [page, setPage] = useState(0)

  const sorted = useMemo(
    () => [...rows].sort((a, b) => b[sortKey] - a[sortKey] || a.name.localeCompare(b.name)),
    [rows, sortKey]
  )

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const slice = sorted.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)
  const maxVal = Math.max(1, ...sorted.map((r) => r[sortKey]))
  const clickable = Boolean(onRowClick && groupBy)

  if (isLoading) {
    return (
      <div className="flex flex-col gap-1.5 px-6 pb-6 pt-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-7 w-full" />
        ))}
      </div>
    )
  }

  if (sorted.length === 0) {
    return (
      <p className="text-muted-foreground px-6 py-10 text-center text-sm">
        {t('domain:deepLink.analytics.ranking.empty')}
      </p>
    )
  }

  return (
    <div className="px-6 pb-4 pt-3">
      {columns.length > 1 && (
        <div className="text-muted-foreground mb-2 flex items-center text-xs">
          {/* Header column geometry MUST mirror the data row below (flex-1 lead + w-16 pr-2
              right-aligned columns, no gap) so each label sits exactly above its number. */}
          <span className="flex-1 pl-3" />
          {columns.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setSortKey(c)
                setPage(0)
              }}
              className={cn(
                'w-16 pr-2 text-right tabular-nums',
                sortKey === c && 'text-foreground font-medium'
              )}
            >
              {t(`domain:deepLink.analytics.ranking.col.${c}`)}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        {slice.map((row) => {
          const barWidth = (row[sortKey] / maxVal) * 100
          return (
            <div
              key={row.key}
              onClick={
                clickable
                  ? () => {
                      if (groupBy) onRowClick?.(groupBy, row.key)
                    }
                  : undefined
              }
              className={cn('group/item relative h-7', clickable && 'cursor-pointer')}
            >
              <div
                className="bg-secondary-blue/10 group-hover/item:border-secondary-blue absolute left-0 top-0 h-7 rounded border-l-2 border-transparent transition-all"
                style={{ width: `${barWidth}%` }}
              />
              <div className="absolute left-0 top-0 flex h-7 w-full items-center">
                <p className="flex-1 truncate pl-3 text-xs text-slate-700">
                  {row.name.replace(/^https?:\/\//, '')}
                </p>
                {columns.map((c) => (
                  <span
                    key={c}
                    className={cn(
                      'w-16 pr-2 text-right text-sm tabular-nums',
                      c === sortKey ? 'text-slate-700' : 'text-slate-400'
                    )}
                  >
                    {row[c]}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {pageCount > 1 && (
        <div className="text-muted-foreground mt-3 flex items-center justify-end gap-3 text-xs">
          <button
            type="button"
            disabled={safePage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="disabled:opacity-40"
          >
            {t('domain:deepLink.analytics.ranking.prev')}
          </button>
          <span>
            {t('domain:deepLink.analytics.ranking.page', { page: safePage + 1, total: pageCount })}
          </span>
          <button
            type="button"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage((p) => p + 1)}
            className="disabled:opacity-40"
          >
            {t('domain:deepLink.analytics.ranking.next')}
          </button>
        </div>
      )}
    </div>
  )
}

// One queried leaf = fetch the group_by ranking, feed RankingRowsList.
function RankingLeafView({
  leaf,
  filters,
  columns,
  onRowClick,
}: {
  leaf: RankingLeaf
  filters: DeepLinkAnalyticsQueryParams
  columns: SortKey[]
  onRowClick?: (groupBy: DeepLinkRankingGroupBy, key: string) => void
}) {
  const { org_id } = useParams<{ org_id: string }>()
  const { data, isLoading } = useDeepLinkRanking(org_id, leaf.groupBy, filters)
  return (
    <RankingRowsList
      rows={data?.data ?? []}
      isLoading={isLoading}
      columns={columns}
      groupBy={leaf.groupBy}
      onRowClick={onRowClick}
    />
  )
}

export function DeepLinkRankingCard({
  title,
  filters,
  tabs,
  columns,
  onRowClick,
}: DeepLinkRankingCardProps) {
  return (
    <Card className="overflow-hidden rounded-lg">
      <Tabs defaultValue={tabs[0].value} className="w-full">
        <div className="mx-6 mt-5 border-b border-slate-200">
          <p className="mb-2 text-sm font-medium text-slate-700">{title}</p>
          <TabsList variant="outline" className="w-full justify-start">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} variant="outline" value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {tabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-0">
            {hasSub(tab) ? (
              <Tabs defaultValue={tab.subTabs[0].value} className="w-full">
                <div className="px-6 pt-3">
                  <TabsList className="h-9 w-full justify-start rounded-lg p-0.5">
                    {tab.subTabs.map((s) => (
                      <TabsTrigger
                        key={s.value}
                        value={s.value}
                        className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
                      >
                        {s.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
                {tab.subTabs.map((s) => (
                  <TabsContent key={s.value} value={s.value} className="mt-0">
                    <RankingLeafView
                      leaf={s}
                      filters={filters}
                      columns={columns}
                      onRowClick={onRowClick}
                    />
                  </TabsContent>
                ))}
              </Tabs>
            ) : hasContent(tab) ? (
              tab.content
            ) : (
              <RankingLeafView
                leaf={tab}
                filters={filters}
                columns={columns}
                onRowClick={onRowClick}
              />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </Card>
  )
}
