'use client'

import * as React from 'react'
import { format } from 'date-fns'

import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/components/ui/button'
import { Calendar } from '@/shared/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { ScrollArea, ScrollBar } from '@/shared/components/ui/scroll-area'
import { CalendarIcon } from 'lucide-react'
import dayjs from '@/shared/lib/dayjs'
import { Matcher } from 'react-day-picker'

type Props = {
  className?: string
  value?: Date | string
  onChange?: (value: Date | undefined) => void
  disableFuture?: boolean
  disablePast?: boolean
  disabled?: Matcher | Matcher[] | undefined
}
export function DateTimePicker({
  className,
  value: date,
  onChange,
  disableFuture,
  disablePast,
  disabled,
}: Props) {
  const [isOpen, setIsOpen] = React.useState(false)

  const hours = Array.from({ length: 12 }, (_, i) => i + 1)
  const handleDateSelect = (selectedDate: Date | undefined) => {
    onChange?.(selectedDate)
  }

  const handleTimeChange = (type: 'hour' | 'minute' | 'ampm', value: string) => {
    if (date) {
      const newDate = new Date(date)
      if (type === 'hour') {
        newDate.setHours((parseInt(value) % 12) + (newDate.getHours() >= 12 ? 12 : 0))
      } else if (type === 'minute') {
        newDate.setMinutes(parseInt(value))
      } else if (type === 'ampm') {
        const currentHours = newDate.getHours()
        newDate.setHours(value === 'PM' ? currentHours + 12 : currentHours - 12)
      }
      onChange?.(newDate)
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !date && 'text-muted-foreground',
            className
          )}
          iconLeft={<CalendarIcon className="text-slate-600" />}
        >
          {date ? (
            dayjs(date).format('l hh:mm a')
          ) : (
            <span className="text-slate-400 italic">MM/DD/YYYY hh:mm aa</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <div className="sm:flex">
          <Calendar
            mode="single"
            selected={date ? new Date(date) : undefined}
            onSelect={handleDateSelect}
            initialFocus
            disabled={
              disableFuture
                ? { after: new Date() }
                : disablePast
                  ? { before: new Date() }
                  : (disabled ?? undefined)
            }
          />
          <div className="flex flex-col sm:flex-row sm:h-[300px] divide-y sm:divide-y-0 sm:divide-x">
            <ScrollArea className="w-64 sm:w-auto">
              <div className="flex sm:flex-col p-2">
                {hours.reverse().map((hour) => (
                  <Button
                    key={hour}
                    size="icon"
                    variant={
                      date && new Date(date).getHours() % 12 === hour % 12 ? 'default' : 'ghost'
                    }
                    className="sm:w-full shrink-0 aspect-square"
                    onClick={() => handleTimeChange('hour', hour.toString())}
                  >
                    {hour}
                  </Button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" className="sm:hidden" />
            </ScrollArea>
            <ScrollArea className="w-64 sm:w-auto">
              <div className="flex sm:flex-col p-2">
                {Array.from({ length: 12 }, (_, i) => i * 5).map((minute) => (
                  <Button
                    key={minute}
                    size="icon"
                    variant={date && new Date(date).getMinutes() === minute ? 'default' : 'ghost'}
                    className="sm:w-full shrink-0 aspect-square"
                    onClick={() => handleTimeChange('minute', minute.toString())}
                  >
                    {minute}
                  </Button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" className="sm:hidden" />
            </ScrollArea>
            <ScrollArea className="">
              <div className="flex sm:flex-col p-2">
                {['AM', 'PM'].map((ampm) => (
                  <Button
                    key={ampm}
                    size="icon"
                    variant={
                      date &&
                      ((ampm === 'AM' && new Date(date).getHours() < 12) ||
                        (ampm === 'PM' && new Date(date).getHours() >= 12))
                        ? 'default'
                        : 'ghost'
                    }
                    className="sm:w-full shrink-0 aspect-square"
                    onClick={() => handleTimeChange('ampm', ampm)}
                  >
                    {ampm}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
