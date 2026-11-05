import React, { ComponentProps } from 'react'
import { Select } from '../ui/select'
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '../ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { Button } from '../ui/button'
import { Check, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { inputVariants } from '@/features/touch-points/constants/variants'
import { VariantProps } from 'class-variance-authority'
import { nodeToText } from '@/shared/helpers/client-helper'

interface SingleCommandSelectProps extends VariantProps<typeof inputVariants> {
  value: string | undefined
  onChange: (value: string) => void
  options:
    | {
        value: string
        label: string | React.ReactNode
        group?: string
        disabled?: boolean
      }[]
    | undefined
  disabled?: boolean
  enableSearch?: boolean
  className?: string
  classNameLabel?: string
  classNameItem?: string
  placeholder?: string
  groups?: string[]
  defaultValue?: string
  commandPlaceholder?: string
  endAdornment?: React.ReactNode
  hideCheckIcon?: boolean
  disableSelectedItem?: boolean
  modal?: boolean
}

export const SingleCommandSelect = ({
  value,
  onChange,
  options = [],
  enableSearch = true,
  disabled,
  className,
  classNameLabel,
  classNameItem,
  placeholder,
  commandPlaceholder = 'Search...',
  groups = [],
  defaultValue,
  variant,
  size,
  endAdornment,
  hideCheckIcon = false,
  disableSelectedItem = false,
  modal = false,
}: SingleCommandSelectProps) => {
  const [open, setOpen] = React.useState(false)
  const selectedValue = value ?? defaultValue
  return (
    <Popover modal={modal} open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="none"
          role="combobox"
          aria-expanded={open}
          className={cn(
            inputVariants({ variant, size }),
            'justify-between flex w-full border border-transparent relative',
            className
          )}
          disabled={disabled}
        >
          {selectedValue !== undefined ? (
            options.find((item) => item.value === selectedValue)?.label
          ) : (
            <span className={cn('text-slate-400', classNameLabel)}>{placeholder}</span>
          )}
          <div className="absolute right-2 flex items-center">
            {endAdornment}
            <ChevronDown className="h-4.5 w-4.5 shrink-0 text-slate-600" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="mt-4 p-0 w-full min-w-(--radix-popper-anchor-width) rounded-md border-solid border border-neutral-700 shadow-[0px_4px_6px_0px_rgba(0,0,0,0.09)] bg-background">
        <Command>
          {enableSearch ? <CommandInput placeholder={commandPlaceholder} /> : <></>}
          <CommandList>
            <CommandEmpty>No options found.</CommandEmpty>
            {groups.length > 0 ? (
              groups?.map((group) => {
                const groupOptions = options.filter((option) => option?.group === group)
                if (groupOptions.length === 0) {
                  return (
                    <CommandGroup key={group} heading={group}>
                      <div className="flex justify-center py-2">
                        <span className="text-muted-foreground text-xs">Empty</span>
                      </div>
                    </CommandGroup>
                  )
                }
                return (
                  <CommandGroup key={group} heading={group}>
                    {groupOptions.map((option, index) => (
                      <CommandItem
                        key={option.value}
                        value={
                          typeof option.label === 'string' ? option.label : nodeToText(option.label)
                        }
                        disabled={
                          option.disabled || (disableSelectedItem && option.value === selectedValue)
                        }
                        onSelect={() => {
                          onChange(option.value === selectedValue ? '' : option.value)
                          setOpen(false)
                        }}
                      >
                        {!hideCheckIcon && (
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              value === option.value ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                        )}
                        <span className="hidden">{index}</span>
                        {option.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )
              })
            ) : (
              <CommandGroup>
                {options.map((option, index) => (
                  <CommandItem
                    key={option.value}
                    value={
                      typeof option.label === 'string' ? option.label : nodeToText(option.label)
                    }
                    disabled={
                      option.disabled || (disableSelectedItem && option.value === selectedValue)
                    }
                    onSelect={() => {
                      onChange(option.value === selectedValue ? '' : option.value)
                      setOpen(false)
                    }}
                    className={cn('', classNameItem)}
                  >
                    {!hideCheckIcon && (
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          value === option.value ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                    )}
                    <span className="hidden">{index}</span>
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
