'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { enUS, vi } from 'date-fns/locale'
import { CalendarDays, ChevronDown } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/shared/components/ui/popover'
import { Calendar } from '@/shared/components/ui/calendar'
import type { DateRange } from 'react-day-picker'
import { PRESET_LABELS } from '../utils/date-range'
import type { DateRangeConfig, DatePreset } from '../utils/date-range'

const PRESET_OPTIONS: { value: DatePreset; labelKey: string }[] = [
  { value: 'today', labelKey: 'dateRange.today' },
  { value: 'last_7d', labelKey: 'dateRange.last7d' },
  { value: 'last_30d', labelKey: 'dateRange.last30d' },
  { value: 'last_90d', labelKey: 'dateRange.last90d' },
  { value: 'custom', labelKey: 'dateRange.custom' },
]

const localeMap: Record<string, typeof enUS> = { en: enUS, vi }

const parseLocalDate = (s: string) => new Date(s + 'T00:00:00')

interface DateRangePickerProps {
  value: DateRangeConfig
  onChange: (config: DateRangeConfig) => void
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const { t, i18n } = useTranslation('dashboards')
  const [open, setOpen] = useState(false)

  const handlePresetClick = (preset: DatePreset) => {
    if (preset === 'custom') {
      // Switch to custom mode with sensible defaults, keep popover open for calendar
      const today = format(new Date(), 'yyyy-MM-dd')
      const weekAgo = format(new Date(Date.now() - 7 * 86400000), 'yyyy-MM-dd')
      onChange({ preset: 'custom', from: weekAgo, to: today })
    } else {
      onChange({ preset })
      setOpen(false)
    }
  }

  const handleCalendarSelect = (range: DateRange | undefined) => {
    if (!range?.from) return
    const from = format(range.from, 'yyyy-MM-dd')
    const to = range.to ? format(range.to, 'yyyy-MM-dd') : from
    onChange({ preset: 'custom', from, to })
    // Close once both dates are picked
    if (range.to) {
      setOpen(false)
    }
  }

  // Build Calendar selected value from config
  const calendarValue: DateRange | undefined =
    value.preset === 'custom' && value.from
      ? {
          from: parseLocalDate(value.from),
          to: value.to ? parseLocalDate(value.to) : undefined,
        }
      : undefined

  // Display label
  const matchedPreset = PRESET_OPTIONS.find((p) => p.value === value.preset)
  const displayLabel =
    value.preset === 'custom' && value.from && value.to
      ? `${format(parseLocalDate(value.from), 'MMM d', { locale: localeMap[i18n.language] || enUS })} \u2013 ${format(parseLocalDate(value.to), 'PPP', { locale: localeMap[i18n.language] || enUS })}`
      : t(matchedPreset?.labelKey ?? 'dateRange.last7d', { defaultValue: PRESET_LABELS[value.preset] ?? 'Last 7 days' })

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <CalendarDays className="h-4 w-4" />
          {displayLabel}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0">
        <div className="flex">
          {/* Preset sidebar */}
          <div className="flex flex-col border-r p-2 min-w-[140px]">
            {PRESET_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handlePresetClick(opt.value)}
                className={`rounded-md px-3 py-1.5 text-left text-sm transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1
                  ${value.preset === opt.value ? 'bg-slate-100 font-medium' : ''}`}
              >
                {t(opt.labelKey, { defaultValue: PRESET_LABELS[opt.value] })}
              </button>
            ))}
          </div>
          {/* Calendar for custom range */}
          {value.preset === 'custom' && (
            <div className="p-2">
              <Calendar
                mode="range"
                selected={calendarValue}
                onSelect={handleCalendarSelect}
                numberOfMonths={2}
                locale={localeMap[i18n.language] || enUS}
                disabled={{ after: new Date() }}
              />
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
