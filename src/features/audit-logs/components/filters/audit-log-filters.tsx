'use client'
import { DataFilterItem } from '@/shared/components/customize/data-filters/data-filter-item'
import { getModuleOptions, getActionOptions, MODULE_COLORS, ACTION_COLORS } from '../../constants'
import { Calendar } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface AuditLogFiltersProps {
  search: string
  setSearch: (search: string) => void
  filters: Record<string, any>
  setFilter: (key: string, value: any) => void
}

export const AuditLogFilters = ({
  search,
  setSearch,
  filters,
  setFilter,
}: AuditLogFiltersProps) => {
  const { t } = useTranslation(['common', 'audit'])

  return (
    <>
      <DataFilterItem
        name="search"
        placeholder={t('audit:filters.search_placeholder')}
        type="search"
        setSearch={setSearch}
        search={search}
        className="md:w-64 w-full"
      />

      <DataFilterItem
        name="module"
        label={t('audit:filters.module')}
        // placeholder={t('audit:filters.select_module')}
        type="audit_select"
        options={getModuleOptions(t)}
        setFilter={setFilter}
        filters={filters}
        colorMap={MODULE_COLORS}
      />

      <DataFilterItem
        name="action"
        label={t('audit:filters.action')}
        // placeholder={t('audit:filters.select_action')}
        type="audit_select"
        options={getActionOptions(t)}
        setFilter={setFilter}
        filters={filters}
        colorMap={ACTION_COLORS}
      />

      <DataFilterItem
        name="created_at"
        label={t('audit:filters.date_range')}
        placeholder={t('audit:filters.date_range')}
        type="date_range"
        setFilter={setFilter}
        filters={filters}
        Icon={Calendar}
      />
    </>
  )
}
