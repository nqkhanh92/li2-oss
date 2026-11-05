'use client'

import { useTranslation } from 'react-i18next'
import { UserPlus, ShoppingCart } from 'lucide-react'
import dayjs from '@/shared/lib/dayjs'
import { Skeleton } from '@/shared/components/ui/skeleton'
import type { CustomerConversionEvent } from '../../hooks/queries'

function getEventIcon(type: 'lead' | 'sale') {
  return type === 'sale'
    ? { Icon: ShoppingCart, className: 'text-emerald-500' }
    : { Icon: UserPlus, className: 'text-violet-500' }
}

function ConversionList({ events }: { events: CustomerConversionEvent[] }) {
  const { t } = useTranslation('customers')

  if (events.length === 0) {
    return (
      <p className="text-xs text-slate-400 dark:text-slate-500 py-2 text-center">
        {t('detail.history.empty', 'No conversions recorded')}
      </p>
    )
  }

  return (
    <div className="flex flex-col">
      {events.map((event, idx) => {
        const isLast = idx === events.length - 1
        const { Icon, className: iconClass } = getEventIcon(event.event_type)

        return (
          <div key={event.id} className="flex gap-4">
            {/* Left column: icon + seamless connector */}
            <div className="flex flex-col items-center shrink-0">
              <Icon className={`h-5 w-5 shrink-0 ${iconClass}`} strokeWidth={1.5} />
              {!isLast && <div className="w-px flex-1 mt-1.5 bg-slate-200 dark:bg-slate-700" />}
            </div>

            {/* Right column: single-line content */}
            <div
              className={`flex items-center gap-2 flex-1 min-w-0 text-s overflow-hidden ${!isLast ? 'pb-4' : ''}`}
            >
              <span className="font-medium text-foreground dark:text-slate-200 shrink-0">
                {event.event_name}
              </span>
              <span className="text-slate-500 dark:text-slate-400 shrink-0 whitespace-nowrap">
                {dayjs(event.created_at).format('MMM D, YYYY h:mm A')}
              </span>
              <span className="px-3 py-1 rounded-[6px] bg-slate-100 dark:bg-slate-800 text-xs text-foreground dark:text-slate-200 shrink-0 capitalize">
                {event.event_type}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

interface ConversionHistoryCardProps {
  events: CustomerConversionEvent[]
  isLoading: boolean
}

export function ConversionHistoryCard({ events, isLoading }: ConversionHistoryCardProps) {
  const { t } = useTranslation('customers')

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 flex flex-col gap-4">
      <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">
        {t('detail.history.title', 'Conversion History')}
      </h3>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      ) : (
        <ConversionList events={events} />
      )}
    </div>
  )
}
