'use client'

import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { TrendingUp, Users, DollarSign, ShoppingCart } from 'lucide-react'
import type { ConversionSummary } from '../types'

interface ConversionFunnelProps {
  data: ConversionSummary | undefined
  isLoading: boolean
}

function formatCurrency(amount: number, currency: string | null): string {
  const value = amount / 100
  const code = currency?.toUpperCase() ?? 'USD'
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return `${value.toLocaleString(undefined, { minimumFractionDigits: 2 })} ${code}`
  }
}

function formatTimeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function ConversionFunnel({ data, isLoading }: ConversionFunnelProps) {
  const { t } = useTranslation('link-journey')

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('conversions.title')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || (data.total_leads === 0 && data.total_sales === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('conversions.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center py-6 text-center">
            <ShoppingCart className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">
              {t('conversions.noData')}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Determine the dominant currency from recent conversions for the revenue display
  const dominantCurrency = data.recent_conversions.find((c) => c.currency)?.currency ?? 'USD'

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Conversions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {/* Metric cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="flex items-center gap-3 rounded-lg border px-4 py-3">
            <div className="rounded-lg bg-blue-50 p-2">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground leading-none mb-1">{t('conversions.leads')}</p>
              <p className="text-xl font-semibold tabular-nums">
                {data.total_leads.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border px-4 py-3">
            <div className="rounded-lg bg-green-50 p-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground leading-none mb-1">{t('conversions.sales')}</p>
              <p className="text-xl font-semibold tabular-nums">
                {data.total_sales.toLocaleString()}
              </p>
            </div>
          </div>
          {data.total_revenue > 0 && (
            <div className="flex items-center gap-3 rounded-lg border px-4 py-3">
              <div className="rounded-lg bg-emerald-50 p-2">
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground leading-none mb-1">{t('conversions.revenue')}</p>
                <p className="text-xl font-semibold tabular-nums">
                  {formatCurrency(data.total_revenue, dominantCurrency)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Recent conversions */}
        {data.recent_conversions.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              {t('conversions.recentConversions')}
            </p>
            <div className="flex flex-col gap-0.5">
              {data.recent_conversions.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 text-sm rounded-md px-2 py-2 hover:bg-muted/50 transition-colors"
                >
                  {/* Event type badge */}
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium shrink-0 ${
                      c.event_type === 'sale'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {c.event_type}
                  </span>

                  {/* Customer */}
                  <span className="truncate font-medium">
                    {c.customer_name || c.customer_email || t('conversions.anonymous')}
                  </span>

                  {/* Timestamp */}
                  <span className="text-xs text-muted-foreground shrink-0 ml-auto">
                    {formatTimeAgo(c.created_at)}
                  </span>

                  {/* Amount */}
                  {c.amount != null && (
                    <span className="font-medium tabular-nums shrink-0">
                      {formatCurrency(c.amount, c.currency)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
