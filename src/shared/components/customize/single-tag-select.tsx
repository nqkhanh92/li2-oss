import React, { ComponentProps, useMemo } from 'react'
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
import { Check, ChevronsUpDown, Trash2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { inputVariants } from '@/features/touch-points/constants/variants'
import { VariantProps } from 'class-variance-authority'
import { useDebounce } from '@/shared/hooks/use-debounce'
type Option = {
  value: string
  label: string | React.ReactNode
  group?: string
  disabled?: boolean
  deleteable?: boolean
}
interface SingleCommandSelectProps extends VariantProps<typeof inputVariants> {
  value: string | undefined
  onChange: (value: string) => void
  options: Option[] | undefined
  disabled?: boolean
  enableSearch?: boolean
  className?: string
  classNameLabel?: string
  classNameItem?: string
  placeholder?: string
  groups?: string[]
  defaultValue?: string
  maxLength?: number
  commandPlaceholder?: string
  onCreate?: (value: string) => void
  onDelete?: (value: string) => void
  startAdornment?: React.ReactNode
}

export const SingleTagSelect = ({
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
  onCreate,
  onDelete,
  startAdornment,
  maxLength = 64,
}: SingleCommandSelectProps) => {
  const [open, setOpen] = React.useState(false)
  const selectedValue = value ?? defaultValue
  const [search, setSearch] = React.useState('')
  const handleCreate = () => {
    if (onCreate) {
      onCreate(search)
    }
    setSearch('')
    setOpen(false)
    onChange(search)
  }
  const handleDelete = (value: string) => {
    if (onDelete) {
      onDelete(value)
    }
    if (value === selectedValue) {
      onChange('')
    }
  }
  const showAdd = useMemo(() => {
    if (search && search.length > 0 && !options?.find((option) => option.value === search))
      return true
    return false
  }, [search, options])
  return (
    <>
      {startAdornment ? (
        <div className="flex items-center hover:border-slate-400 focus:border-slate-400 focus-within:border-slate-400">
          <div className={cn('text-muted-foreground')}>{startAdornment}</div>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className={cn(
                  inputVariants({ variant, size }),
                  'justify-between flex w-full',
                  className
                )}
                type="button"
                disabled={disabled}
              >
                {selectedValue ? (
                  options.find((item) => item.value === selectedValue)?.label ?? selectedValue
                ) : (
                  <span className={cn('text-muted-foreground', classNameLabel)}>{placeholder}</span>
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 hover:text-slate-500 focus:text-slate-500" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              side="top"
              className="mt-4 p-0 w-full min-w-(--radix-popper-anchor-width) rounded-md border-solid border border-neutral-700 shadow-[0px_4px_6px_0px_rgba(0,0,0,0.09)] bg-background"
              onWheel={(e) => e.stopPropagation()}
            >
              <Command
                filter={(value, search) => {
                  if (value.toLowerCase().includes(search.toLowerCase().trim())) return 1
                  return 0
                }}
              >
                {enableSearch ? (
                  <CommandInput
                    value={search}
                    maxLength={maxLength}
                    onValueChange={setSearch}
                    placeholder={commandPlaceholder}
                  />
                ) : (
                  <></>
                )}
                <CommandList>
                  {groups.length > 0 ? (
                    groups?.map((group) => (
                      <CommandGroup key={group} heading={group}>
                        {options
                          .filter((option) => option?.group === group)
                          .map((option) => (
                            <CommandItem
                              key={option.value}
                              value={
                                typeof option.label === 'string'
                                  ? option.label
                                  : React.Children.toArray(option.label).join('')
                              }
                              className="group text-nowrap"
                              disabled={option.disabled}
                              onSelect={() => {
                                onChange(option.value === selectedValue ? '' : option.value)
                                setOpen(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  value === option.value ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              {option.label}
                              <div className="w-full flex justify-end group-hover:opacity-100 opacity-0">
                                {option.deleteable && (
                                  <div
                                    className="cursor-pointer"
                                    onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      handleDelete(option.value)
                                    }}
                                    onMouseDown={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      handleDelete(option.value)
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </div>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    ))
                  ) : (
                    <CommandGroup>
                      {options.map((option: Option) => (
                        <CommandItem
                          key={option.value}
                          value={
                            typeof option.label === 'string'
                              ? option.label
                              : React.Children.toArray(option.label).join('')
                          }
                          disabled={option.disabled}
                          onSelect={() => {
                            onChange(option.value === selectedValue ? '' : option.value)
                            setOpen(false)
                          }}
                          className={cn('group text-nowrap', classNameItem)}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              selectedValue === option.value ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          {option.label}
                          <div className="w-full flex justify-end group-hover:opacity-100 opacity-0">
                            {option.deleteable && (
                              <div
                                className="cursor-pointer"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleDelete(option.value)
                                }}
                                onMouseDown={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleDelete(option.value)
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
                {showAdd && (
                  <Button className="w-full" type="button" variant={'link'} onClick={handleCreate}>
                    Add "{search}"
                  </Button>
                )}
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={cn(
                inputVariants({ variant, size }),
                'justify-between flex w-full',
                className
              )}
              type="button"
              disabled={disabled}
            >
              {selectedValue ? (
                options.find((item) => item.value === selectedValue)?.label ?? selectedValue
              ) : (
                <span className={cn('text-muted-foreground', classNameLabel)}>{placeholder}</span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 hover:text-slate-500 focus:text-slate-500" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            side="top"
            className="mt-4 p-0 w-full min-w-(--radix-popper-anchor-width) rounded-md border-solid border border-neutral-700 shadow-[0px_4px_6px_0px_rgba(0,0,0,0.09)] bg-background"
            onWheel={(e) => e.stopPropagation()}
          >
            <Command
              filter={(value, search) => {
                if (value.toLowerCase().includes(search.toLowerCase().trim())) return 1
                return 0
              }}
            >
              {enableSearch ? (
                <CommandInput
                  value={search}
                  onValueChange={setSearch}
                  maxLength={maxLength}
                  placeholder={commandPlaceholder}
                />
              ) : (
                <></>
              )}
              <CommandList>
                <CommandEmpty>
                  <Button type="button" variant={'link'} onClick={handleCreate}>
                    Add "{search}"
                  </Button>
                </CommandEmpty>
                {groups.length > 0 ? (
                  groups?.map((group) => (
                    <CommandGroup key={group} heading={group}>
                      {options
                        .filter((option) => option?.group === group)
                        .map((option) => (
                          <CommandItem
                            key={option.value}
                            value={
                              typeof option.label === 'string'
                                ? option.label
                                : React.Children.toArray(option.label).join('')
                            }
                            className="group text-nowrap"
                            disabled={option.disabled}
                            onSelect={() => {
                              onChange(option.value === selectedValue ? '' : option.value)
                              setOpen(false)
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                value === option.value ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            {option.label}
                            <div className="w-full flex justify-end group-hover:opacity-100 opacity-0">
                              {option.deleteable && (
                                <div
                                  className="cursor-pointer"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    handleDelete(option.value)
                                  }}
                                  onMouseDown={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    handleDelete(option.value)
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </div>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  ))
                ) : (
                  <CommandGroup>
                    {options.map((option: Option) => (
                      <CommandItem
                        key={option.value}
                        value={
                          typeof option.label === 'string'
                            ? option.label
                            : React.Children.toArray(option.label).join('')
                        }
                        disabled={option.disabled}
                        onSelect={() => {
                          onChange(option.value === selectedValue ? '' : option.value)
                          setOpen(false)
                        }}
                        className={cn('group text-nowrap', classNameItem)}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            selectedValue === option.value ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        {option.label}
                        <div className="w-full flex justify-end group-hover:opacity-100 opacity-0">
                          {option.deleteable && (
                            <div
                              className="cursor-pointer"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleDelete(option.value)
                              }}
                              onMouseDown={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleDelete(option.value)
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </>
  )
}
