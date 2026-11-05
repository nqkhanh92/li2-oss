'use client'

import { cn } from '@/shared/lib/utils'
import dayjs from '@/shared/lib/dayjs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip'

interface RelativeTimeProps {
  date: string | Date | number
  className?: string
}

export const RelativeTime = ({ date, className }: RelativeTimeProps) => {
  const d = dayjs(date)
  const relative = d.fromNow()
  const formatted = d.format('MMM D, YYYY')

  const offsetMinutes = d.utcOffset()
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const absMin = Math.abs(offsetMinutes)
  const h = Math.floor(absMin / 60)
  const m = absMin % 60
  const tzLabel = m > 0 ? `GMT${sign}${h}:${String(m).padStart(2, '0')}` : `GMT${sign}${h}`

  const exact = d.format('MMM D, YYYY, h:mm:ss A')

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn('cursor-default', className)}>{formatted}</span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="p-0 overflow-hidden">
          <div className="flex flex-col gap-1.5 px-3 py-2">
            <span className="text-xs text-muted-foreground">{relative}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium bg-muted text-muted-foreground rounded px-1.5 py-0.5 shrink-0">
                {tzLabel}
              </span>
              <span className="text-xs text-foreground whitespace-nowrap">{exact}</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
