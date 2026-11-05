'use client'
import { Suspense, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filter, Calendar } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { DataFilterItem } from '@/shared/components/customize/data-filters/data-filter-item'
import { getModuleOptions, getActionOptions, MODULE_COLORS, ACTION_COLORS } from '../../constants'

interface AddFiltersPopoverProps {
  filters: Record<string, any>
  setFilter: (key: string, value: any) => void
  activeFilterCount: number
}

export const AddFiltersPopover = ({
  filters,
  setFilter,
  activeFilterCount,
}: AddFiltersPopoverProps) => {
  const { t } = useTranslation(['common', 'audit'])
  const [open, setOpen] = useState(false)
  const [tempFilters, setTempFilters] = useState(filters)

  // Sync tempFilters with parent filters when popover opens
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      // When opening, sync with current filters
      setTempFilters(filters)
    }
  }

  const handleApply = () => {
    // Apply all temp filters to actual filters
    Object.keys(tempFilters).forEach((key) => {
      setFilter(key, tempFilters[key])
    })
    setOpen(false)
  }

  const handleCancel = () => {
    // Reset temp filters to current filters
    setTempFilters(filters)
    setOpen(false)
  }

  const handleTempFilterChange = (key: string, value: any) => {
    setTempFilters((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          className="relative bg-white border border-slate-300 text-s text-slate-600 font-normal px-4 py-2.5 rounded-md flex items-center gap-2"
        >
          <Filter className="w-4.5 h-4.5" />
          {t('audit:filters.add_filters')}
          {activeFilterCount > 0 && (
            <div className="bg-secondary-blue text-white rounded-full w-4.5 h-4.5 flex items-center justify-center text-xs font-medium">
              {activeFilterCount}
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto" align="start">
        <Suspense fallback={<div>{t('audit:filters.loading')}</div>}>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-sm mb-3">{t('audit:filters.filter_by')}</h4>
              <div className="flex flex-col gap-3">
                <DataFilterItem
                  name="module"
                  label={t('audit:filters.module')}
                  type="audit_select"
                  options={getModuleOptions(t)}
                  setFilter={handleTempFilterChange}
                  filters={tempFilters}
                  className="!w-full h-[38px]"
                  colorMap={MODULE_COLORS}
                />

                <DataFilterItem
                  name="action"
                  label={t('audit:filters.action')}
                  type="audit_select"
                  options={getActionOptions(t)}
                  setFilter={handleTempFilterChange}
                  filters={tempFilters}
                  className="!w-full h-[38px]"
                  colorMap={ACTION_COLORS}
                />

                <DataFilterItem
                  name="created_at"
                  label={t('audit:filters.date_range')}
                  placeholder={t('audit:filters.date_range')}
                  type="date_range"
                  setFilter={handleTempFilterChange}
                  filters={tempFilters}
                  Icon={Calendar}
                  className="!w-full h-[38px]"
                  menuTriggerClassName="w-full"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t">
              <Button onClick={handleApply} size="sm" className="flex-1">
                {t('common:buttons.apply')}
              </Button>
              <Button onClick={handleCancel} variant="outline" size="sm" className="flex-1">
                {t('common:buttons.cancel')}
              </Button>
            </div>
          </div>
        </Suspense>
      </PopoverContent>
    </Popover>
  )
}
