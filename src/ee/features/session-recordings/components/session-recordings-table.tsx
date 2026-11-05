'use client'

import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Search, X, Info } from 'lucide-react'
import { TableV2WithRef } from '@/shared/components/customize/table-v2/table'
import { DataFilterItem } from '@/shared/components/customize/data-filters/data-filter-item'
import { useFilters } from '@/shared/hooks/use-filters'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { SearchFilterPagination } from '@/shared/types'
import { useGetSessionRecordings } from '../hooks/queries'
import { sessionRecordingColumns } from './columns'
import { SessionRecording } from '../types'
import { SessionRecordingsFilterMenu } from './session-recordings-filter-menu'
import { Row } from '@tanstack/react-table'

interface SessionRecordingsTableProps {
  onRowClick?: (row: SessionRecording) => void
}

const defaultDateRange = (() => {
  const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  from.setHours(0, 0, 0, 0)
  const to = new Date()
  to.setHours(23, 59, 59, 999)
  return { from: from.getTime(), to: to.getTime() }
})()

export function SessionRecordingsTable({ onRowClick }: SessionRecordingsTableProps) {
  const { t } = useTranslation('session_recordings')
  const { org_id } = useParams<{ org_id: string }>()

  const { pagination, setPagination, sorting, setSorting, filters, setFilter } = useFilters({
    pagination: { pageIndex: 0, pageSize: 10 },
    sorting: [{ id: 'started_at', desc: true }],
    filters: {
      date_range: defaultDateRange,
      search: '',
      device_types: [],
      browsers: [],
      oss: [],
      country: '',
      bounce_filters: [],
    },
  }, false)

  const debouncedSearch = useDebounce(filters.search as string || '', 400)
  const debouncedCountry = useDebounce(filters.country as string || '', 400)

  const arr = (key: string): string[] =>
    Array.isArray(filters[key]) ? (filters[key] as string[]) : []

  const dateRangeFilter = filters.date_range as { from?: number; to?: number } | undefined

  const queryParams: SearchFilterPagination = {
    pagination,
    sorting,
    filters: {
      ...(debouncedSearch && { search: debouncedSearch }),
      ...(arr('device_types').length && { device_types: arr('device_types') }),
      ...(arr('browsers').length && { browsers: arr('browsers') }),
      ...(arr('oss').length && { oss: arr('oss') }),
      ...(debouncedCountry && { country: debouncedCountry }),
      ...(arr('bounce_filters').length && { bounce_filters: arr('bounce_filters') }),
      ...(dateRangeFilter?.from && { from: new Date(dateRangeFilter.from).toISOString() }),
      ...(dateRangeFilter?.to && { to: new Date(dateRangeFilter.to).toISOString() }),
    },
  }

  const { data, isLoading } = useGetSessionRecordings(org_id, queryParams)

  return (
    <TableV2WithRef
      columns={sessionRecordingColumns}
      data={data?.data ?? []}
      pagination={pagination}
      setPagination={setPagination}
      sorting={sorting}
      setSorting={setSorting}
      rowCount={data?.rowCount ?? 0}
      isLoading={isLoading}
      enableRowSelection={false}
      availablePageSize={[10, 25, 50]}
      emptyRender={() => <span className="text-sm text-muted-foreground">{t('empty')}</span>}
      onRowClick={onRowClick ? (row: Row<SessionRecording>) => onRowClick(row.original) : undefined}
      toolsRender={() => (
        <div className="flex items-center gap-2 py-4">
          <div className="flex items-center gap-1.5 border border-slate-300 rounded-[6px] px-2.5 h-10 bg-card min-w-[200px] hover:border-slate-400 transition-colors focus-within:border-primary">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              value={(filters.search as string) || ''}
              onChange={(e) => setFilter('search', e.target.value || null)}
              placeholder={t('filters.search_placeholder', 'IP / Visitor / Session ID')}
              className="flex-1 bg-transparent text-xs text-slate-700 placeholder:text-slate-400 outline-none"
            />
            {filters.search && (
              <button onClick={() => setFilter('search', null)}>
                <X className="w-3 h-3 text-slate-400 hover:text-slate-600" />
              </button>
            )}
          </div>
          <DataFilterItem
            name="date_range"
            type="date_range"
            placeholder={t('filters.date_range', 'Date range')}
            setFilter={setFilter}
            filters={filters}
          />
          <SessionRecordingsFilterMenu filters={filters} setFilter={setFilter} />
        </div>
      )}
      footer={
        <div className="flex items-center gap-1.5 px-4 py-2.5 text-[11px] text-muted-foreground border-t border-slate-100">
          <Info className="w-3 h-3 shrink-0" />
          <span>{t('min_duration_note')}</span>
        </div>
      }
    />
  )
}
