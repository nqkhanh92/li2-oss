'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import {
  AlertCircle,
  ArrowLeft,
  Clock,
  Eye,
  FileText,
  Link2,
  MousePointerClick,
  QrCode,
} from 'lucide-react'
import dayjs from '@/shared/lib/dayjs'
import { cn } from '@/shared/lib/utils'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { AnonymousAvatar } from '@/shared/components/ui/anonymous-avatar'
import { countryCodeToFlag, getCountryName } from '@/shared/lib/location'
import { useGetDeviceActivity } from '../../hooks/queries'
import type { DeviceVisit } from '../../types'

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string | number
  icon: React.ElementType
}) {
  return (
    <div className="flex-1 min-w-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex flex-col gap-1 justify-center">
      <div className="flex items-center gap-2 w-full">
        <div className="flex items-center justify-center p-1.5 rounded-[4px] shrink-0 bg-blue-50 dark:bg-blue-900/20">
          <Icon className="h-3 w-3 text-secondary-blue" strokeWidth={1.5} />
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase flex-1 min-w-0">
          {label}
        </p>
      </div>
      <p className="text-base font-medium text-slate-700 dark:text-slate-300">{value}</p>
    </div>
  )
}

function VisitRow({ visit, org_id, isLast }: { visit: DeviceVisit; org_id: string; isLast: boolean }) {
  const { t } = useTranslation('customers')
  const isQr = visit.type === 'QR'
  const Icon = isQr ? QrCode : Link2

  return (
    <div className={cn('flex gap-3 px-3 py-3', !isLast && 'border-b border-slate-100 dark:border-slate-700')}>
      <Icon className="h-4 w-4 shrink-0 mt-0.5 text-slate-300 dark:text-slate-600" />
      <div className="min-w-0 flex-1 flex flex-col gap-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-s font-medium text-foreground dark:text-slate-200">
            {isQr
              ? t('device.visit.scanned_qr', 'Quét mã QR')
              : t('device.visit.clicked_link', 'Bấm link')}
          </span>
          {visit.touch_point && (
            <Link
              href={`/org/${org_id}/short-links/${visit.touch_point.id}`}
              className="text-xs text-slate-500 hover:text-primary transition-colors truncate max-w-[220px]"
            >
              {visit.touch_point.short_url || visit.touch_point.name}
            </Link>
          )}
        </div>
        {visit.artifact && (
          <Link
            href={`/org/${org_id}/artifacts/${visit.artifact.id}`}
            className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-primary transition-colors"
          >
            <FileText className="h-3 w-3 shrink-0" />
            <span className="truncate">{visit.artifact.name}</span>
          </Link>
        )}
        <div className="flex items-center gap-3 flex-wrap text-[10px] text-slate-400">
          <span>{dayjs(visit.created_at).format('MMM D, YYYY · h:mm A')}</span>
          {visit.country && (
            <span>
              {countryCodeToFlag(visit.country)} {getCountryName(visit.country)}
              {visit.city ? ` · ${visit.city}` : ''}
            </span>
          )}
          {visit.os && <span>{visit.os}</span>}
        </div>
      </div>
    </div>
  )
}

function DeviceNotFound({ org_id }: { org_id: string }) {
  const { t } = useTranslation('customers')
  const router = useRouter()

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
      <div className="p-6 rounded-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
        <AlertCircle className="h-10 w-10 text-red-500" />
      </div>
      <div className="text-center space-y-1">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          {t('device.not_found', 'Không tìm thấy thiết bị')}
        </h2>
        <p className="text-s text-slate-500 dark:text-slate-400">
          {t(
            'device.not_found_desc',
            'Không có lượt truy cập nào của thiết bị này trong tổ chức hiện tại.'
          )}
        </p>
      </div>
      <Button variant="outline" onClick={() => router.push(`/org/${org_id}/customers`)} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        {t('detail.back_to_list', 'Quay lại danh sách')}
      </Button>
    </div>
  )
}

/**
 * Trang chi tiết của một THIẾT BỊ ẩn danh — dựng từ `visits` nhóm theo `fp`, không có hàng nào
 * trong `customer_profiles`.
 *
 * ⚠ Hai điều trang này phải nói thẳng, vì không nói thì người đọc sẽ tự suy sai:
 * 1. `fp` là thiết bị, không phải người. Xoá cookie / đổi máy là một `fp` khác.
 * 2. Nếu cùng người đó cũng từng mở artifact bằng Google thì họ còn một hồ sơ riêng có email, và
 *    KHÔNG có cách nào chứng minh hai cái là một: `artifact_views` không lưu `fp`, `visits` không
 *    lưu `customer_profile_id`.
 */
export function DeviceDetail() {
  const { t } = useTranslation('customers')
  const { org_id, fp } = useParams<{ org_id: string; fp: string }>()
  const { data: activity, isLoading } = useGetDeviceActivity(org_id, fp)

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 animate-pulse">
        <Skeleton className="h-[120px] w-full rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[88px] rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[320px] w-full rounded-xl" />
      </div>
    )
  }

  if (!activity) return <DeviceNotFound org_id={org_id} />

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-300">
      <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <AnonymousAvatar fp={activity.fp} size={40} />
          <div className="min-w-0 flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-l font-semibold text-foreground dark:text-slate-200 truncate">
                {activity.display_name}
              </h1>
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 text-slate-500 border-slate-300 shrink-0"
              >
                {t('device.badge', 'Thiết bị ẩn danh')}
              </Badge>
            </div>
            <span className="text-xs text-slate-400 font-mono truncate">{activity.fp}</span>
          </div>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {t(
            'device.disclaimer',
            'Đây là dấu vết của một THIẾT BỊ, không phải một người: xoá cookie hoặc đổi máy sẽ tạo ra một thiết bị mới. Nếu người này cũng từng mở nội dung bằng tài khoản Google thì họ còn một hồ sơ riêng có email, và dữ liệu hiện tại không cho biết hai danh tính đó là một người.'
          )}
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-s text-slate-500 dark:text-slate-400">
          {activity.country && (
            <span>
              {countryCodeToFlag(activity.country)} {getCountryName(activity.country)}
            </span>
          )}
          {activity.os && <span>{activity.os}</span>}
          {activity.platform && <span>{activity.platform}</span>}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t('detail.content_viewed', 'Nội dung đã mở')}
          value={activity.content_count}
          icon={FileText}
        />
        <StatCard
          label={t('detail.total_opens', 'Tổng lượt mở')}
          value={activity.open_count}
          icon={Eye}
        />
        <StatCard
          label={t('device.visits', 'Lượt truy cập')}
          value={activity.visit_count}
          icon={MousePointerClick}
        />
        <StatCard
          label={t('detail.last_viewed', 'Lần mở gần nhất')}
          value={activity.last_seen_at ? dayjs(activity.last_seen_at).fromNow() : '—'}
          icon={Clock}
        />
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden flex flex-col gap-4">
        <div className="flex items-center justify-between pt-6 px-6">
          <h3 className="text-base font-medium text-slate-700 dark:text-slate-300">
            {t('device.history_title', 'Lịch sử truy cập')}
          </h3>
          <span className="text-xs text-slate-400">
            {t('device.history_count', '{{count}} lượt', { count: activity.visits.length })}
          </span>
        </div>
        <div className="pb-6 px-6 flex flex-col gap-2">
          {activity.visitsTruncated && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {t(
                'device.history_truncated',
                'Chỉ hiện các lượt gần nhất — thiết bị này có nhiều lượt hơn số đang hiển thị.'
              )}
            </p>
          )}
          <div className="rounded-md border border-slate-100 dark:border-slate-700">
            {activity.visits.map((visit, index) => (
              <VisitRow
                key={visit.id}
                visit={visit}
                org_id={org_id}
                isLast={index === activity.visits.length - 1}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
