import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/shared/components/ui/dropdown-menu'
import { CalendarIcon, ChevronDown } from 'lucide-react'
import React, { useRef, useState, useEffect, useMemo, useImperativeHandle } from 'react'
import { Calendar } from '@/shared/components/ui/calendar'
import { DateRange } from 'react-day-picker'
import { cva, VariantProps } from 'class-variance-authority'
import { useTranslation } from 'react-i18next'
import { useMediaQuery } from '@/shared/hooks/use-media-query'
import dayjs from '@/shared/lib/dayjs'
import { Locale } from 'date-fns'
import { enUS, vi } from 'date-fns/locale'
import { filterVariants } from '@/features/touch-points/constants/variants'

export interface DateRangePickerProps extends VariantProps<typeof filterVariants> {
  placeholder: string
  onValueChange: (value: DateRange | undefined) => void
  disableFutureDate?: boolean
  className?: string
  value?: DateRange | undefined
  isIconDown?: boolean
  allowClear?: boolean
  button?: React.ReactNode | ((value: DateRange | undefined) => React.ReactNode)
  menuTriggerClassName?: string
  modal?: boolean
}
export const DateRangePicker = React.forwardRef(
  (
    {
      variant,
      size,
      placeholder,
      onValueChange,
      disableFutureDate,
      className,
      value,
      isIconDown = true,
      allowClear = false,
      button,
      menuTriggerClassName,
      modal = false,
    }: DateRangePickerProps,
    ref: React.ForwardedRef<any>
  ) => {
    const [open, setOpen] = useState(false)
    const dropdownRef = useRef<any>(null)
    const [dropdownWidth, setDropdownWidth] = useState(0)
    useEffect(() => {
      if (dropdownRef.current) {
        setDropdownWidth(dropdownRef.current.offsetWidth)
      }
    }, [dropdownRef])
    const [selectedDate, setSelectedDate] = useState<DateRange | undefined>(value)
    const handleApply = () => {
      if (selectedDate?.from) {
        const appliedDate: DateRange = {
          from: selectedDate.from,
          to: selectedDate.to,
        }
        onValueChange(appliedDate)
        setOpen(false)
      }
    }
    const handleClear = () => {
      setSelectedDate(undefined)
      onValueChange(undefined)
      setOpen(false)
    }
    const handleQuickSelect = (daysAgo: number) => {
      const today = new Date()
      const startDate = new Date(new Date().setDate(today.getDate() - daysAgo))
      setSelectedDate({ from: startDate, to: today })
    }
    const differenceInDays = useMemo(() => {
      if (!selectedDate?.from || !selectedDate?.to) return false

      const currentDate = new Date()
      const isToday = dayjs(selectedDate.to.getDate()).isSame(dayjs(currentDate.getDate()))
      if (isToday) {
        const normalizeDate = (date: Date) =>
          new Date(date.getFullYear(), date.getMonth(), date.getDate())

        const fromDate = normalizeDate(selectedDate.from)
        const toDate = normalizeDate(selectedDate.to)
        const differenceInDays = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)
        return differenceInDays
      }
      return null
    }, [selectedDate])
    const handleOnSelect = (range: DateRange | undefined) => {
      if (!range) return
      const from = range.from && new Date(range.from.setHours(0, 0, 0, 0))
      const to = range.to
        ? new Date(range.to.setHours(23, 59, 59, 999))
        : range.from
        ? new Date(range.from.setHours(23, 59, 59, 999))
        : undefined
      setSelectedDate({
        from: from ? from : undefined,
        to: to ? to : undefined,
      })
    }
    useImperativeHandle(ref, () => ({
      clearValue: () => {
        setSelectedDate(undefined)
      },
    }))
    const disableDays = useMemo(() => {
      if (disableFutureDate) {
        return {
          after: new Date(),
        }
      }
      return undefined
    }, [disableFutureDate])
    const { t, i18n } = useTranslation('common')
    const isMobile = useMediaQuery('(max-width: 768px)')

    const localeMap: Record<string, Locale> = {
      en: enUS,
      vi: vi,
    }

    const getSelectedDateText = () => {
      if (!value?.from || !value?.to) return placeholder
      if (differenceInDays === 7) return t('common:analytics.filters.last_7_days')
      if (differenceInDays === 30) return t('common:analytics.filters.last_month')
      if (differenceInDays === 365) return t('common:analytics.filters.last_year')
      return `${dayjs(value.from).format(isMobile ? 'L' : 'L')} - ${dayjs(value.to).format(
        isMobile ? 'L' : 'L'
      )}`
    }
    return (
      <DropdownMenu open={open} onOpenChange={setOpen} modal={modal}>
        <DropdownMenuTrigger ref={dropdownRef} className={menuTriggerClassName} asChild>
          {button ? (
            typeof button === 'function' ? (
              button(value)
            ) : (
              button
            )
          ) : (
            <Button data-has-value={!!value?.from || !!value?.to} className={cn(filterVariants({ variant, size }), className)}>
              <div className="flex items-center justify-between w-full mx-auto">
                <div className="flex items-center justify-start w-full gap-2">
                  <CalendarIcon className="h-5 w-5 flex-none" />
                  <span className="text-s md:flex truncate flex-1">{getSelectedDateText()}</span>
                </div>
                {isIconDown && <ChevronDown className="flex-none h-5 w-5 cursor-pointer" />}
              </div>
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="p-2"
          align="start"
          // style={{ width: dropdownWidth }}
        >
          <div className="md:grid md:grid-cols-12 flex flex-col gap-2">
            <div className="md:grid md:grid-cols-12 md:col-span-12 flex flex-row gap-2">
              <Button
                onClick={() => handleQuickSelect(7)}
                variant={differenceInDays === 7 ? 'default' : 'outline'}
                size="sm"
                className="text-xs md:col-span-4 md:w-full w-fit shadow-none"
              >
                {t('common:analytics.filters.last_7_days')}
              </Button>
              <Button
                onClick={() => handleQuickSelect(30)}
                variant={differenceInDays === 30 ? 'default' : 'outline'}
                size="sm"
                className="text-xs md:col-span-4 md:w-full w-fit shadow-none"
              >
                {t('common:analytics.filters.last_month')}
              </Button>
              <Button
                onClick={() => handleQuickSelect(365)}
                variant={differenceInDays === 365 ? 'default' : 'outline'}
                size="sm"
                className="text-xs md:col-span-4 md:w-full w-fit shadow-none"
              >
                {t('common:analytics.filters.last_year')}
              </Button>
            </div>
            <DropdownMenuSeparator className="col-span-12 md:flex hidden" />
            <Calendar
              disabled={disableDays}
              className="md:col-span-12 shadow-none"
              mode="range"
              selected={selectedDate}
              onSelect={(range) => handleOnSelect(range)}
              numberOfMonths={isMobile ? 1 : 2}
              locale={localeMap[i18n.language] || enUS}
            />
            <DropdownMenuSeparator className="col-span-12 md:flex hidden" />
            <div className="flex gap-2 col-span-12 ">
              <Button variant="default" size="sm" className="flex-1" onClick={handleApply}>
                {t('common:buttons.apply')}
              </Button>
              {allowClear && (
                <Button variant="outline" size="sm" onClick={handleClear}>
                  {t('common:buttons.clear')}
                </Button>
              )}
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }
)
DateRangePicker.displayName = 'DateRangePicker'
