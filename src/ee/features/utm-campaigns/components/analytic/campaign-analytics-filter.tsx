'use client'

import { CalendarIcon } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { DateRangePicker } from '@/shared/components/customize/date-range-picker'
import { BotFilterToggle } from '@/features/analytics/components/filters/bot-filter-toggle'
import { DateRange } from 'react-day-picker'
import { useTranslation } from 'react-i18next'
import { useIsMobile } from '@/shared/hooks/use-mobile'

interface CampaignAnalyticsFilterProps {
  // Date range filter props
  dateRange: DateRange | undefined
  onDateRangeChange: (value: DateRange | undefined) => void

  // Bot filter props
  excludeBot: boolean
  onExcludeBotChange: (value: boolean) => void

  // Loading state
  isLoading?: boolean
}

export const CampaignAnalyticsFilter: React.FC<CampaignAnalyticsFilterProps> = ({
  dateRange,
  onDateRangeChange,
  excludeBot,
  onExcludeBotChange,
  isLoading = false,
}) => {
  const { t } = useTranslation(['common', 'analytic'])
  const isMobile = useIsMobile()

  // Helper to get date range display text
  const getDateRangeText = () => {
    if (!dateRange?.from || !dateRange?.to) return null
    const dayjs = require('@/shared/lib/dayjs').default
    const from = dayjs(dateRange.from)
    const to = dayjs(dateRange.to)
    const days = to.diff(from, 'day')

    if (days === 7) return t('common:analytics.filters.last_7_days')
    if (days === 30) return t('common:analytics.filters.last_month')
    if (days === 365) return t('common:analytics.filters.last_year')
    return `${from.format('L')} - ${to.format('L')}`
  }

  // Mobile view
  if (isMobile) {
    return (
      <div className="flex flex-col gap-2 w-full">
        <div className="flex gap-4 items-center w-full">
          {/* Date Range Filter - Icon Only */}
          <DateRangePicker
            value={dateRange}
            placeholder={t('filter_by_date')}
            onValueChange={onDateRangeChange}
            disableFutureDate
            button={
              <Button
                variant={'outline'}
                className="w-[38px] h-[38px] text-slate-600 border border-slate-300 hover:border-slate-400 hover:text-foreground [&_svg]:text-slate-600 hover:[&_svg]:text-foreground bg-background"
                size={'icon'}
              >
                <CalendarIcon className="w-[18px] h-[18px]" />
              </Button>
            }
            className="px-0"
          />
        </div>

        {/* Current Filters Display */}
        <div className="border-b border-white flex flex-wrap gap-6 items-start py-2 w-full">
          <div className="flex flex-wrap gap-2 items-center">
            <p className="text-sm font-medium text-foreground">{t('analytic:current_filters')}</p>

            {/* Time Period Filter */}
            {dateRange?.from && dateRange?.to && (
              <div className="flex gap-2 items-center">
                <div className="w-1 h-1 rounded-full bg-slate-800" />
                <p className="text-sm text-foreground">{t('analytic:time_period')}:</p>
                <div className="flex gap-0.5 items-center justify-center rounded-full">
                  <p className="text-sm text-slate-600">{getDateRangeText()}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bot Filter Toggle */}
        <div>
          <BotFilterToggle value={excludeBot} onChange={onExcludeBotChange} disabled={isLoading} />
        </div>
      </div>
    )
  }

  // Desktop view
  return (
    <div className="flex items-center md:flex-row flex-col gap-4">
      <div className="flex gap-4">
        {/* Date Range Filter */}
        <DateRangePicker
          value={dateRange}
          placeholder={t('filter_by_date')}
          onValueChange={onDateRangeChange}
          disableFutureDate
          className="text-slate-600 border-slate-300 hover:border-slate-400 hover:text-foreground [&_svg]:text-slate-600 hover:[&_svg]:text-foreground bg-background"
        />
      </div>

      <div>
        {/* Bot Filter Toggle */}
        <BotFilterToggle value={excludeBot} onChange={onExcludeBotChange} disabled={isLoading} />
      </div>
    </div>
  )
}
