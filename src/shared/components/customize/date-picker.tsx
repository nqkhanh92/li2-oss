import { cn } from '@/shared/lib/utils'
import { CalendarIcon } from 'lucide-react'
import { Calendar } from '@/shared/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { FormControl } from '../ui/form'
import { Button } from '../ui/button'
import * as React from 'react'
import { CaptionLayout } from 'react-day-picker'
import dayjs from '@/shared/lib/dayjs'
import { useTranslation } from 'react-i18next'
import { Locale } from 'date-fns'
import { enUS, vi } from 'date-fns/locale'

type DatePickerProps = {
  value?: Date | string
  onChange?: (value: Date | undefined) => void
  disableFuture?: boolean
  className?: string
  fromYear?: number
  toYear?: number
  showOutsideDays?: boolean
  captionLayout?: CaptionLayout
}

export const DatePicker = ({
  value,
  onChange,
  disableFuture,
  className,
  fromYear,
  toYear,
  showOutsideDays = true,
  captionLayout,
}: DatePickerProps) => {
  const { t, i18n } = useTranslation()
  const disabledDates = (date: Date) => {
    if (disableFuture) {
      return date > new Date()
    }
    return false
  }

  const localeMap: Record<string, Locale> = {
    en: enUS,
    vi: vi,
  }
  return (
    <Popover>
      <PopoverTrigger asChild>
        <FormControl>
          <Button
            variant={'outline'}
            className={cn(
              'w-full pl-3 text-left font-normal',
              !value && 'text-muted-foreground',
              className
            )}
          >
            {value ? `${dayjs(value).format('LL')}` : <span>{t('common:form.pick_a_date')}</span>}
            <CalendarIcon className="ml-auto h-5 w-5 min-w-5 min-h-5 opacity-50" size={20} />
          </Button>
        </FormControl>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value ? new Date(value) : undefined}
          onSelect={onChange}
          disabled={disabledDates}
          initialFocus
          captionLayout={captionLayout}
          fromYear={fromYear}
          toYear={toYear}
          showOutsideDays={showOutsideDays}
          defaultMonth={value ? new Date(value) : undefined}
          locale={localeMap[i18n.language] || enUS}
        />
      </PopoverContent>
    </Popover>
  )
}
