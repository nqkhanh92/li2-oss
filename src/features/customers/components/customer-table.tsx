'use client'

import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Settings } from 'lucide-react'
import {
  ColumnDef,
  getCoreRowModel,
  Table,
  useReactTable,
  VisibilityState,
} from '@tanstack/react-table'
import { TableV2WithRef } from '@/shared/components/customize/table-v2/table'
import { useGetAudience } from '../hooks/queries'
import { createAudienceColumns } from './columns'
import { AudienceMember } from '../types'
import { useFilters } from '@/shared/hooks/use-filters'
import { SearchFilterPagination } from '@/shared/types'
import { CustomerCountryFilter } from './customer-country-filter'
import { CustomerExportButton } from './customer-export-button'
import { AudienceEmailFilter } from './audience-email-filter'
import { DataFilterItem } from '@/shared/components/customize/data-filters/data-filter-item'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'

function CustomerColumnToggle({ table }: { table: Table<AudienceMember> }) {
  const toggleCols = table
    .getAllColumns()
    .filter((col) => typeof col.accessorFn !== 'undefined' && col.getCanHide())

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors">
          <Settings className="h-[18px] w-[18px]" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[200px] p-2 rounded-[4px] border-slate-100 shadow-[0px_4px_8px_rgba(5,27,68,0.08)]"
      >
        {/* Section label */}
        <p className="px-4 py-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
          Toggle Column
        </p>

        {/* Column rows */}
        <div className="flex flex-col">
          {toggleCols.map((col) => {
            const visible = col.getIsVisible()
            const label =
              typeof col.columnDef.header === 'function'
                ? (col.columnDef.header({} as any) as any)?.props?.title
                : col.columnDef.header
            return (
              <button
                key={col.id}
                className="flex items-center gap-2 w-full px-4 py-[6px] rounded-[4px] text-left hover:bg-slate-50 transition-colors"
                onClick={() => col.toggleVisibility()}
              >
                <span className="w-[16px] h-[16px] shrink-0 flex items-center justify-center">
                  {visible && <Check className="w-[16px] h-[16px] text-slate-700" />}
                </span>
                <span className="flex-1 text-sm font-normal leading-[20px] text-slate-700">
                  {label || col.id}
                </span>
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// Column that renders the column-toggle gear icon in its header cell
const columnToggleCol: ColumnDef<AudienceMember> = {
  id: '_toggle',
  size: 36,
  header: ({ table }) => <CustomerColumnToggle table={table as Table<AudienceMember>} />,
  cell: () => null,
  enableSorting: false,
  enableHiding: false,
}

interface CustomerTableProps {
  orgId: string
  onRowClick?: (member: AudienceMember) => void
}

export function CustomerTable({ orgId, onRowClick }: CustomerTableProps) {
  const { t } = useTranslation('customers')

  const columns = useMemo(() => [...createAudienceColumns(), columnToggleCol], [])

  const { pagination, setPagination, sorting, setSorting, search, setSearch, filters, setFilter } =
    useFilters({
      pagination: { pageIndex: 0, pageSize: 10 },
      sorting: [{ id: 'last_seen_at', desc: true }],
      filters: { countries: [] },
    })

  const selectedCountries = (filters.countries as string[]) || []
  const emailOnly = filters.emailOnly === true

  const queryParams: SearchFilterPagination = {
    pagination,
    sorting,
    search: search || undefined,
    filters: {
      ...(selectedCountries.length > 0 && { countries: selectedCountries }),
      ...(emailOnly && { emailOnly: true }),
    },
  }

  const { data, isLoading } = useGetAudience(orgId, queryParams)

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

  const tableInstance = useReactTable({
    data: data?.data || [],
    columns,
    manualPagination: true,
    manualSorting: true,
    enableSorting: true,
    enableSortingRemoval: true,
    state: { pagination, sorting, columnVisibility },
    rowCount: data?.rowCount || 0,
    getCoreRowModel: getCoreRowModel(),
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getRowId: (row) => row.id,
    enableRowSelection: false,
  })

  return (
    <TableV2WithRef
      data={data?.data || []}
      table={tableInstance}
      pagination={pagination}
      isLoading={isLoading}
      enableRowSelection={false}
      onRowClick={(row) => onRowClick?.(row.original)}
      wrapperClassName="border border-slate-300 rounded-lg"
      headerClassName="bg-slate-50"
      className="[&_td]:px-4"
      toolsRender={() => (
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <DataFilterItem
                name="search"
                type="search"
                placeholder={t('search_placeholder')}
                setSearch={setSearch}
                search={search}
                className="w-full sm:w-[250px]"
              />
              <AudienceEmailFilter
                checked={emailOnly}
                onCheckedChange={(checked) => setFilter('emailOnly', checked ? true : null)}
              />
              <CustomerCountryFilter
                selectedCountries={selectedCountries}
                onSelectionChange={(countries) => setFilter('countries', countries)}
              />
            </div>
            <CustomerExportButton />
          </div>
          {/*
            Nói thẳng rằng hàng "Thiết bị" không phải một người. `fp` đổi khi xoá cookie hay đổi
            máy, nên đếm hàng ở đây sẽ cao hơn số người thật — và không có chú thích thì người
            dùng sẽ đọc nó như số người.
          */}
          {!emailOnly && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t(
                'audience.device_disclaimer',
                'Mỗi hàng "Thiết bị" là một thiết bị, không phải một người: cùng một người dùng hai máy hoặc xoá cookie sẽ xuất hiện nhiều lần.'
              )}
            </p>
          )}
          {/* Con số chưa đủ thì phải nói ra, chứ không để người dùng tin nó là đầy đủ. */}
          {data?.scanTruncated && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {t(
                'audience.scan_truncated',
                'Chỉ quét được các lượt truy cập gần nhất — số thiết bị hiển thị là chưa đủ. Dùng bộ lọc "Chỉ khách có email" để xem danh sách đầy đủ của những người đã đăng nhập.'
              )}
            </p>
          )}
        </div>
      )}
    />
  )
}
