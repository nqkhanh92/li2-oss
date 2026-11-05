'use client'

import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { DollarSign, Clock, ShoppingCart, Hourglass, Sparkles } from 'lucide-react'
import { formatCurrencyFromCents, SupportedCurrency } from '@/shared/lib/currency'
import { JourneyMetrics } from '@/core/services/conversion.service'
import { CustomerProfile } from '../types'
import { cn } from '@/shared/lib/utils'

interface CustomerStatsCardsProps {
  customer: CustomerProfile
  metrics: JourneyMetrics | null
  defaultCurrency: SupportedCurrency
  usdToVndRate: number
  isLoading?: boolean
}

export function CustomerStatsCards({
  customer,
  metrics,
  defaultCurrency,
  usdToVndRate,
  isLoading,
}: CustomerStatsCardsProps) {
  const { t } = useTranslation('customers')

  // Calculate total revenue in display currency (same logic as columns.tsx)
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

  const hasRevenue = displayAmount > 0
  const hasSales = (customer.sale_count ?? 0) > 0

  const stats = [
    {
      id: 'ltv',
      label: t('detail.ltv', 'Lifetime Value'),
      value: formatCurrencyFromCents(displayAmount, defaultCurrency),
      icon: DollarSign,
      gradient: 'from-emerald-500 to-teal-600',
      bgGradient: 'from-emerald-500/10 via-emerald-500/5 to-transparent',
      iconBg: 'bg-emerald-500/15',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      valueColor: 'text-emerald-700 dark:text-emerald-300',
      featured: true,
      hasValue: hasRevenue,
    },
    {
      id: 'sales',
      label: t('detail.total_sales', 'Total Sales'),
      value: customer.sale_count ?? 0,
      icon: ShoppingCart,
      gradient: 'from-violet-500 to-purple-600',
      bgGradient: 'from-violet-500/10 via-violet-500/5 to-transparent',
      iconBg: 'bg-violet-500/15',
      iconColor: 'text-violet-600 dark:text-violet-400',
      valueColor: 'text-slate-900 dark:text-slate-100',
      featured: false,
      hasValue: hasSales,
    },
    {
      id: 'time_to_sale',
      label: t('detail.time_to_sale', 'Time to Sale'),
      value:
        metrics?.timeToSale != null
          ? `${metrics.timeToSale} ${t('detail.days', 'days')}`
          : '-',
      icon: Clock,
      gradient: 'from-blue-500 to-cyan-600',
      bgGradient: 'from-blue-500/10 via-blue-500/5 to-transparent',
      iconBg: 'bg-blue-500/15',
      iconColor: 'text-blue-600 dark:text-blue-400',
      valueColor: 'text-slate-900 dark:text-slate-100',
      featured: false,
      hasValue: metrics?.timeToSale != null,
    },
    {
      id: 'time_to_lead',
      label: t('detail.time_to_lead', 'Time to Lead'),
      value:
        metrics?.timeToLead != null
          ? metrics.timeToLead < 60
            ? `${metrics.timeToLead} ${t('detail.mins', 'min')}`
            : `${Math.round(metrics.timeToLead / 60)} ${t('detail.hrs', 'hrs')}`
          : '-',
      icon: Hourglass,
      gradient: 'from-amber-500 to-orange-600',
      bgGradient: 'from-amber-500/10 via-amber-500/5 to-transparent',
      iconBg: 'bg-amber-500/15',
      iconColor: 'text-amber-600 dark:text-amber-400',
      valueColor: 'text-slate-900 dark:text-slate-100',
      featured: false,
      hasValue: metrics?.timeToLead != null,
    },
  ]

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4"
          >
            <Skeleton className="h-4 w-20 mb-3" />
            <Skeleton className="h-8 w-28" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon

        return (
          <div
            key={stat.id}
            className={cn(
              'group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border transition-all duration-300',
              stat.featured && stat.hasValue
                ? 'border-emerald-200 dark:border-emerald-800/50 shadow-sm shadow-emerald-500/10'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700',
              'hover:shadow-lg hover:-translate-y-0.5'
            )}
            style={{
              animationDelay: `${index * 50}ms`,
            }}
          >
            {/* Background gradient */}
            <div
              className={cn(
                'absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500',
                stat.bgGradient
              )}
            />

            {/* Featured indicator */}
            {stat.featured && stat.hasValue && (
              <div className="absolute top-2 right-2">
                <div className="relative">
                  <Sparkles className="h-4 w-4 text-emerald-500 animate-pulse" />
                </div>
              </div>
            )}

            <div className="relative p-4">
              {/* Icon & Label */}
              <div className="flex items-center gap-2.5 mb-3">
                <div
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-xl transition-transform duration-300 group-hover:scale-110',
                    stat.iconBg
                  )}
                >
                  <Icon className={cn('h-4 w-4', stat.iconColor)} />
                </div>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  {stat.label}
                </span>
              </div>

              {/* Value */}
              <div
                className={cn(
                  'text-xl md:text-2xl font-bold tracking-tight truncate',
                  stat.featured && stat.hasValue ? stat.valueColor : 'text-slate-900 dark:text-slate-100'
                )}
              >
                {stat.value}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
