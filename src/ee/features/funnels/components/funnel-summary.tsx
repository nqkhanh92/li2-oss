'use client'

import { useTranslation } from 'react-i18next'
import { TrendingUp, Users, Target } from 'lucide-react'

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return n.toLocaleString()
}

interface FunnelSummaryProps {
  totalEntries: number
  totalConversions: number
  conversionRate: number
}

function StatCard({
  icon: Icon,
  iconColor,
  label,
  value,
}: {
  icon: React.ElementType
  iconColor: string
  label: string
  value: string
}) {
  return (
    <div className="bg-card border border-slate-300 rounded-[16px] p-4 sm:p-6 flex-1 min-w-0">
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="bg-slate-50 w-8 h-8 sm:w-9 sm:h-9 rounded-[7px] flex items-center justify-center shrink-0">
          <Icon className={`w-[18px] h-[18px] sm:w-[21px] sm:h-[21px] ${iconColor}`} />
        </div>
        <div className="flex sm:flex-col items-center sm:items-start gap-2 sm:gap-0.5 min-w-0">
          <p className="text-sm sm:text-base text-slate-500 sm:leading-6">{label}</p>
          <p className="text-base sm:text-xl font-semibold sm:font-medium text-slate-700 sm:leading-7">{value}</p>
        </div>
      </div>
    </div>
  )
}

export function FunnelSummary({
  totalEntries,
  totalConversions,
  conversionRate,
}: FunnelSummaryProps) {
  const { t } = useTranslation('funnels')
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:gap-6 sm:items-start">
      <StatCard
        icon={Users}
        iconColor="text-blue-500"
        label={t('summary.totalEntries')}
        value={formatNumber(totalEntries)}
      />
      <StatCard
        icon={Target}
        iconColor="text-teal-600"
        label={t('summary.conversions')}
        value={formatNumber(totalConversions)}
      />
      <StatCard
        icon={TrendingUp}
        iconColor="text-violet-700"
        label={t('summary.conversionRate')}
        value={`${conversionRate.toFixed(1)}%`}
      />
    </div>
  )
}
