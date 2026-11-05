'use client'

import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useGetCustomerConversions } from '../hooks/queries'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Badge } from '@/shared/components/ui/badge'
import {
  formatCurrencyFromCents,
  normalizeCurrency,
  SupportedCurrency,
} from '@/shared/lib/currency'
import { format } from 'date-fns'
import { ArrowRight, ShoppingCart, UserPlus, Calendar, MousePointer, History } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

interface CustomerConversionHistoryProps {
  customerId: string
  defaultCurrency: SupportedCurrency
}

export function CustomerConversionHistory({
  customerId,
  defaultCurrency,
}: CustomerConversionHistoryProps) {
  const { org_id } = useParams<{ org_id: string }>()
  const { t } = useTranslation('customers')
  const { data, isLoading } = useGetCustomerConversions(org_id, customerId)

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <Skeleton className="h-5 w-44" />
        </div>
        <div className="p-5 space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">
            {t('detail.history.title', 'Conversion History')}
          </h3>
        </div>
        <div className="p-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 mb-4">
            <History className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('detail.history.empty', 'No conversions recorded')}
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
            {t('detail.history.title', 'Conversion History')}
          </h3>
          <span className="inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full bg-slate-200 dark:bg-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300">
            {data.length}
          </span>
        </div>
      </div>

      {/* Conversion List */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {data.map((event, index) => {
          const isSale = event.event_type === 'sale'
          const Icon = isSale ? ShoppingCart : UserPlus

          return (
            <div
              key={event.id}
              className={cn(
                'group p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50',
                'animate-in fade-in slide-in-from-bottom-2'
              )}
              style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-xl shrink-0 transition-transform duration-300 group-hover:scale-110',
                    isSale
                      ? 'bg-emerald-100 dark:bg-emerald-900/30'
                      : 'bg-violet-100 dark:bg-violet-900/30'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5',
                      isSale
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-violet-600 dark:text-violet-400'
                    )}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {event.event_name}
                    </span>
                    <Badge
                      variant={isSale ? 'default' : 'secondary'}
                      className={cn(
                        'text-xs',
                        isSale
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 hover:bg-emerald-100'
                          : ''
                      )}
                    >
                      {event.event_type}
                    </Badge>
                  </div>

                  {/* Lead reference */}
                  {isSale && event.lead_event && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-slate-500 dark:text-slate-400">
                      <ArrowRight className="h-3 w-3" />
                      <span>
                        {t('detail.history.from_lead', 'from "{{leadName}}"', {
                          leadName: event.lead_event.event_name,
                        })}
                      </span>
                    </div>
                  )}

                  {/* Meta info */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {format(new Date(event.created_at), 'MMM d, yyyy')}
                    </span>
                    {event.touch_points?.name ? (
                      <span className="flex items-center gap-1">
                        <MousePointer className="h-3.5 w-3.5" />
                        <span className="truncate max-w-[120px]">{event.touch_points.name}</span>
                      </span>
                    ) : (
                      <Badge variant="outline" size="sm">Direct</Badge>
                    )}
                  </div>

                  {/* Conversion Metadata */}
                  {/* {event.metadata && Object.keys(event.metadata).length > 0 && (
                    <div className="mt-3 space-y-1 pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {t('detail.history.metadata', 'Metadata')}
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(event.metadata).map(([key, value]) => {
                          const valueString =
                            typeof value === 'object' ? JSON.stringify(value) : String(value)
                          return (
                            <div
                              key={key}
                              className="inline-flex items-start gap-1.5 px-2 py-1 rounded-md bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
                            >
                              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                {key}:
                              </span>
                              <span
                                title={valueString}
                                className="text-xs text-slate-700 dark:text-slate-300 break-all min-w-0 truncate max-w-24"
                              >
                                {valueString}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )} */}
                </div>

                {/* Amount (for sales) */}
                {isSale && event.amount != null && (
                  <div className="text-right shrink-0">
                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrencyFromCents(
                        event.amount,
                        event.currency ? normalizeCurrency(event.currency) : defaultCurrency
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
