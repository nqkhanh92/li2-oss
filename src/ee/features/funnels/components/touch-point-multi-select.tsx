'use client'

import { useState } from 'react'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/shared/components/ui/command'
import { useLinkJourneyTouchPoints } from '@/ee/features/link-journey/hooks/queries'

interface TouchPointMultiSelectProps {
  value: string[]
  onChange: (ids: string[]) => void
  orgId: string
  className?: string
}

export function TouchPointMultiSelect({
  value,
  onChange,
  orgId,
  className,
}: TouchPointMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const { data: touchPoints } = useLinkJourneyTouchPoints(orgId)
  const items = touchPoints ?? []

  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id))
    } else {
      onChange([...value, id])
    }
  }

  const getName = (id: string) => {
    const tp = items.find((t) => t.id === id)
    return tp ? tp.name : id.slice(0, 8)
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((id) => (
            <Badge key={id} variant="secondary" className="gap-1 text-xs">
              {getName(id)}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => toggle(id)}
              />
            </Badge>
          ))}
        </div>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-8 text-sm font-normal"
          >
            <span className={cn(!value.length && 'text-muted-foreground')}>
              {value.length > 0
                ? `${value.length} link${value.length > 1 ? 's' : ''} selected`
                : 'Select links...'}
            </span>
            <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search links..." />
            <CommandList>
              <CommandEmpty>
                <span className="text-sm text-muted-foreground">No links found.</span>
              </CommandEmpty>
              <CommandGroup>
                {items.map((tp) => (
                  <CommandItem
                    key={tp.id}
                    value={`${tp.name} ${tp.short_url}`}
                    onSelect={() => toggle(tp.id)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-3.5 w-3.5',
                        value.includes(tp.id) ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="text-sm">{tp.name}</span>
                      <span className="text-xs text-muted-foreground">{tp.short_url}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
