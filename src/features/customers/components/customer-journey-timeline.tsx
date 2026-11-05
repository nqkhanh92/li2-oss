'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useGetCustomerJourney, useGetSessionPageviews, JourneyNode } from '../hooks/queries'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/shared/components/ui/collapsible'
import {
  formatCurrencyFromCents,
  normalizeCurrency,
  SupportedCurrency,
} from '@/shared/lib/currency'
import { format } from 'date-fns'
import {
  MousePointer,
  UserPlus,
  ShoppingCart,
  Clock,
  Sparkles,
  TrendingUp,
  MapPin,
  Info,
  Monitor,
  Smartphone,
  Tablet,
  Laptop,
  ChevronDown,
  FileText,
  Zap,
  Globe,
  Timer,
  ArrowRight,
  Play,
  Eye,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/shared/lib/utils'

interface CustomerJourneyTimelineProps {
  customerId: string
  defaultCurrency: SupportedCurrency
}

const nodeConfig = {
  first_visit: {
    icon: MousePointer,
    gradient: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-500',
    lightBg: 'bg-blue-50 dark:bg-blue-950/30',
    textColor: 'text-blue-600 dark:text-blue-400',
    borderColor: 'border-blue-200 dark:border-blue-800',
    labelKey: 'detail.journey.first_visit',
    defaultLabel: 'First Visit',
  },
  session: {
    icon: Monitor,
    gradient: 'from-amber-500 to-orange-500',
    bgColor: 'bg-amber-500',
    lightBg: 'bg-amber-50 dark:bg-amber-950/30',
    textColor: 'text-amber-600 dark:text-amber-400',
    borderColor: 'border-amber-200 dark:border-amber-800',
    labelKey: 'detail.journey.session',
    defaultLabel: 'Browsing Session',
  },
  lead: {
    icon: UserPlus,
    gradient: 'from-violet-500 to-purple-500',
    bgColor: 'bg-violet-500',
    lightBg: 'bg-violet-50 dark:bg-violet-950/30',
    textColor: 'text-violet-600 dark:text-violet-400',
    borderColor: 'border-violet-200 dark:border-violet-800',
    labelKey: 'detail.journey.lead',
    defaultLabel: 'Lead',
  },
  sale: {
    icon: ShoppingCart,
    gradient: 'from-emerald-500 to-teal-500',
    bgColor: 'bg-emerald-500',
    lightBg: 'bg-emerald-50 dark:bg-emerald-950/30',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    labelKey: 'detail.journey.sale',
    defaultLabel: 'Sale',
  },
  // Timeline v1 (`customer-detail.tsx`) không còn trang nào trỏ tới, nhưng vẫn được build nên
  // vẫn phải phủ hết `JourneyNode['type']`. Thiếu khoá là `config` thành `undefined` lúc chạy.
  artifact_view: {
    icon: Eye,
    gradient: 'from-blue-500 to-indigo-500',
    bgColor: 'bg-blue-500',
    lightBg: 'bg-blue-50 dark:bg-blue-950/30',
    textColor: 'text-blue-600 dark:text-blue-400',
    borderColor: 'border-blue-200 dark:border-blue-800',
    labelKey: 'detail.journey.artifact_view',
    defaultLabel: 'Opened content',
  },
}

function formatDuration(ms: number | null | undefined): string {
  if (!ms) return '—'
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

function DeviceIcon({ deviceType }: { deviceType: string | null | undefined }) {
  const lower = (deviceType ?? '').toLowerCase()
  if (lower.includes('mobile') || lower.includes('phone')) return <Smartphone className="h-3 w-3" />
  if (lower.includes('tablet')) return <Tablet className="h-3 w-3" />
  if (lower.includes('laptop')) return <Laptop className="h-3 w-3" />
  return <Monitor className="h-3 w-3" />
}

function OsChip({ os }: { os: string | null | undefined }) {
  if (!os) return null
  const lower = os.toLowerCase()
  const color = lower.includes('windows')
    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
    : lower.includes('mac') || lower.includes('ios') || lower.includes('iphone') || lower.includes('ipad')
      ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
      : lower.includes('android')
        ? 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
        : lower.includes('linux')
          ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800'
          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
  return (
    <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-medium leading-none', color)}>
      {os}
    </span>
  )
}

function DeviceChip({
  deviceType,
  browser,
}: {
  deviceType: string | null | undefined
  browser: string | null | undefined
}) {
  if (!deviceType && !browser) return null
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-400">
      <DeviceIcon deviceType={deviceType} />
      {[browser, deviceType].filter(Boolean).join(' · ')}
    </span>
  )
}

export function CustomerJourneyTimeline({
  customerId,
  defaultCurrency,
}: CustomerJourneyTimelineProps) {
  const { org_id } = useParams<{ org_id: string }>()
  const { t } = useTranslation('customers')
  const { data, isLoading } = useGetCustomerJourney(org_id, customerId)

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="p-5">
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!data || data.timeline.length === 0) {
    return (
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">
            {t('detail.journey.title', 'Customer Journey')}
          </h3>
        </div>
        <div className="p-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 mb-4">
            <MapPin className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('detail.journey.no_events', 'No conversion events yet')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">
            {t('detail.journey.title', 'Customer Journey')}
          </h3>
          {data.metrics.timeToSale !== null && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                {t('detail.journey.days_to_sale', '{{days}}d to sale', {
                  days: data.metrics.timeToSale,
                })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="p-5">
        <div className="relative">
          {/* Gradient connector line */}
          <div className="absolute left-6 top-6 bottom-6 w-0.5">
            <div className="h-full w-full bg-gradient-to-b from-blue-300 via-violet-300 to-emerald-300 dark:from-blue-700 dark:via-violet-700 dark:to-emerald-700 rounded-full" />
          </div>

          {/* Timeline nodes */}
          <div className="space-y-6">
            {data.timeline.map((node, index) =>
              node.type === 'session' ? (
                <SessionTimelineNode
                  key={`session-${node.data.sessionId ?? index}`}
                  node={node}
                  index={index}
                />
              ) : (
                <TimelineNode
                  key={`${node.type}-${index}`}
                  node={node}
                  index={index}
                  defaultCurrency={defaultCurrency}
                />
              )
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function TimelineNode({
  node,
  index,
  defaultCurrency,
}: {
  node: JourneyNode
  index: number
  defaultCurrency: SupportedCurrency
}) {
  const { t } = useTranslation('customers')
  const config = nodeConfig[node.type]
  const Icon = config.icon
  const isSale = node.type === 'sale'
  const hasAmount = isSale && node.data.amount != null
  const hasMetadata = node.data.metadata && Object.keys(node.data.metadata).length > 0

  return (
    <div
      className={cn('relative flex gap-4 animate-in fade-in slide-in-from-left-4', 'group')}
      style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'backwards' }}
    >
      {/* Node circle */}
      <div className="relative z-10 shrink-0">
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-lg transition-transform duration-300 group-hover:scale-110',
            `bg-gradient-to-br ${config.gradient}`
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        {/* Glow effect on hover */}
        <div
          className={cn(
            'absolute inset-0 rounded-xl blur-lg opacity-0 group-hover:opacity-40 transition-opacity duration-300',
            config.bgColor
          )}
        />
      </div>

      {/* Content Card */}
      <div
        className={cn(
          'flex-1 min-w-0 rounded-xl border p-4 transition-all duration-300',
          config.lightBg,
          config.borderColor,
          'group-hover:shadow-md group-hover:-translate-y-0.5'
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <div className="flex items-center gap-2">
                <span className={cn('font-semibold', config.textColor)}>
                  {node.data.eventName || t(config.labelKey, config.defaultLabel)}
                </span>
                {isSale && hasAmount && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    <Sparkles className="h-3 w-3" />
                    {formatCurrencyFromCents(
                      node.data.amount!,
                      node.data.currency ? normalizeCurrency(node.data.currency) : defaultCurrency
                    )}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {format(new Date(node.date), 'MMM d, yyyy · h:mm a')}
                </span>
                {node.touchPoint && (
                  <span className="flex items-center gap-1">
                    <MousePointer className="h-3.5 w-3.5" />
                    <span className="truncate max-w-[150px]">{node.touchPoint}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Metadata Popover */}
            {hasMetadata && (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors shadow-sm"
                  >
                    <Info className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                    {t('detail.view_metadata', 'View metadata')}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="start">
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('detail.metadata', 'Metadata')}
                    </h4>
                    <div className="space-y-1.5">
                      {Object.entries(node.data.metadata!).map(([key, value]) => {
                        const valueString =
                          typeof value === 'object' ? JSON.stringify(value) : String(value)
                        return (
                          <div
                            key={key}
                            className="flex items-start gap-2 px-2.5 py-1.5 rounded-md bg-slate-50 dark:bg-slate-800/50 text-xs"
                          >
                            <span className="font-semibold text-slate-600 dark:text-slate-400 shrink-0">
                              {key}:
                            </span>
                            <span
                              title={valueString}
                              className="text-slate-700 dark:text-slate-300 break-words"
                            >
                              {valueString}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function SessionTimelineNode({ node, index }: { node: JourneyNode; index: number }) {
  const { t } = useTranslation('customers')
  const { org_id, customer_id } = useParams<{ org_id: string; customer_id: string }>()
  const [isOpen, setIsOpen] = useState(false)
  const config = nodeConfig.session
  const Icon = config.icon

  const { data: detail, isLoading } = useGetSessionPageviews(
    org_id,
    customer_id,
    node.data.sessionId ?? '',
    isOpen
  )

  const pageviewCount = node.data.pageviewCount ?? 0
  const isBounce = node.data.isBounce ?? false
  const hasExitPage = node.data.exitPage && node.data.exitPage !== node.data.entryPage

  return (
    <div
      className={cn('relative flex gap-4 animate-in fade-in slide-in-from-left-4 group')}
      style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'backwards' }}
    >
      {/* Node circle */}
      <div className="relative z-10 shrink-0">
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-lg transition-transform duration-300 group-hover:scale-110',
            `bg-gradient-to-br ${config.gradient}`
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div
          className={cn(
            'absolute inset-0 rounded-xl blur-lg opacity-0 group-hover:opacity-40 transition-opacity duration-300',
            config.bgColor
          )}
        />
      </div>

      {/* Content Card */}
      <div
        className={cn(
          'flex-1 min-w-0 rounded-xl border transition-all duration-300',
          config.lightBg,
          config.borderColor,
          'group-hover:shadow-md group-hover:-translate-y-0.5'
        )}
      >
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          {/* Summary — always visible */}
          <CollapsibleTrigger asChild>
            <button className="w-full px-4 pt-3.5 pb-3 text-left">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2">

                  {/* Title row */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={cn('text-sm font-semibold', config.textColor)}>
                      {t(config.labelKey, config.defaultLabel)}
                    </span>
                    {isBounce && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-700 bg-amber-100/70 dark:bg-amber-900/40 text-[10px] font-semibold text-amber-700 dark:text-amber-400 leading-none">
                        {t('detail.journey.bounced', 'Bounced')}
                      </span>
                    )}
                  </div>

                  {/* Stats row */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(node.date), 'MMM d, yyyy · h:mm a')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Timer className="h-3 w-3" />
                      {formatDuration(node.data.durationMs)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      {pageviewCount} {t('detail.journey.pages', 'pages')}
                    </span>
                  </div>

                  {/* Device + OS chips */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <DeviceChip deviceType={node.data.deviceType} browser={node.data.browser} />
                    <OsChip os={node.data.os ?? null} />
                  </div>

                  {/* Entry → Exit path */}
                  {node.data.entryPage && (
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 dark:text-slate-500">
                      <span className="truncate max-w-[140px]">{node.data.entryPage}</span>
                      {hasExitPage && (
                        <>
                          <ArrowRight className="h-3 w-3 shrink-0 text-slate-300 dark:text-slate-600" />
                          <span className="truncate max-w-[140px]">{node.data.exitPage}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <ChevronDown
                  className={cn(
                    'h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 mt-0.5',
                    isOpen && 'rotate-180'
                  )}
                />
              </div>
            </button>
          </CollapsibleTrigger>

          {/* View Replay button — outside trigger to avoid nested interactive elements */}
          {node.data.hasRecording && node.data.sessionId && (
            <div className="px-4 pb-3">
              <Link
                href={`/org/${org_id}/session-recordings/${node.data.sessionId}`}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors shadow-sm"
              >
                <Play className="h-3.5 w-3.5 fill-current text-slate-400 dark:text-slate-500" />
                {t('detail.journey.view_replay', 'View Replay')}
              </Link>
            </div>
          )}

          {/* Expanded pageview list */}
          <CollapsibleContent>
            <div className="mx-4 mb-3 rounded-lg border border-amber-200/70 dark:border-amber-800/50 overflow-hidden">
              {isLoading ? (
                <div className="p-3 space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Skeleton className="h-3.5 w-3.5 shrink-0 rounded" />
                      <Skeleton className="h-3.5 flex-1" />
                      <Skeleton className="h-3.5 w-8 shrink-0" />
                    </div>
                  ))}
                </div>
              ) : !detail?.pageviews?.length ? (
                <p className="text-xs text-slate-400 py-3 text-center">
                  {t('detail.journey.no_pageviews', 'No page views recorded')}
                </p>
              ) : (
                <div className="divide-y divide-amber-100 dark:divide-amber-900/40">
                  {detail.pageviews.map((pv, i) =>
                    pv.event_name ? (
                      // Captured event row
                      <div key={pv.id} className="flex items-center gap-2 px-3 py-2 bg-amber-50/60 dark:bg-amber-950/20">
                        <Zap className="h-3 w-3 shrink-0 text-amber-500" />
                        <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 truncate flex-1">
                          {pv.event_name}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 truncate max-w-[100px] shrink-0">
                          {pv.page_path}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {format(new Date(pv.timestamp), 'h:mm a')}
                        </span>
                      </div>
                    ) : (
                      // Page view row
                      <div key={pv.id} className="flex items-center gap-2 px-3 py-2 hover:bg-amber-50/40 dark:hover:bg-amber-950/10 transition-colors">
                        <span className="text-[10px] font-medium text-slate-400 dark:text-slate-600 w-4 shrink-0 text-right">
                          {i + 1}
                        </span>
                        <FileText className="h-3 w-3 shrink-0 text-slate-300 dark:text-slate-600" />
                        <div className="min-w-0 flex-1">
                          <span className="text-[11px] font-mono text-slate-600 dark:text-slate-300 truncate block">
                            {pv.page_path}
                          </span>
                          {pv.page_title && (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate block">
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
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  )
}
