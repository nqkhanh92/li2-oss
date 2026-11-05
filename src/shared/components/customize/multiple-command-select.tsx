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
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { VariantProps } from 'class-variance-authority'
import { inputVariants } from '@/features/touch-points/constants/variants'

interface MultipleCommandSelectProps extends VariantProps<typeof inputVariants> {
  value: string[] | undefined
  onChange: (value: string[]) => void
  options:
    | {
        value: string
        label: string | React.ReactNode
        group?: string
        disabled?: boolean
      }[]
    | undefined
  disabled?: boolean
  className?: string
  placeholder?: string
  groups?: string[]
  modal?: boolean
}

export const MultipleCommandSelect = ({
  value = [],
  onChange,
  options = [],
  disabled,
  className,
  placeholder,
  groups = [],
  modal = false,
  variant,
  size,
}: MultipleCommandSelectProps) => {
  const [open, setOpen] = React.useState(false)
  return (
    <Popover modal={modal} open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            inputVariants({ variant, size }),
            'flex w-full items-center justify-between truncate',
            className,
          )}
        >
          <span className="truncate">
            {value?.length > 0 ? (
              options
                .filter((item) => value.includes(item.value))
                .map((item) => item.label)
                .join(', ')
            ) : (
              <span className={cn('text-slate-400')}>{placeholder}</span>
            )}
          </span>

          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-full min-w-(--radix-popper-anchor-width)">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>No options found.</CommandEmpty>
            {groups.length > 0 ? (
              groups?.map((group) => (
                <CommandGroup key={group} heading={group}>
                  {options
                    .filter((option) => option?.group === group)
                    .map((option, index) => (
                      <CommandItem
                        key={option.value}
                        value={
                          typeof option.label === 'string'
                            ? option.label
                            : React.Children.toArray(option.label).join('')
                        }
                        disabled={option.disabled}
                        onSelect={() => {
                          if (value.includes(option.value)) {
                            onChange(value.filter((v) => v !== option.value))
                          } else {
                            onChange([...value, option.value])
                          }
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            value.includes(option.value) ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <span className="hidden">{index}</span>
                        {option.label}
                      </CommandItem>
                    ))}
                </CommandGroup>
              ))
            ) : (
              <CommandGroup>
                {options.map((option, index) => (
                  <CommandItem
                    key={option.value}
                    value={
                      typeof option.label === 'string'
                        ? option.label
                        : React.Children.toArray(option.label).join('')
                    }
                    disabled={option.disabled}
                    onSelect={() => {
                      if (value.includes(option.value)) {
                        onChange(value.filter((v) => v !== option.value))
                      } else {
                        onChange([...value, option.value])
                      }
                      // setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value.includes(option.value) ? 'opacity-100' : 'opacity-0'
                      )}
                    />

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
