'use client'
import * as React from 'react'
import { Column } from '@tanstack/react-table'
import { Check, FilterIcon, PlusCircle } from 'lucide-react'

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
} from '../../ui/command'
import { useTranslation } from 'react-i18next'
interface FilterItemSelectProps {
  title?: string
  options: {
    label: string
    value: string
    icon?: React.ComponentType<{ className?: string }>
  }[]
  onChange?: (value: string) => void
  value?: string
  showSearch?: boolean
}

export function FilterItemSelectSingle({
  title,
  options,
  onChange,
  value = '',
  showSearch = false,
}: FilterItemSelectProps) {
  const { t } = useTranslation()
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
        data-has-value={!!value} 
        variant="outline" 
        size="sm" 
        className="h-8 border-dashed" 
        iconLeft={<FilterIcon />}>
          {title}
          {value && (
            <>
              <Separator orientation="vertical" className="mx-2 h-4" />
              <div className="hidden space-x-1 lg:flex">
                {options
                  .filter((option) => value === option.value)
                  .map((option) => (
                    <Badge
                      variant="secondary"
                      key={option.value}
                      className="rounded-sm px-1 font-normal"
                    >
                      {option.label}
                    </Badge>
                  ))}
              </div>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          {showSearch && <CommandInput placeholder={title} />}
          <CommandList>
            <CommandEmpty>{t('common:form.no_result')}</CommandEmpty>
            <CommandGroup>
              {options?.map((option) => {
                const isSelected = value === option.value
                return (
                  <CommandItem key={option.value} onSelect={() => onChange?.(option.value)}>
                    <div
                      className={cn(
                        'mr-2 flex h-4 w-4 items-center justify-center rounded-full border border-primary',
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'opacity-50 [&_svg]:invisible'
                      )}
                    >
                      <Check />
                    </div>
                    {option.icon && <option.icon className="mr-2 h-4 w-4 text-muted-foreground" />}
                    <span>{option.label}</span>
                    {/* {facets?.get(option.value) && (
                      <span className="ml-auto flex h-4 w-4 items-center justify-center font-mono text-xs">
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
