'use client'

import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/components/ui/button'
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

interface TouchPointComboboxProps {
  value: string
  onChange: (value: string) => void
  orgId: string
  placeholder?: string
  className?: string
}

export function TouchPointCombobox({
  value,
  onChange,
  orgId,
  placeholder = 'Select a link...',
  className,
}: TouchPointComboboxProps) {
  const [open, setOpen] = useState(false)
  const { data: touchPoints } = useLinkJourneyTouchPoints(orgId)
  const items = touchPoints ?? []

  const selected = items.find((tp) => tp.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <span className="truncate">
            {selected ? `${selected.name} (${selected.short_url})` : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search links..." />
          <CommandList>
            <CommandEmpty>
              <span className="text-sm text-muted-foreground">
                No links found.
              </span>
            </CommandEmpty>
            <CommandGroup>
              {items.map((tp) => (
                <CommandItem
                  key={tp.id}
                  value={`${tp.name} ${tp.short_url}`}
                  onSelect={() => {
                    onChange(tp.id)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-3.5 w-3.5',
                      value === tp.id ? 'opacity-100' : 'opacity-0'
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
  )
}
