'use client'

import { cn } from '@/shared/lib/cn'
import { DateRangePicker } from '../date-range-picker'
import { FilterItemInput } from './filter-item-input'
import { FilterItemSelect } from './filter-item-select'
import { FilterAuditSelect } from './filter-audit-select'
// import { filterVariants } from '@/features/touch-points/constants/variants'
import { useIsMobile } from '@/shared/hooks/use-mobile'
import { Button } from '../../ui/button'
import { CalendarIcon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { filterVariants } from '@/features/touch-points/constants/variants'
type DataFilterTypeUnion = 'search' | 'select' | 'date' | 'date_range' | 'audit_select'
type DataFilterItemProps = {
  name: string
  type: DataFilterTypeUnion
  label?: string
  placeholder?: string
  options?: { label: string; value: string }[]
  setFilter?: (key: string, value: any) => void
  className?: string
  filters?: Record<string, any>
  search?: string
  setSearch?: (value: string) => void
  Icon?: React.ComponentType<{ className?: string }>
  menuTriggerClassName?: string
  colorMap?: Record<string, string>
}
export const DataFilterItem = ({
  name,
  type,
  label,
  placeholder,
  options = [],
  setFilter,
  className,
  filters,
  search,
  setSearch,
  menuTriggerClassName,
  colorMap,
  ...props
}: DataFilterItemProps) => {
  const ref = useRef<HTMLDivElement>(null)
  const [isInsideDialog, setIsInsideDialog] = useState(false)

  useEffect(() => {
    if (ref.current) {
      const inside = !!ref.current.closest('[role="dialog"]')
      setIsInsideDialog(inside)
    }
  }, [])

  let component = null
  const handleValueChange = (value: any) => {
    if (Array.isArray(value)) {
      if (value.length > 0) {
        setFilter?.(name, value)
      } else {
        setFilter?.(name, null)
      }
    } else {
      setFilter?.(name, value)
    }
  }
  const value = filters?.[name]
  const isMobile = useIsMobile()
  switch (type) {
    case 'search':
      component = (
        <FilterItemInput
          variant={'input'}
          size={'default'}
          name={name}
          onChange={setSearch}
          value={search}
          className={className}
          placeholder={placeholder}
          {...props}
        />
      )
      break
    case 'select':
      component = (
        <FilterItemSelect
          isInsideDialog
          variant={'default'}
          size={'default'}
          value={value}
          title={label}
          options={options}
          onChange={handleValueChange}
          className={cn('size-10 md:w-auto', className)}
          isIconDown={false}
          {...props}
        />
      )
      break
    case 'audit_select':
      component = (
        <FilterAuditSelect
          variant={'default'}
          size={'default'}
          value={value}
          title={label}
          options={options}
          onChange={handleValueChange}
          className={cn('size-10 md:w-auto', className)}
          isIconDown={false}
          colorMap={colorMap}
          {...props}
        />
      )
      break
    case 'date_range':
      component = (
        <DateRangePicker
          value={{
            from: value?.from ? new Date(parseInt(value.from)) : undefined,
            to: value?.to ? new Date(parseInt(value.to)) : undefined,
          }}
          placeholder={placeholder || 'Created date'}
          variant="default"
          size="default"
          modal={isInsideDialog}
          onValueChange={(value) => {
            if (!value) {
              handleValueChange(null)
            } else {
              handleValueChange({
                from: value?.from?.getTime(),
                to: value?.to?.getTime(),
              })
            }
          }}
          button={
            isMobile
              ? (value) => {
                  return (
                    <Button
                      size={'icon'}
                      variant={'secondary'}
                      data-has-value={!!value?.from || !!value?.to}
                      className={cn(
                        'text-slate-600 size-10', filterVariants({variant: 'default', size: 'default'}),
                      )}
                    >
                      <CalendarIcon className="w-4.5 h-4.5" />
                    </Button>
                  )
                }
              : undefined
          }
          allowClear
          disableFutureDate
          isIconDown={false}
          className={cn('size-10 md:w-auto', className)}
          menuTriggerClassName={menuTriggerClassName}
        />
      )
      break
    default:
      break
  }
  return (
    <div ref={ref} className="">
      {component}
    </div>
  )
}
