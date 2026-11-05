'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import {
  MousePointerClick,
  UserPlus,
  ShoppingCart,
  Activity,
  Info,
  Play,
  ChevronDown,
  FileText,
  Zap,
  Timer,
  Eye,
} from 'lucide-react'
import dayjs from '@/shared/lib/dayjs'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/components/ui/collapsible'
import { cn } from '@/shared/lib/utils'
import { formatCurrencyFromCents, normalizeCurrency } from '@/shared/lib/currency'
import { useGetSessionPageviews } from '../../hooks/queries'
import type { JourneyNode, CustomerJourney } from '../../hooks/queries'

function getNodeIcon(type: JourneyNode['type']) {
  switch (type) {
    case 'sale':
      return { Icon: ShoppingCart, className: 'text-emerald-500' }
    case 'lead':
      return { Icon: UserPlus, className: 'text-violet-500' }
    case 'session':
      return { Icon: Activity, className: 'text-amber-500' }
    case 'artifact_view':
      return { Icon: Eye, className: 'text-secondary-blue' }
    case 'first_visit':
    default:
      return { Icon: MousePointerClick, className: 'text-secondary-blue' }
  }
}

function formatDuration(ms: number | null | undefined): string {
  if (!ms) return '—'
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

function DetailLabel({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wide leading-none">
        {label}
      </span>
      <span className="text-xs text-slate-600 dark:text-slate-400 truncate">{value}</span>
    </div>
  )
}

function MetadataButton({ metadata }: { metadata: Record<string, unknown> }) {
  const { t } = useTranslation('customers')
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center h-4 w-4 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Info className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="start">
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {t('detail.metadata', 'Metadata')}
          </h4>
          <div className="space-y-1.5">
            {Object.entries(metadata).map(([key, value]) => {
              const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value)
              return (
                <div
                  key={key}
                  className="flex items-start gap-2 px-2.5 py-1.5 rounded-md bg-slate-50 dark:bg-slate-800/50 text-xs"
                >
                  <span className="font-semibold text-slate-600 dark:text-slate-400 shrink-0">
                    {key}:
                  </span>
                  <span className="text-slate-700 dark:text-slate-300 break-words">{valueStr}</span>
                </div>
              )
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function SessionPageviewList({
  org_id,
  node,
  isOpen,
}: {
  org_id: string
  node: JourneyNode
  isOpen: boolean
}) {
  const { customer_id } = useParams<{ customer_id: string }>()
  const { t } = useTranslation('customers')
  const { data: detail, isLoading } = useGetSessionPageviews(
    org_id,
    customer_id,
    node.data.sessionId ?? '',
    isOpen
  )

  if (isLoading) {
    return (
      <div className="flex flex-col gap-1.5 pt-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-3 w-3 shrink-0 rounded" />
            <Skeleton className="h-3 flex-1" />
            <Skeleton className="h-3 w-8 shrink-0" />
          </div>
        ))}
      </div>
    )
  }

  if (!detail?.pageviews?.length) {
    return (
      <p className="text-xs text-slate-400 dark:text-slate-500 pt-2 text-center">
        {t('detail.journey.no_pageviews', 'No page views recorded')}
      </p>
    )
  }

  return (
    <div className="mt-2 rounded-md border border-slate-100 dark:border-slate-700 overflow-hidden">
      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {detail.pageviews.map((pv, i) =>
          pv.event_name ? (
            <div
              key={pv.id}
              className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/50"
            >
              <Zap className="h-3 w-3 shrink-0 text-amber-500" />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate flex-1">
                {pv.event_name}
              </span>
              <span className="text-[10px] font-mono text-slate-400 truncate max-w-[100px] shrink-0">
                {pv.page_path}
              </span>
              <span className="text-[10px] text-slate-400 shrink-0">
                {dayjs(pv.timestamp).format('h:mm A')}
              </span>
            </div>
          ) : (
            <div
              key={pv.id}
              className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <span className="text-[10px] text-slate-400 dark:text-slate-600 w-4 shrink-0 text-right">
                {i + 1}
              </span>
              <FileText className="h-3 w-3 shrink-0 text-slate-300 dark:text-slate-600" />
              <div className="min-w-0 flex-1 flex items-center gap-1.5 overflow-hidden">
                <span className="text-[11px] font-mono text-slate-600 dark:text-slate-300 truncate shrink-0 max-w-[40%]">
                  {pv.page_path}
                </span>
                {pv.page_title && (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                    {pv.page_title}
                  </span>
                )}
              </div>
              {pv.time_on_page ? (
                <span className="text-[10px] text-slate-400 shrink-0 whitespace-nowrap flex items-center gap-0.5">
                  <Timer className="h-2.5 w-2.5" />
                  {formatDuration(pv.time_on_page)}
                </span>
              ) : null}
            </div>
          )
        )}
      </div>
    </div>
  )
}

function SessionNode({
  node,
  isLast,
  org_id,
}: {
  node: JourneyNode
  isLast: boolean
  org_id: string
}) {
  const { t } = useTranslation('customers')
  const [isOpen, setIsOpen] = useState(false)
  const { Icon, className: iconClass } = getNodeIcon('session')
  const formattedTime = dayjs(node.date).format('MMM D, YYYY · h:mm A')

  return (
    <div className="flex gap-4">
      {/* Left column: icon + seamless connector */}
      <div className="flex flex-col items-center shrink-0">
        <Icon className={`h-5 w-5 shrink-0 ${iconClass}`} strokeWidth={1.5} />
        {!isLast && <div className="w-px flex-1 mt-1.5 bg-slate-200 dark:bg-slate-700" />}
      </div>

      {/* Right column */}
      <div className={cn('flex flex-col gap-1.5 flex-1 min-w-0', !isLast && 'pb-4')}>
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="flex flex-col gap-1.5">
          {/* Label row with expand toggle + replay button */}
          <div className="flex items-center gap-1.5">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1 hover:opacity-70 transition-opacity"
              >
                <span className="text-s font-medium text-foreground dark:text-slate-200 leading-5">
                  {node.data.eventName ?? t('detail.journey.session', 'Session')}
                </span>
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 text-slate-400 transition-transform duration-200',
                    isOpen && 'rotate-180'
                  )}
                />
              </button>
            </CollapsibleTrigger>
            {node.data.hasRecording && node.data.sessionId && (
              <Link
                href={`/org/${org_id}/session-recordings/${node.data.sessionId}`}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[10px] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <Play className="h-2.5 w-2.5 fill-current text-amber-500" />
                {t('detail.journey.view_replay', 'View Replay')}
              </Link>
            )}
          </div>

          {/* Detail labels */}
          <div className="flex items-start gap-4 flex-wrap">
            <DetailLabel label={t('detail.journey.time', 'Time')} value={formattedTime} />
            {node.data.entryPage && (
              <DetailLabel
                label={t('detail.journey.entry_page', 'Entry page')}
                value={node.data.entryPage}
              />
            )}
            {node.data.durationMs != null && (
              <DetailLabel
                label={t('detail.journey.duration', 'Duration')}
                value={formatDuration(node.data.durationMs)}
              />
            )}
            {node.data.pageviewCount != null && (
              <DetailLabel
                label={t('detail.journey.pages', 'Pages')}
                value={String(node.data.pageviewCount)}
              />
            )}
          </div>

          {/* Pageview list (expanded) */}
          <CollapsibleContent>
            <SessionPageviewList org_id={org_id} node={node} isOpen={isOpen} />
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  )
}

function JourneyList({ nodes, org_id }: { nodes: JourneyNode[]; org_id: string }) {
  const { t } = useTranslation('customers')

  if (nodes.length === 0) {
    return (
      <p className="text-xs text-slate-400 dark:text-slate-500 py-2 text-center">
        {t('detail.journey.empty', 'No journey events')}
      </p>
    )
  }

  return (
    <div className="flex flex-col">
      {nodes.map((node, idx) => {
        const isLast = idx === nodes.length - 1

        if (node.type === 'session') {
          return <SessionNode key={idx} node={node} isLast={isLast} org_id={org_id} />
        }

        const { Icon, className: iconClass } = getNodeIcon(node.type)
        const label =
          node.type === 'first_visit'
            ? t('detail.journey.first_visit', 'First Visit')
            : node.type === 'artifact_view'
              ? t('detail.journey.artifact_view', 'Đã mở nội dung')
              : node.type === 'lead'
                ? (node.data.eventName ?? t('detail.journey.lead', 'Lead'))
                : (node.data.eventName ?? t('detail.journey.sale', 'Sale'))

        const formattedTime = dayjs(node.date).format('MMM D, YYYY · h:mm A')
        const hasMetadata =
          (node.type === 'lead' || node.type === 'sale') &&
          node.data.metadata &&
          Object.keys(node.data.metadata).length > 0

        return (
          <div key={idx} className="flex gap-4">
            {/* Left column: icon + seamless connector */}
            <div className="flex flex-col items-center shrink-0">
              <Icon className={`h-5 w-5 shrink-0 ${iconClass}`} strokeWidth={1.5} />
              {!isLast && <div className="w-px flex-1 mt-1.5 bg-slate-200 dark:bg-slate-700" />}
            </div>

            {/* Right column */}
            <div className={cn('flex flex-col gap-1.5 flex-1 min-w-0', !isLast && 'pb-4')}>
              <div className="flex items-center gap-1.5">
                <span className="text-s font-medium text-foreground dark:text-slate-200 leading-5">
                  {label}
                </span>
                {hasMetadata && <MetadataButton metadata={node.data.metadata!} />}
              </div>

              <div className="flex items-start gap-4 flex-wrap">
                <DetailLabel label={t('detail.journey.time', 'Time')} value={formattedTime} />

                {/*
                  Một node = một hàng `artifact_views`, đặt ở `first_viewed_at`. Bảng đó chỉ giữ
                  tổng `view_count` nên "mở lần đầu / mở N lần / gần nhất" là tất cả những gì nói
                  được; không có mốc của từng lần mở ở giữa.
                */}
                {node.type === 'artifact_view' && (
                  <>
                    <DetailLabel
                      label={t('detail.journey.content', 'Nội dung')}
                      value={node.data.artifactName ?? '—'}
                    />
                    <DetailLabel
                      label={t('detail.journey.opens', 'Số lần mở')}
                      value={String(node.data.openCount ?? 0)}
                    />
                    {node.data.lastViewedAt && (
                      <DetailLabel
                        label={t('detail.journey.last_opened', 'Mở gần nhất')}
                        value={dayjs(node.data.lastViewedAt).format('MMM D, YYYY · h:mm A')}
                      />
                    )}
                  </>
                )}

                {node.type === 'first_visit' && node.touchPoint && (
                  <DetailLabel
                    label={t('detail.journey.short_link', 'Short link')}
                    value={node.touchPoint}
                  />
                )}

                {node.type === 'sale' && node.data.amount != null && (
                  <DetailLabel
                    label={t('detail.journey.amount', 'Amount')}
                    value={formatCurrencyFromCents(
                      node.data.amount,
                      node.data.currency ? normalizeCurrency(node.data.currency) : 'VND'
                    )}
                  />
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

interface JourneyTimelineCardProps {
  journey: CustomerJourney | undefined
  isLoading: boolean
}

export function JourneyTimelineCard({ journey, isLoading }: JourneyTimelineCardProps) {
  const { t } = useTranslation('customers')
  const { org_id } = useParams<{ org_id: string }>()

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] overflow-hidden flex flex-col gap-4">
      <div className="flex items-center pt-6 px-6">
        <h3 className="text-base font-medium text-slate-700 dark:text-slate-300">
          {t('detail.journey.title', 'Customer Journey')}
        </h3>
      </div>

      <div className="pb-6 px-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <JourneyList nodes={journey?.timeline ?? []} org_id={org_id} />
        )}
      </div>
    </div>
  )
}
