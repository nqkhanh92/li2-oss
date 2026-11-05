'use client'
import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Eye, Settings2Icon } from 'lucide-react'
import { useFilters } from '@/shared/hooks/use-filters'
import { TableV2WithRef } from '@/shared/components/customize/table-v2/table'
import { Button } from '@/shared/components/ui/button'
import { DataFilterItem } from '@/shared/components/customize/data-filters/data-filter-item'
import { useGetAuditLogs } from '../hooks/queries'
import { useAuditLogColumns } from './columns'
import { AddFiltersPopover } from './filters/add-filters-popover'
import { ActiveFiltersDisplay } from './filters/active-filters-display'
import { AuditLogDetail } from './audit-log-detail'
import { ExportAuditLogs } from './export'
import { AuditLog, AuditLogQueryParams } from '../types'

export const AuditLogsList = () => {
  const { t } = useTranslation(['common', 'audit'])
  const columns = useAuditLogColumns()
  // const router = useRouter()
  const { org_id }: { org_id: string } = useParams()

  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  // Filters and pagination
  const { pagination, setPagination, sorting, filters, search, setSorting, setFilter, setSearch } =
    useFilters({
      pagination: {
        pageIndex: 0,
        pageSize: 10,
      },
      search: '',
      sorting: [
        {
          id: 'created_at',
          desc: true,
        },
      ],
      filters: {},
    })

  // Convert pagination and sorting to API params
  const createdAtFilter =
    typeof filters.created_at === 'object' && filters.created_at !== null
      ? (filters.created_at as { from?: number; to?: number })
      : undefined

  // Normalize filters to arrays
  const moduleFilter = filters.module
    ? Array.isArray(filters.module)
      ? filters.module
      : [filters.module]
    : undefined
  const actionFilter = filters.action
    ? Array.isArray(filters.action)
      ? filters.action
      : [filters.action]
    : undefined

  const queryParams: AuditLogQueryParams = {
    pagination,
    sorting,
    filters: {
      module: moduleFilter?.map(String),
      action: actionFilter?.map(String),
      created_at: createdAtFilter
        ? {
            from: createdAtFilter.from,
            to: createdAtFilter.to,
          }
        : undefined,
    },
    search: search || undefined,
  }

  // Query
  const { data, isLoading } = useGetAuditLogs(org_id, queryParams)

  // Calculate active filter count (excluding search)
  const activeFilterCount =
    (moduleFilter?.length || 0) + (actionFilter?.length || 0) + (createdAtFilter ? 1 : 0)

  // Check if any filters are active
  const hasActiveFilters = activeFilterCount > 0 || !!search

  // Handlers
  const handleViewDetail = (log: AuditLog) => {
    setSelectedLog(log)
    setIsDetailOpen(true)
  }

  const handleClearFilters = () => {
    setSearch('')
    setFilter('module', null)
    setFilter('action', null)
    setFilter('created_at', null)
  }

  const handleRemoveModule = (value: string) => {
    const updated = moduleFilter?.filter((m) => String(m) !== value).map(String)
    setFilter('module', updated && updated.length > 0 ? updated : null)
  }

  const handleRemoveAction = (value: string) => {
    const updated = actionFilter?.filter((a) => String(a) !== value).map(String)
    setFilter('action', updated && updated.length > 0 ? updated : null)
  }

  const handleRemoveDateRange = () => {
    setFilter('created_at', null)
  }

  return (
    <div className="flex flex-col gap-6">
      <TableV2WithRef
        className="bg-transparent! rounded-2xl mt-6 border-separate border-spacing-0"
        headerClassName="bg-transparent [&_th]:border-b [&_th]:border-slate-50"
        rowClassname="group hover:bg-transparent border-0 [&>td]:py-1 
        [&>td]:border-b [&>td]:border-slate-200 [&>td]:group-hover:bg-card 
        [&>td:first-child]:rounded-l-md [&>td:first-child]:border-r-0 
        [&>td:last-child]:rounded-r-md [&>td:last-child]:border-l-0"
        columns={columns}
        data={data?.data || []}
        isLoading={isLoading}
        pagination={pagination}
        setPagination={setPagination}
        sorting={sorting}
        setSorting={setSorting}
        rowCount={data?.rowCount || 0}
        enableRowSelection={false}
        actionsRender={(row) => (
          <Button
            variant="ghost"
            size="sm"
            className="p-2.5 hover:bg-slate-50 rounded-md"
            onClick={() => handleViewDetail(row.original)}
          >
            <Eye className="w-4.5 h-4.5 text-secondary-blue" />
          </Button>
        )}
        toolsRender={({ renderViewOptionButton }) => (
          <div className="space-y-2 w-full">
            {/* Search and Filter Controls */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <DataFilterItem
                  name="search"
                  placeholder={t('audit:filters.search_placeholder')}
                  type="search"
                  setSearch={setSearch}
                  search={search}
                  className="w-64 bg-white border border-slate-300 rounded-md px-4 py-2.5 text-s"
                />

                <AddFiltersPopover
                  filters={filters}
                  setFilter={setFilter}
                  activeFilterCount={activeFilterCount}
                />
              </div>

              <div className="flex items-center gap-2">
                <ExportAuditLogs
                  filters={{
                    module: moduleFilter?.map(String),
                    action: actionFilter?.map(String),
                    start_date: createdAtFilter?.from
                      ? new Date(createdAtFilter.from).toISOString()
                      : undefined,
                    end_date: createdAtFilter?.to
                      ? new Date(createdAtFilter.to).toISOString()
                      : undefined,
                  }}
                />
                {renderViewOptionButton(
                  <Button variant={'secondary'} className="h-10 w-10">
                    <Settings2Icon />
                  </Button>
                )}
              </div>
            </div>

            {/* Active Filters Display */}
            {(activeFilterCount > 0 || hasActiveFilters) && (
              <div className="flex items-center gap-2">
                {activeFilterCount > 0 && (
                  <ActiveFiltersDisplay
                    moduleFilter={moduleFilter?.map(String)}
                    actionFilter={actionFilter?.map(String)}
                    createdAtFilter={createdAtFilter}
                    onRemoveModule={handleRemoveModule}
                    onRemoveAction={handleRemoveAction}
                    onRemoveDateRange={handleRemoveDateRange}
                    extraItem={
                      hasActiveFilters && (
                        <Button
                          className="text-s font-normal text-semantic-error hover:bg-transparent"
                          variant="ghost"
                          size="sm"
                          onClick={handleClearFilters}
                        >
                          {t('common:buttons.clear_filters')}
                        </Button>
                      )
                    }
                  />
                )}
              </div>
            )}
          </div>
        )}
      />

      {/* Detail Modal */}
      {selectedLog && (
        <AuditLogDetail log={selectedLog} open={isDetailOpen} onOpenChange={setIsDetailOpen} />
      )}
    </div>
  )
}
