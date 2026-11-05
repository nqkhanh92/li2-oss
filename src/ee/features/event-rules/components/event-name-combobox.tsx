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
import { useGetEventNames } from '../hooks/queries'

interface EventNameComboboxProps {
  value: string
  onChange: (value: string) => void
  orgId: string
  placeholder?: string
  className?: string
}

export function EventNameCombobox({
  value,
  onChange,
  orgId,
  placeholder = 'e.g. signup_click',
  className,
}: EventNameComboboxProps) {
  const [open, setOpen] = useState(false)
  const { data } = useGetEventNames(orgId)
  const names = data?.data ?? []

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
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search events..."
            value={value}
            onValueChange={onChange}
          />
          <CommandList>
            <CommandEmpty>
              <span className="text-sm text-muted-foreground">
                No matching events. Type a custom name.
              </span>
            </CommandEmpty>
            <CommandGroup>
              {names.map((name) => (
                <CommandItem
                  key={name}
                  value={name}
                  onSelect={(selected) => {
                    onChange(selected)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-3.5 w-3.5',
                      value === name ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
