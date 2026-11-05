'use client'
import * as React from 'react'
// import { Column } from '@tanstack/react-table'
import { ChevronDown, PlusCircle, X } from 'lucide-react'

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
import { VariantProps } from 'class-variance-authority'
import { Checkbox } from '../../ui/checkbox'
import { useTranslation } from 'react-i18next'
import { filterVariants } from '@/features/touch-points/constants/variants'
import { useIsMobile } from '@/shared/hooks/use-mobile'

interface FilterAuditSelectProps extends VariantProps<typeof filterVariants> {
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
  colorMap?: Record<string, string>
}

export function FilterAuditSelect({
  title,
  options,
  onChange,
  value = [],
  className,
  Icon,
  variant,
  size,
  isIconDown = true,
  colorMap,
}: FilterAuditSelectProps) {
  const [selectedValues, setSelectedValues] = React.useState(() => new Set<string>(value))
  const debounceValues = useDebounce(selectedValues, 500)

  React.useEffect(() => {
    if (value && value.length > 0 && !equal(Array.from(selectedValues), value)) {
      setSelectedValues(new Set(value))
    } else if (!value || value.length === 0) {
      setSelectedValues(new Set())
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
  const isMobile = useIsMobile()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          data-has-value={!!value}
          className={cn(
            filterVariants({ variant, size }),
            className,
            isMobile && selectedValues.size > 0 && 'border-slate-600'
          )}
        >
          {Icon ? <Icon /> : <PlusCircle />}
          <div className="md:flex items-center hidden flex-1">
            <span className="whitespace-nowrap">{title}</span>
            {selectedValues?.size > 0 && (
              <>
                <Separator orientation="vertical" className="mx-2 h-4 flex-shrink-0" />
                <Badge
                  variant="secondary"
                  className="rounded-full font-medium py-0.5 px-2.5 max-w-32 overflow-hidden text-xs text-center items-center justify-center lg:hidden flex-shrink-0 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  {selectedValues.size}
                </Badge>
                <div className="hidden space-x-1.5 lg:flex flex-shrink-0">
                  {selectedValues.size > 2 ? (
                    <Badge
                      variant="secondary"
                      className="rounded-full font-medium py-0.5 px-3 overflow-hidden text-xs text-center items-center justify-center whitespace-nowrap bg-primary/10 text-primary shadow-sm"
                    >
                      {t('analytic:filter_items.selected', { count: selectedValues.size })}
                    </Badge>
                  ) : (
                    options
                      .filter((option) => selectedValues.has(option.value))
                      .map((option) => {
                        const colorClass = colorMap?.[option.value] || 'bg-primary/10 text-primary'
                        return (
                          <Badge
                            variant="outline"
                            key={option.value}
                            className={`${colorClass} rounded-full font-medium py-0.5 px-3 overflow-hidden text-ellipsis text-xs text-center items-center justify-center whitespace-nowrap shadow-sm hover:opacity-80 transition-opacity`}
                          >
                            {option.label}
                          </Badge>
                        )
                      })
                  )}
                </div>
              </>
            )}
            {isIconDown && <ChevronDown className="h-5 w-5 flex-shrink-0" />}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[258px] p-1" align="start">
        <Command className="space-y-1">
          <CommandInput placeholder={title} className="rounded-none h-[38px] px-4" />
          {/* Clear filters button */}
          {selectedValues.size > 0 && (
            <div className="px-4 py-0">
              <Button
                iconLeft={<X className="h-[18px] w-[18px] text-semantic-error shrink-0" />}
                onClick={() => setSelectedValues(new Set())}
                className="w-full"
                variant={'ghost'}
              >
                <span className="text-base font-medium text-semantic-error">
                  {t('analytic:filter_items.clearFilters')}
                </span>
              </Button>
            </div>
          )}
          <CommandList className="max-h-[300px] space-y-1">
            <CommandEmpty className="py-6 text-center text-sm text-slate-600">
              {t('common:form.no_result')}
            </CommandEmpty>
            <CommandGroup className="px-4 py-0">
              {options.map((option, index) => {
                const isSelected = selectedValues.has(option.value)
                return (
                  <CommandItem
                    key={option.value + index}
                    className={cn(
                      'flex items-center gap-1 px-4 py-1.5 rounded cursor-pointer mb-1',
                      isSelected ? 'bg-slate-50' : 'bg-white hover:bg-slate-50'
                    )}
                    onSelect={() => handleSelect(option.value)}
                  >
                    <Checkbox
                      checked={isSelected}
                      className={cn(
                        'h-4.5 w-4.5 rounded-[3px] border-slate-400',
                        isSelected ? 'bg-primary border-primary' : 'bg-white border-slate-400'
                      )}
                    />
                    {option.icon && <option.icon className="mr-2 h-5 w-5 text-muted-foreground" />}
                    <span
                      className={cn(
                        'text-sm leading-5',
                        isSelected ? 'text-foreground font-medium' : 'text-slate-700 font-normal'
                      )}
                    >
                      {option.label}
                    </span>
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
