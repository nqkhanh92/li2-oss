'use client'

import * as React from 'react'
import { ChevronRight, PlusIcon, X } from 'lucide-react'
import { validate, version } from 'uuid'
import { Badge } from '@/shared/components/ui/badge'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/shared/components/ui/command'
import { Command as CommandPrimitive } from 'cmdk'
import equal from 'fast-deep-equal'
import { inputVariants } from '@/features/touch-points/constants/variants'
import { VariantProps } from 'class-variance-authority'
import { cn } from '@/shared/lib/utils'
import { Checkbox } from '../ui/checkbox'
import { CustomToolTip } from './custom-tooltip'

type Option = {
  value: string
  label: string
  color?: string
  extra?: Record<string, any>
}
type Options = Option[]

interface Props extends VariantProps<typeof inputVariants> {
  options?: Options | undefined
  value?: string[] | undefined
  onChange?: (value: string[]) => void
  placeholder?: string
  allow_add?: boolean
  limit?: number | undefined
  showOptionsLimit?: number | undefined
  className?: string
  isAdvancedAnalytics?: boolean
  resultClassName?: string
}
export const FancyMultiSelect = React.forwardRef<HTMLInputElement, Props>(function FancyMultiSelect(
  {
    options = [],
    value = [],
    onChange = (value: string[]) => {},
    placeholder = 'Select options',
    variant,
    size,
    limit = 100,
    showOptionsLimit = 5,
    className,
    isAdvancedAnalytics = false,
    resultClassName,
  }: Props,
  ref
) {
  const inputRef =
    (ref as React.RefObject<HTMLInputElement>) || React.useRef<HTMLInputElement>(null)
  const [open, setOpen] = React.useState(false)
  const [selected, setSelected] = React.useState<Options>([])
  const [inputValue, setInputValue] = React.useState('')
  React.useEffect(() => {
    const newValues = value.map((v) => {
      const option = options.find((o) => o.value === v)
      if (option) {
        return option
      }
      return { value: v, label: v }
    })
    if (!equal(newValues, selected)) {
      setSelected(newValues)
    }
  }, [value])

  const handleUnselect = React.useCallback(
    (option: Option, index: number) => {
      const newValue = selected.filter((s, i) => i !== index || s.value !== option.value)
      onChange?.(newValue.map((s) => s.value))
      setSelected(newValue)
      setOpen(false)
    },
    [selected, onChange]
  )

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const input = inputRef.current
    if (input) {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (input.value === '') {
          setSelected((prev) => {
            const newSelected = [...prev]
            newSelected.pop()
            return newSelected
          })
        }
      }
      // This is not a default behaviour of the <input /> field
      if (e.key === 'Escape') {
        input.blur()
      }
    }
  }, [])

  const handleSelect = React.useCallback(
    (option: Option) => {
      let currentValue = selected
      if (selected.some((s) => s.value === option.value)) {
        currentValue = selected.filter((s) => s.value !== option.value)
      } else {
        currentValue = [...selected, option]
      }
      onChange?.(currentValue.map((s) => s.value))
      setSelected(currentValue)
    },
    [selected, onChange]
  )
  return (
    <div className="flex flex-col gap-4">
      {selected.length > 0 && (
        <div
          className={cn(
            'flex items-center justify-start gap-2 flex-wrap max-h-[88px] overflow-y-scroll',
            resultClassName
          )}
        >
          {selected.slice(0, 5).map((option, index) => (
            <Badge className="not-italic font-normal" key={index} color={option.color} size="xs">
              {option.label}
              <button
                className="ml-1 rounded-full outline-hidden ring-offset-background focus:shadow-xs focus:ring-ring focus:ring-offset-2"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleUnselect(option, index)
                  }
                }}
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                onClick={() => handleUnselect(option, index)}
                type="button"
              >
                <X
                  style={{ color: option.color }}
                  className="h-3 w-3 text-muted-foreground hover:text-foreground"
                />
              </button>
            </Badge>
          ))}

          {selected.length > 5 && (
            <CustomToolTip
              contentClassName="bg-background rounded-[8px] px-4 py-3 border border border-slate-200"
              content={
                <div className="grid grid-cols-2 gap-2">
                  {selected.slice(5).map((option) => {
                    return (
                      <Badge
                        className="not-italic font-normal"
                        color={option.color}
                        key={option.value}
                        size="xs"
                      >
                        {option.label}
                      </Badge>
                    )
                  })}
                </div>
              }
              side="bottom"
            >
              <span className="flex items-center text-xs text-slate-600">
                +{selected.length - 5} more <ChevronRight className="ml-1 h-3 w-3" />{' '}
              </span>
            </CustomToolTip>
          )}
        </div>
      )}

      <Command
        onKeyDown={handleKeyDown}
        className="overflow-visible bg-transparent w-full"
        filter={(value, search) => {
          if (value.includes(search.trim())) return 1
          return 0
        }}
      >
        <div
          className={cn(
            inputVariants({ variant, size }),
            'group rounded-md border border-transparent focus-within:border-foreground focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm flex items-center truncate',
            'focus-within:border focus-within:border-slate-400 min-h-10',
            className
          )}
        >
          <div className="flex flex-wrap gap-1 w-full items-center">
            <CommandPrimitive.Input
              ref={inputRef}
              value={inputValue}
              onValueChange={setInputValue}
              onBlur={() => setOpen(false)}
              onFocus={() => setOpen(true)}
              disabled={selected.length >= limit}
              placeholder={selected.length < limit ? placeholder : `You’ve reached the maximum.`}
              className={cn('outline-hidden bg-inherit w-full')}
            />
          </div>
        </div>
        <div className="relative">
          <CommandList>
            {open && (
              <div className="absolute top-0 z-30 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-hidden animate-in p-2">
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup className="max-h-[250px] overflow-y-auto">
                  <div className="limited">
                    {options?.map((option: Option, index) => {
                      if (isAdvancedAnalytics) {
                        const isSelected = selected.some(
                          (selectedOption) => selectedOption.value === option.value
                        )
                        return (
                          <CommandItem
                            key={option.value + index}
                            className={`flex flex-row gap-2 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700 px-4 py-2 cursor-pointer data-[selected=true]:bg-slate-100 data-[selected=true]:text-slate-700`}
                            onMouseDown={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                            }}
                            onSelect={() => {
                              setInputValue('')
                              handleSelect(option)
                            }}
                          >
                            <Checkbox
                              checked={isSelected}
                              className={cn(
                                'h-4 w-4 items-center justify-center',
                                isSelected
                                  ? 'bg-primary text-primary-foreground'
                                  : 'opacity-50 [&_svg]:invisible'
                              )}
                              onCheckedChange={() => {
                                handleSelect(option)
                              }}
                            />
                            <div className="flex flex-col gap-1">
                              <span>{option.label}</span>
                              <div className="flex flex-row items-center gap-1">
                                {option.extra && option.extra.length > 0 && (
                                  <div
                                    className={cn(
                                      'flex items-center justify-start gap-2 flex-wrap max-h-[88px] overflow-y-scroll',
                                      resultClassName
                                    )}
                                  >
                                    {option.extra.slice(0, 3).map((tag: Option, idx: number) => (
                                      <Badge
                                        className="not-italic font-normal"
                                        key={tag.value + idx}
                                        color={tag.color}
                                        size="xs"
                                      >
                                        {tag.label}
                                      </Badge>
                                    ))}

                                    {option.extra.length > 3 && (
                                      <CustomToolTip
                                        contentClassName="bg-background rounded-[8px] px-4 py-3 border border border-slate-200"
                                        content={
                                          <div className="grid grid-cols-2 gap-2">
                                            {option.extra.slice(3).map((tag: Option) => (
                                              <Badge
                                                className="not-italic font-normal"
                                                color={tag.color}
                                                key={tag.value}
                                                size="xs"
                                              >
                                                {tag.label}
                                              </Badge>
                                            ))}
                                          </div>
                                        }
                                        side="bottom"
                                      >
                                        <span className="flex items-center text-xs text-slate-600">
                                          +{option.extra.length - 3} more{' '}
                                          <ChevronRight className="ml-1 h-3 w-3" />{' '}
                                        </span>
                                      </CustomToolTip>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            <span className="hidden">{index}</span>
                          </CommandItem>
                        )
                      } else {
                        return (
                          <CommandItem
                            key={option.value}
                            onMouseDown={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                            }}
                            onSelect={() => {
                              setInputValue('')
                              handleSelect(option)
                            }}
                            className="cursor-pointer"
                          >
                            <Checkbox checked={selected.some((s) => s.value === option.value)} />
                            <span className="hidden">{index}</span>
                            {option.label}
                          </CommandItem>
                        )
                      }
                    })}
                  </div>
                </CommandGroup>
              </div>
            )}
          </CommandList>
        </div>
      </Command>
    </div>
  )
})
