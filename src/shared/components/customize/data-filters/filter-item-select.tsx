'use client'
import * as React from 'react'
// import { Column } from '@tanstack/react-table'
import { ChevronDown, PlusCircle } from 'lucide-react'

import { cn } from '@/shared/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover'
import { Button } from '../../ui/button'
import { Separator } from '../../ui/separator'
import { Badge } from '../../ui/badge'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '../../ui/command'
import { useDebounce } from '@/shared/hooks/use-debounce'
import equal from 'fast-deep-equal'
// import { DropdownMenuArrow } from '@radix-ui/react-dropdown-menu'
import { cva, VariantProps } from 'class-variance-authority'
import { Checkbox } from '../../ui/checkbox'
import { useTranslation } from 'react-i18next'
import { filterVariants } from '@/features/touch-points/constants/variants'

interface FilterItemSelectProps extends VariantProps<typeof filterVariants> {
  title?: string
  options: {
    label: string
    value: string
    icon?: React.ComponentType<{ className?: string }>
    color?: string
  }[]
  onChange?: (values: string[]) => void
  value?: string[]
  className?: string
  Icon?: React.ComponentType<{ className?: string }>
  isIconDown?: boolean
  isInsideDialog?: boolean
}

export function FilterItemSelect({
  title,
  options,
  onChange,
  value = [],
  className,
  Icon,
  variant,
  size,
  isIconDown = true,
  isInsideDialog,
}: FilterItemSelectProps) {
  const [selectedValues, setSelectedValues] = React.useState(() => new Set<string>(value))
  const debounceValues = useDebounce(selectedValues, 500)

  React.useEffect(() => {
    if (value?.length > 0 && !equal(Array.from(selectedValues), value)) {
      setSelectedValues(new Set(value))
    }
  }, [value])

  const handleSelect = (value: string) => {
    const newSelectedValues = new Set(selectedValues)
    if (newSelectedValues.has(value)) {
      newSelectedValues.delete(value)
    } else {
      newSelectedValues.add(value)
    }
    setSelectedValues(newSelectedValues)
  }
  React.useEffect(() => {
    onChange?.(Array.from(debounceValues))
  }, [debounceValues])

  const { t } = useTranslation(['common', 'analytic'])
  return (
    <Popover modal={isInsideDialog}>
      <PopoverTrigger asChild>
        <Button data-has-value={!!value && value?.length > 0} className={cn(filterVariants({ variant, size }), className)}>
          {Icon ? <Icon /> : <PlusCircle />}
          <div className="md:flex items-center hidden">
            {title}
            {selectedValues?.size > 0 && (
              <>
                <Separator orientation="vertical" className="mx-2 h-4" />
                <Badge
                  variant="secondary"
                  className="rounded-full font-normal py-1 px-3 max-w-32 overflow-hidden border-none outline-hidden text-xs text-center items-center justify-center lg:hidden"
                >
                  {selectedValues.size}
                </Badge>
                <div className="hidden space-x-1 lg:flex">
                  {selectedValues.size > 2 ? (
                    <Badge
                      variant="default"
                      className="rounded-full font-normal py-1 px-3 max-w-32 overflow-hidden border-none outline-hidden text-xs text-center items-center justify-center"
                    >
                      {t('analytic:filter_items.selected', { count: selectedValues.size })}
                    </Badge>
                  ) : (
                    options
                      .filter((option) => selectedValues.has(option.value))
                      .map((option) => (
                        <Badge
                          variant="secondary"
                          key={option.value}
                          className="rounded-full font-normal py-1 px-3 max-w-32 overflow-hidden border-none outline-hidden text-xs text-center items-center justify-center"
                          color={option.color}
                        >
                          {option.label}
                        </Badge>
                      ))
                  )}
                </div>
              </>
            )}
            {isIconDown && <ChevronDown className="h-5 w-5" />}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder={title} />
          {/* Clear filters button - positioned at top for easy access */}
          {selectedValues.size > 0 && (
            <>
              <CommandItem
                onSelect={() => {
                  setSelectedValues(new Set())
                }}
                className="justify-center text-center text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer font-medium"
              >
                ✕ {t('analytic:filter_items.clearFilters')}
              </CommandItem>
              <CommandSeparator />
            </>
          )}
          <CommandList>
            <CommandEmpty>{t('common:form.no_result')}</CommandEmpty>
            <CommandGroup>
              {options.map((option, index) => {
                const isSelected = selectedValues.has(option.value)
                return (
                  <CommandItem
                    key={option.value + index}
                    className="hover:bg-accent hover:text-accent-foreground"
                    onSelect={() => handleSelect(option.value)}
                  >
                    <Checkbox
                      checked={isSelected}
                      className={cn(
                        'h-4 w-4 items-center justify-center',
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'opacity-50 [&_svg]:invisible'
                      )}
                    />
                    {option.icon && <option.icon className="mr-2 h-5 w-5 text-muted-foreground" />}
                    <span className="hidden">{index}</span>
                    <span>{option.label}</span>
                    {/* {facets?.get(option.value) && (
                      <span className="ml-auto flex h-5 w-5 items-center justify-center font-mono text-xs">
                        {facets.get(option.value)}
                      </span>
                    )} */}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
