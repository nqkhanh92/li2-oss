'use client'

import { useTranslation } from 'react-i18next'
import {
  DollarSign,
  Eye,
  FileText,
  Hourglass,
  Clock,
  MousePointerClick,
  ShoppingCart,
} from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { disabledFeatures } from '@/shared/constants/disabled-features'
import { formatCurrencyFromCents, type SupportedCurrency } from '@/shared/lib/currency'
import dayjs from '@/shared/lib/dayjs'
import type { JourneyMetrics } from '../../hooks/queries'
import type { ContentView, CustomerProfile } from '../../types'

interface StatCardProps {
  label: string
  value: string | number
  icon: React.ElementType
  iconBg: string
  iconColor: string
}

function StatCard({ label, value, icon: Icon, iconBg, iconColor }: StatCardProps) {
  return (
    <div className="flex-1 min-w-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex flex-col gap-1 justify-center">
      {/* Title row: icon + label */}
      <div className="flex items-center gap-2 w-full">
        <div
          className={cn('flex items-center justify-center p-1.5 rounded-[4px] shrink-0', iconBg)}
        >
          <Icon className={cn('h-3 w-3', iconColor)} strokeWidth={1.5} />
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase flex-1 min-w-0">
          {label}
        </p>
      </div>
      {/* Value row */}
      <div className="flex items-start gap-1 w-full">
        <p className="text-base font-medium text-slate-700 dark:text-slate-300 flex-1 min-w-0">
          {value}
        </p>
      </div>
    </div>
  )
}

interface StatCardsRowProps {
  customer: CustomerProfile
  views: ContentView[]
  metrics: JourneyMetrics | null
  defaultCurrency: SupportedCurrency
  usdToVndRate: number
}

/**
 * Bốn số của một khách — bộ NỘI DUNG hoặc bộ THƯƠNG MẠI, tuỳ `disabledFeatures.CONVERSIONS`.
 *
 * Bộ thương mại (Lifetime Value / Total Sales / Time to Sale / Time to Lead) là bốn số của một CRM
 * bán hàng, và cả bốn đều rỗng trên dữ liệu thật của LiHi (mọi cột `total_revenue*`, `lead_count`,
 * `sale_count` đều 0). Hiện `$0.00` ở đầu trang là nói sai về mục đích sản phẩm.
 *
 * ★ Chủ sản phẩm chốt 2026-11-01: **ẩn, KHÔNG xoá.** Nên cả hai bộ ở lại trong file này và cùng
 * một cờ env quyết định bộ nào hiện — `NEXT_PUBLIC_DISABLE_CONVERSIONS` (true trên LiHi). Ngày
 * nào Li2 bán hàng thì đổi env là bộ thương mại trở lại, không phải viết lại từ git history.
 *
 * ⚠ CSV thì KHÔNG theo cờ này — xem ghi chú nợ ở `customers/export/route.ts`. Ba cột Leads /
 * Sales / Revenue đi từ `customer_profiles`, mà `contentAudienceService` không select chúng, nên
 * bật cờ lại sẽ có bốn thẻ thương mại nhưng file tải về vẫn thiếu ba cột đó.
 */
export function StatCardsRow({
  customer,
  views,
  metrics,
  defaultCurrency,
  usdToVndRate,
}: StatCardsRowProps) {
  const { t } = useTranslation('customers')

  const openCount = views.reduce((total, view) => total + view.open_count, 0)
  const lastViewedAt = views.reduce<string | null>(
    (latest, view) =>
      view.last_viewed_at && (!latest || view.last_viewed_at > latest)
        ? view.last_viewed_at
        : latest,
    null
  )

  if (!disabledFeatures.CONVERSIONS) {
    const usdCents = customer.total_revenue_usd || 0
    const vndDong = customer.total_revenue_vnd || 0
    let displayAmount: number
    if (defaultCurrency === 'USD') {
      const vndInUsdCents = usdToVndRate > 0 ? Math.round((vndDong / usdToVndRate) * 100) : 0
      displayAmount = usdCents + vndInUsdCents
    } else {
      const usdInVndDong = Math.round((usdCents / 100) * usdToVndRate)
      displayAmount = vndDong + usdInVndDong
    }

    const timeToSale =
      metrics?.timeToSale != null
        ? metrics.timeToSale === 0
          ? t('detail.same_day', 'Same day')
          : `${metrics.timeToSale} ${t('detail.days', 'days')}`
        : '—'

    const timeToLead =
      metrics?.timeToLead != null
        ? metrics.timeToLead < 60
          ? `${metrics.timeToLead} ${t('detail.mins', 'min')}`
          : `${Math.round(metrics.timeToLead / 60)} ${t('detail.hrs', 'hrs')}`
        : '—'

    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t('detail.ltv', 'Lifetime Value')}
          value={formatCurrencyFromCents(displayAmount, defaultCurrency)}
          icon={DollarSign}
          iconBg="bg-green-50 dark:bg-green-900/20"
          iconColor="text-green-600 dark:text-green-400"
        />
        <StatCard
          label={t('detail.total_sales', 'Total Sales')}
          value={customer.sale_count ?? 0}
          icon={ShoppingCart}
          iconBg="bg-violet-50 dark:bg-violet-900/20"
          iconColor="text-violet-600 dark:text-violet-400"
        />
        <StatCard
          label={t('detail.time_to_sale', 'Time to Sale')}
          value={timeToSale}
          icon={Clock}
          iconBg="bg-blue-50 dark:bg-blue-900/20"
          iconColor="text-secondary-blue"
        />
        <StatCard
          label={t('detail.time_to_lead', 'Time to Lead')}
          value={timeToLead}
          icon={Hourglass}
          iconBg="bg-orange-50 dark:bg-orange-900/20"
          iconColor="text-orange-600 dark:text-orange-400"
        />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label={t('detail.content_viewed', 'Nội dung đã mở')}
        value={views.length}
        icon={FileText}
        iconBg="bg-blue-50 dark:bg-blue-900/20"
        iconColor="text-secondary-blue"
      />
      <StatCard
        label={t('detail.total_opens', 'Tổng lượt mở')}
        value={openCount}
        icon={Eye}
        iconBg="bg-violet-50 dark:bg-violet-900/20"
        iconColor="text-violet-600 dark:text-violet-400"
      />
      <StatCard
        label={t('detail.last_viewed', 'Lần mở gần nhất')}
        value={lastViewedAt ? dayjs(lastViewedAt).fromNow() : '—'}
        icon={Clock}
        iconBg="bg-green-50 dark:bg-green-900/20"
        iconColor="text-green-600 dark:text-green-400"
      />
      <StatCard
        label={t('detail.visit_count', 'Lượt truy cập')}
        value={customer.visit_count ?? 0}
        icon={MousePointerClick}
        iconBg="bg-orange-50 dark:bg-orange-900/20"
        iconColor="text-orange-600 dark:text-orange-400"
      />
    </div>
  )
}
