'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card'
import { Switch } from '@/shared/components/ui/switch'
import { RealtimeInteractionsList } from '@/features/realtime-data/components/realtime-interactions-list'
import { type RealtimeTouchpoint } from '@/features/realtime-data/components/columns'
import { useRealtimeInteractionsInfinite } from '@/features/realtime-data/hooks/use-realtime-interactions-infinite'
import { useOrganizationStore } from '@/shared/stores/organization-store'
import { cn } from '@/shared/lib/utils'
import dayjs from '@/shared/lib/dayjs'

// ─── Action badge config ──────────────────────────────────────────────────────
type ChannelType = 'LINK' | 'QR' | 'NFC'

const ACTION_CONFIG: Record<
  ChannelType,
  { label: string; dotClass: string; bgClass: string; textClass: string }
> = {
  LINK: {
    label: 'click',
    dotClass: 'bg-green-600',
    bgClass: 'bg-green-50',
    textClass: 'text-green-800',
  },
  QR: {
    label: 'scan',
    dotClass: 'bg-cyan-500',
    bgClass: 'bg-cyan-50',
    textClass: 'text-cyan-600',
  },
  NFC: {
    label: 'tap',
    dotClass: 'bg-pink-500',
    bgClass: 'bg-pink-50',
    textClass: 'text-pink-700',
  },
}

// ─── Figma token mapping ──────────────────────────────────────────────────────
// text-s  = 14px  (--text-s: 0.875rem)
// text-xs = 12px  (--text-xs: 0.75rem)
// leading-5 = 20px  |  leading-4 = 16px

// ─── Table header ─────────────────────────────────────────────────────────────
// Header cols: 14px / 500 / leading-20px / slate-500
const TableHeader = ({ t }: { t: (key: string) => string }) => (
  <div className="flex gap-1.5 items-center py-2 border-b border-slate-50 w-full shrink-0">
    <div className="flex-1 min-w-0 px-2 py-1">
      <span className="text-s font-medium leading-5 text-slate-500">
        {t('recent_activities.columns.link_name')}
      </span>
    </div>
    <div className="w-[70px] px-2 py-1 flex justify-center">
      <span className="text-s font-medium leading-5 text-slate-500">
        {t('recent_activities.columns.action')}
      </span>
    </div>
    <div className="flex-1 px-2 py-1 flex justify-center">
      <span className="text-s font-medium leading-5 text-slate-500">
        {t('recent_activities.columns.country')}
      </span>
    </div>
    <div className="flex-1 px-2 py-1 flex justify-center">
      <span className="text-s font-medium leading-5 text-slate-500 text-center">
        {t('recent_activities.columns.platform')}
      </span>
    </div>
    <div className="flex-1 px-2 py-1 flex justify-center">
      <span className="text-s font-medium leading-5 text-slate-500 text-center">
        {t('recent_activities.columns.ip')}
      </span>
    </div>
    <div className="flex-1 px-2 py-1 flex justify-center">
      <span className="text-s font-medium leading-5 text-slate-500 text-center">
        {t('recent_activities.columns.time')}
      </span>
    </div>
  </div>
)

// ─── Desktop row ──────────────────────────────────────────────────────────────
// Row cells: link-name/platform/ip/time → 14px / 400 / leading-20px / slate-500
//            country → 12px / 400 / leading-16px / slate-500
//            badge label → 12px / 500 / leading-16px
const DesktopRow = ({
  item,
  t,
  onNameClick,
}: {
  item: RealtimeTouchpoint
  t: (key: string) => string
  onNameClick: (touchpointId: string) => void
}) => {
  const channel = (item.channel ?? 'LINK') as ChannelType
  const cfg = ACTION_CONFIG[channel] ?? ACTION_CONFIG.LINK
  const platform = [item.platform, item.os].filter(Boolean).join('/ ')

  return (
    <div className="flex gap-1.5 items-center h-[50px] py-1 border-b border-slate-200 w-full bg-card">
      {/* Link name — 14px regular */}
      <div className="flex-1 min-w-0 px-2 overflow-hidden">
        <span
          className="text-s font-normal leading-5 text-slate-500 truncate block cursor-pointer hover:text-primary hover:underline"
          data-title={item.touchpoint_name || '—'}
          title={item.touchpoint_name || '—'}
          onClick={() => onNameClick(item.touchpoint_id)}
        >
          {item.touchpoint_name || '—'}
        </span>
      </div>

      {/* Action badge — dot + 12px medium */}
      <div className="w-[70px] flex justify-center">
        <span
          className={cn(
            'inline-flex items-center gap-1 px-3 py-1 rounded-full whitespace-nowrap',
            'text-xs font-medium leading-4',
            cfg.bgClass,
            cfg.textClass
          )}
        >
          <span className={cn('size-2 rounded-full shrink-0', cfg.dotClass)} />
          {t(`recent_activities.actions.${cfg.label}`)}
        </span>
      </div>

      {/* Country — 12px regular */}
      <div className="flex-1 px-2 flex justify-center">
        <span className="text-xs font-normal leading-4 text-slate-500 whitespace-nowrap">
          {item.country || '—'}
        </span>
      </div>

      {/* Platform — 14px regular */}
      <div className="flex-1 px-2 flex justify-center overflow-hidden">
        <span className="text-s font-normal leading-5 text-slate-500 truncate">
          {platform || '—'}
        </span>
      </div>

      {/* IP — 14px regular */}
      <div className="flex-1 px-2 flex justify-center overflow-hidden">
        <span className="text-s font-normal leading-5 text-slate-500 truncate">
          {item.ip || '—'}
        </span>
      </div>

      {/* Time — 14px regular */}
      <div className="flex-1 px-2 flex justify-center">
        <span className="text-s font-normal leading-5 text-slate-500 whitespace-nowrap">
          {item.created_at ? dayjs(item.created_at).fromNow() : '—'}
        </span>
      </div>
    </div>
  )
}

// ─── Mobile row ───────────────────────────────────────────────────────────────
const MobileRow = ({
  item,
  t,
  onNameClick,
}: {
  item: RealtimeTouchpoint
  t: (key: string) => string
  onNameClick: (touchpointId: string) => void
}) => {
  const channel = (item.channel ?? 'LINK') as ChannelType
  const cfg = ACTION_CONFIG[channel] ?? ACTION_CONFIG.LINK
  const platform = [item.platform, item.os].filter(Boolean).join('/ ')

  return (
    <div className="flex flex-col gap-1 py-3 px-2 border-b border-slate-200 bg-card">
      <div className="flex items-center justify-between gap-2">
        <span
          className="text-s font-normal leading-5 text-slate-500 truncate flex-1 cursor-pointer hover:text-primary hover:underline"
          data-title={item.touchpoint_name || '—'}
          title={item.touchpoint_name || '—'}
          onClick={() => onNameClick(item.touchpoint_id)}
        >
          {item.touchpoint_name || '—'}
        </span>
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2.5 py-1 rounded-full shrink-0',
            'text-xs font-medium leading-4',
            cfg.bgClass,
            cfg.textClass
          )}
        >
          <span className={cn('size-2 rounded-full', cfg.dotClass)} />
          {t(`recent_activities.actions.${cfg.label}`)}
        </span>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-normal leading-4 text-slate-500">{item.country || '—'}</span>
        <span className="text-xs font-normal leading-4 text-slate-500">{platform || '—'}</span>
        <span className="text-xs font-normal leading-4 text-slate-500">{item.ip || '—'}</span>
        <span className="text-xs font-normal leading-4 text-slate-500 ml-auto">
          {item.created_at ? dayjs(item.created_at).fromNow() : '—'}
        </span>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export const DashboardRecentActivities = () => {
  const { org_id } = useParams<{ org_id: string }>()
  const { t } = useTranslation('dashboard')
  const [autoUpdate, setAutoUpdate] = useState(false)
  const router = useRouter()
  const { organization } = useOrganizationStore()
  const orgSlug = organization?.org_slug ?? org_id

  const handleNameClick = (touchpointId: string) => {
    router.push(`/org/${orgSlug}/touch-points/${touchpointId}`)
  }

  const {
    data: listPages,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useRealtimeInteractionsInfinite({
    p_last_hours: 24,
    p_organization_id: org_id,
    pageSize: 10,
  })

  const listData = useMemo(() => {
    if (!listPages?.pages) return []
    return listPages.pages.flatMap((page) => page.data)
  }, [listPages])

  const totalCount = listPages?.pages?.[0]?.rowCount ?? 0

  // Auto-update every 10 seconds
  useEffect(() => {
    if (!autoUpdate) return
    const interval = setInterval(() => refetch(), 10_000)
    return () => clearInterval(interval)
  }, [autoUpdate, refetch])

  return (
    <Card className="w-full bg-card border border-slate-300 rounded-2xl flex flex-col overflow-hidden">
      {/* Header: title + subtitle + toggle stacked */}
      <CardHeader className="px-6 pt-6 pb-4 flex flex-col gap-4">
        <div className="flex flex-col gap-0.5">
          {/* Title — 16px / 500 / slate-700 */}
          <span className="text-base font-medium leading-6 text-slate-700">
            {t('recent_activities.label')}
          </span>
          {/* Subtitle — 14px / 400 / slate-500 */}
          <span className="text-s font-normal leading-5 text-slate-500">
            {t('recent_activities.subtitle', { count: totalCount })}
          </span>
        </div>

        {/* Auto-update toggle — 14px / 400 / slate-500 */}
        <div className="flex items-center gap-[9px]">
          <Switch
            id="auto-update"
            checked={autoUpdate}
            onCheckedChange={setAutoUpdate}
          />
          <span
            className="text-s font-normal leading-5 text-slate-500 cursor-pointer"
            onClick={() => setAutoUpdate((v) => !v)}
          >
            {t('recent_activities.auto_update')}
          </span>
        </div>
      </CardHeader>

      {/* Table */}
      <CardContent className="px-6 pb-6 pt-0 flex flex-col flex-1 min-h-0">
        {/* Column headers — hidden on mobile */}
        <div className="hidden md:block">
          <TableHeader t={t} />
        </div>

        {/* Virtualized rows */}
        <RealtimeInteractionsList
          data={listData}
          isLoading={isLoading}
          isFetchingNextPage={isFetchingNextPage}
          hasNextPage={hasNextPage}
          onFetchNextPage={fetchNextPage}
          containerClassName="h-[300px]"
          renderRow={(item, isMobile) =>
            isMobile ? (
              <MobileRow key={item.id} item={item} t={t} onNameClick={handleNameClick} />
            ) : (
              <DesktopRow key={item.id} item={item} t={t} onNameClick={handleNameClick} />
            )
          }
        />
      </CardContent>
    </Card>
  )
}
