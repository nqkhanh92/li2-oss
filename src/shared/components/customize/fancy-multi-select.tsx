'use client'

import * as React from 'react'
import { PlusIcon, X } from 'lucide-react'
import { validate, version } from 'uuid'
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
import { cn, hexToRGBA } from '@/shared/lib/utils'

type Option = {
  value: string
  label: string
  color?: string
}
type Options = Option[]

interface Props extends VariantProps<typeof inputVariants> {
  options?: Options | undefined
  value?: string[] | undefined
  onChange?: (value: string[]) => void
  placeholder?: string
  allow_add?: boolean
  limit?: number | undefined
  maxLength?: number | undefined
  className?: string
}
export const FancyMultiSelect = React.forwardRef<HTMLInputElement, Props>(function FancyMultiSelect(
  {
    options = [],
    value = [],
    onChange = (value: string[]) => {},
    placeholder = 'Select options',
    allow_add = true,
    variant,
    size,
    limit = 100,
    maxLength,
    className,
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

  const selectables = React.useMemo(() => {
    return options.filter((option) => !selected.map((s) => s.value).includes(option.value))
  }, [options, selected])
  const handleSelect = React.useCallback(
    (option: Option) => {
      const newValue: Options = [...selected, option]
      onChange?.(newValue.map((s) => s.value))
      setSelected(newValue)
    },
    [selected, onChange]
  )
  return (
    <div className="flex flex-col">
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
            'group rounded-md border border-transparent focus-within:border-foreground focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 flex items-center',
            'focus-within:border focus-within:border-slate-400 min-h-10',
            inputVariants({ variant, size }),
            className
          )}
        >
          <div className="flex flex-wrap gap-2 w-full items-center">
            {selected.map((option, index) => (
              <span
                key={index}
                className="inline-flex h-6 items-center gap-1 rounded-full border px-3 py-1 text-xs leading-4"
                style={{
                  borderColor: option.color ?? '#0891b2',
                  color: option.color ?? '#0891b2',
                  backgroundColor: option.color
                    ? hexToRGBA(option.color, 0.05)
                    : 'rgba(8,145,178,0.05)',
                }}
              >
                {option.label}
                <button
                  className="ml-0.5 rounded-full outline-hidden hover:opacity-70"
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
                  <X strokeWidth={3} className="h-3 w-3 text-semantic-error" />
                </button>
              </span>
            ))}
            <CommandPrimitive.Input
              ref={inputRef}
              value={inputValue}
              onValueChange={setInputValue}
              onBlur={() => setOpen(false)}
              onFocus={() => setOpen(true)}
              disabled={selected.length >= limit}
              placeholder={
                selected.length < limit
                  ? selected.length > 0
                    ? ''
                    : placeholder
                  : `You've reached the maximum.`
              }
              className={cn(
                'outline-hidden flex-1 min-w-[80px] bg-transparent placeholder:text-slate-400 placeholder:italic text-sm'
              )}
            />
          </div>
        </div>
        <div className="relative">
          <CommandList>
            {open && (selectables.length > 0 || !!inputValue) && selected.length < limit ? (
              <div className="absolute top-0 z-30 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-hidden animate-in overflow-y-scroll max-h-[400px]">
                <CommandGroup className="h-full overflow-auto">
                  {selectables.map((option: Option, index) => {
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
                        className={'cursor-pointer'}
                      >
                        <span className="hidden">{index}</span>
                        {option.label}
                      </CommandItem>
                    )
                  })}
                  {allow_add &&
                    !!inputValue &&
                    !options.find((option) => option.label === inputValue.trim()) && (
                      <CommandItem
                        key={'add-select'}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                        }}
                        onSelect={() => {
                          if (!validate(inputValue)) {
                            setInputValue('')
                            const value = maxLength ? inputValue.slice(0, maxLength) : inputValue
                            handleSelect({
                              value,
                              label: value,
                            })
                          }
                        }}
                        value={inputValue}
                      >
                        <PlusIcon className="mr-1 h-4 w-4" />
                        {inputValue}
                      </CommandItem>
                    )}
                </CommandGroup>
              </div>
            ) : null}
          </CommandList>
        </div>
      </Command>
    </div>
  )
})
