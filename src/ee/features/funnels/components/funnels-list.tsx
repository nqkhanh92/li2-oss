'use client'

import { useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useOrganizationStoreProvider } from '@/shared/providers/organization-store-provider'
import { useGetFunnels } from '../hooks/queries'
import { useDeleteFunnel } from '../hooks/mutations'
import { useConfirmDialog } from '@/shared/components/customize/confirm-dialog'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { BarChart2, Check, Funnel, MoreHorizontal, MoveDown, MoveUp, Pencil, Plus, Settings, Trash2, TrendingDown } from 'lucide-react'
import Link from 'next/link'
import { SmartSetupTrigger } from '@/features/smart-setup/components/smart-setup-trigger'
import { SmartSetupResults } from '@/features/smart-setup/components/smart-setup-results'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/shared/components/ui/sheet'
import { TableV2WithRef, TableV2Ref } from '@/shared/components/customize/table-v2/table'
import { DataFilterItem } from '@/shared/components/customize/data-filters/data-filter-item'
import { DataTableColumnHeader } from '@/shared/components/customize/table/column-header'
import { ColumnDef, getCoreRowModel, Table, useReactTable, VisibilityState } from '@tanstack/react-table'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { FunnelListItem } from '../types'
import type { PaginationState, SortingState } from '@/shared/hooks/use-filters'
import { cn } from '@/shared/lib/utils'
import { TFunction } from 'i18next'

function FunnelColumnToggle({ table }: { table: Table<FunnelListItem> }) {
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
        <p className="px-4 py-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
          Toggle Column
        </p>
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

function buildColumns(
  t: TFunction,
  orgId: string,
  onDelete: (id: string) => void
): ColumnDef<FunnelListItem, any>[] {
  return [
    {
      id: 'name',
      accessorKey: 'name',
      size: 260,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('list.tableHeader.name')} />
      ),
      cell: ({ row }) => (
        <Link
          href={`/org/${orgId}/funnels/${row.original.id}/report`}
          className="block truncate text-s text-foreground hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {row.original.name}
        </Link>
      ),
      meta: {
        skeletonRender: () => <div className="h-4 bg-slate-200 rounded w-3/4" />,
      },
    },
    {
      id: 'total_entries',
      accessorFn: (row) => row.stats?.total_entries,
      size: 148,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t('list.tableHeader.totalEntered')}
          className="justify-center"
        />
      ),
      cell: ({ row }) => (
        <div className="text-center text-s font-medium text-slate-600">
          {row.original.stats?.total_entries != null
            ? row.original.stats.total_entries.toLocaleString()
            : '—'}
        </div>
      ),
      meta: {
        skeletonRender: () => (
          <div className="flex justify-center">
            <div className="h-4 bg-slate-200 rounded w-12" />
          </div>
        ),
      },
    },
    {
      id: 'total_conversions',
      accessorFn: (row) => row.stats?.total_conversions,
      size: 148,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t('list.tableHeader.conversions')}
          className="justify-center"
        />
      ),
      cell: ({ row }) => (
        <div className="text-center text-s font-medium text-slate-600">
          {row.original.stats?.total_conversions != null
            ? row.original.stats.total_conversions.toLocaleString()
            : '—'}
        </div>
      ),
      meta: {
        skeletonRender: () => (
          <div className="flex justify-center">
            <div className="h-4 bg-slate-200 rounded w-8" />
          </div>
        ),
      },
    },
    {
      id: 'dropoff',
      enableSorting: false,
      size: 148,
      header: () => (
        <div className="flex items-center justify-center px-2">
          <span className="text-s text-slate-500">{t('list.tableHeader.dropOff')}</span>
        </div>
      ),
      cell: ({ row }) => {
        const pos = row.original.stats?.biggest_dropoff_step_position
        const name = row.original.stats?.biggest_dropoff_step_name
        const nextName = row.original.stats?.biggest_dropoff_next_step_name
        const dropOffs = row.original.stats?.biggest_dropoff_drop_offs
        const rate = row.original.stats?.biggest_dropoff_rate
        if (pos == null) {
          return <div className="text-center text-s text-slate-400">—</div>
        }
        return (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-center gap-1 cursor-default">
                  <TrendingDown className="w-3.5 h-3.5 text-semantic-error shrink-0" />
                  <span className="text-xs text-semantic-error whitespace-nowrap">
                    {name ?? `Step ${pos}`}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="bg-white border border-slate-100 rounded-[6px] shadow-[0px_4px_8px_0px_rgba(5,27,68,0.08)] px-2 py-1 flex flex-col gap-1"
              >
                <span className="text-xs text-slate-500 whitespace-nowrap">
                  Step {pos}: {name ?? `Step ${pos}`}
                  {nextName && <> → {nextName}</>}
                </span>
                {dropOffs != null && rate != null && (
                  <span className="flex items-center gap-1 text-xs text-semantic-error whitespace-nowrap">
                    <TrendingDown className="w-3 h-3 shrink-0" />
                    {dropOffs.toLocaleString()} visitors dropped off ({rate.toFixed(1)}%)
                  </span>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      },
      meta: {
        skeletonRender: () => (
          <div className="flex justify-center">
            <div className="h-4 bg-slate-200 rounded w-16" />
          </div>
        ),
      },
    },
    {
      id: 'cvr',
      accessorFn: (row) => row.stats?.conversion_rate,
      size: 148,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t('list.tableHeader.cvr')}
          className="justify-center"
        />
      ),
      cell: ({ row }) => {
        const cvr = row.original.stats?.conversion_rate
        const trend = row.original.stats?.cvr_trend
        if (cvr == null) return <div className="text-center text-s text-slate-400">—</div>
        const isUp = trend != null && trend >= 0
        const cell = (
          <div className="flex items-center justify-center gap-2 cursor-default">
            <span className="text-s font-medium text-slate-700">{Math.round(cvr)}%</span>
            {trend != null && trend !== 0 && (
              <span
                className={cn(
                  'flex items-center gap-0.5 text-xs',
                  isUp ? 'text-semantic-success' : 'text-semantic-warning'
                )}
              >
                {isUp ? (
                  <MoveUp className="w-3 h-3 shrink-0" />
                ) : (
                  <MoveDown className="w-3 h-3 shrink-0" />
                )}
                {Math.abs(trend).toFixed(1)}%
              </span>
            )}
          </div>
        )
        if (trend == null) return cell
        return (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>{cell}</TooltipTrigger>
              <TooltipContent
                side="top"
                className="bg-white border border-slate-100 rounded-[6px] shadow-[0px_4px_8px_0px_rgba(5,27,68,0.08)] px-2 py-1"
              >
                <span className="flex items-center gap-1 text-xs whitespace-nowrap">
                  <span className={cn('flex items-center', isUp ? 'text-semantic-success' : 'text-semantic-warning')}>
                    {isUp ? <MoveUp className="w-3 h-3 shrink-0" /> : <MoveDown className="w-3 h-3 shrink-0" />}
                    {Math.abs(trend).toFixed(1)}%
                  </span>
                  <span className="text-slate-500">vs previous 7 days</span>
                </span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      },
      meta: {
        skeletonRender: () => (
          <div className="flex justify-center gap-2">
            <div className="h-4 bg-slate-200 rounded w-10" />
            <div className="h-4 bg-slate-200 rounded w-12" />
          </div>
        ),
      },
    },
    {
      id: 'action',
      enableSorting: false,
      enableHiding: false,
      size: 80,
      header: ({ table }) => (
        <div className="flex justify-center">
          <FunnelColumnToggle table={table as Table<FunnelListItem>} />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="h-9 w-9">
                <MoreHorizontal className="h-[18px] w-[18px]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="rounded-[4px] p-[4px] border-slate-100 shadow-[0px_4px_8px_rgba(5,27,68,0.08)] min-w-[160px]"
            >
              <DropdownMenuItem asChild className="rounded-[4px] px-4 py-[6px] text-s text-slate-700 flex items-center justify-between">
                <Link href={`/org/${orgId}/funnels/${row.original.id}/report`}>
                  {t('card.report')}
                  <BarChart2 className="h-4 w-4 text-slate-400 shrink-0" />
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="rounded-[4px] px-4 py-[6px] text-s text-slate-700 flex items-center justify-between">
                <Link href={`/org/${orgId}/funnels/${row.original.id}/edit`}>
                  {t('card.edit')}
                  <Pencil className="h-4 w-4 text-slate-400 shrink-0" />
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="rounded-[4px] px-4 py-[6px] text-s flex items-center justify-between text-destructive focus:text-destructive"
                onClick={() => onDelete(row.original.id)}
              >
                {t('list.delete')}
                <Trash2 className="h-4 w-4 shrink-0" />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
      meta: {
        skeletonRender: () => (
          <div className="flex justify-center">
            <div className="h-9 w-9 bg-slate-200 rounded" />
          </div>
        ),
      },
    },
  ]
}

export const FunnelsList = () => {
  const { t, i18n } = useTranslation('funnels')
  const { t: tSetup } = useTranslation('smart_setup')
  const { org_id } = useParams<{ org_id: string }>()
  const { orgRouterPush } = useOrganizationStoreProvider()

  const [smartSetupOpen, setSmartSetupOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

  const { data, isLoading } = useGetFunnels(org_id, { search, pagination, sorting })
  const { mutateAsync: deleteFunnel } = useDeleteFunnel(org_id)
  const { confirm } = useConfirmDialog()

  const funnels = data?.data ?? []
  const rowCount = data?.rowCount ?? 0

  const handleDelete = (funnelId: string) => {
    const funnel = funnels.find((f) => f.id === funnelId)
    confirm({
      title: t('list.deleteTitle'),
      description: t('list.deleteDesc', { name: funnel?.name ?? 'this funnel' }),
      confirmButtonText: t('list.delete'),
      cancelButtonText: t('list.cancel'),
      onConfirm: async () => {
        await deleteFunnel(funnelId)
      },
    })
  }

  const columns = useMemo(
    () => buildColumns(t, org_id, handleDelete),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, org_id]
  )

  const tableRef = useRef<TableV2Ref<FunnelListItem>>(null)

  const table = useReactTable<FunnelListItem>({
    data: funnels,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    enableSorting: true,
    enableSortingRemoval: true,
    state: { pagination, sorting, columnVisibility },
    rowCount,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    enableRowSelection: false,
    getRowId: (row) => row.id,
  })

  const isTrulyEmpty = !isLoading && data !== undefined && rowCount === 0 && !search

  if (isTrulyEmpty) {
    return (
      <>
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Funnel className="w-12 h-12 text-slate-400" />
          <div className="text-center">
            <h3 className="text-base font-medium text-foreground">{t('list.noFunnels')}</h3>
            <p className="text-s text-slate-500 mt-1">{t('list.noFunnelsDesc')}</p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <Link href={`/org/${org_id}/funnels/new`}>
              <Button className="gap-1.5">
                <Plus className="w-4 h-4" />
                {t('list.createFunnel')}
              </Button>
            </Link>
            <SmartSetupTrigger
              orgId={org_id}
              variant="funnels"
              onClick={() => setSmartSetupOpen(true)}
            />
          </div>
        </div>
        <Sheet open={smartSetupOpen} onOpenChange={setSmartSetupOpen}>
          <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{tSetup('title')}</SheetTitle>
            </SheetHeader>
            <SmartSetupResults
              orgId={org_id}
              locale={i18n.language as 'en' | 'vi'}
              onComplete={() => setSmartSetupOpen(false)}
              onSkip={() => setSmartSetupOpen(false)}
            />
          </SheetContent>
        </Sheet>
      </>
    )
  }

  return (
    <>
      <TableV2WithRef
        ref={tableRef}
        data={funnels}
        table={table}
        pagination={pagination}
        setPagination={setPagination}
        sorting={sorting}
        setSorting={setSorting}
        rowCount={rowCount}
        isLoading={isLoading}
        enableRowSelection={false}
        onRowClick={(row) => orgRouterPush(`funnels/${row.original.id}/report`)}
        wrapperClassName="border border-slate-300 rounded-lg"
        headerClassName="bg-slate-50"
        className="[&_td]:px-4 [&_th]:px-4"
        toolsRender={() => (
          <div className="flex items-center justify-between mb-4">
            <DataFilterItem
              name="search"
              type="search"
              placeholder={t('list.tableHeader.search')}
              setSearch={(val) => {
                setSearch(val ?? '')
                setPagination((p) => ({ ...p, pageIndex: 0 }))
              }}
              search={search}
              className="w-[250px]"
            />
            <Link href={`/org/${org_id}/funnels/new`}>
              <Button className="gap-1">
                <Plus className="w-5 h-5" />
                {t('list.newFunnel')}
              </Button>
            </Link>
          </div>
        )}
        emptyRender={() => (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-500">
            <Funnel className="w-8 h-8 text-slate-300" />
            <span className="text-s">{t('list.noFunnels')}</span>
          </div>
        )}
      />
      <Sheet open={smartSetupOpen} onOpenChange={setSmartSetupOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{tSetup('title')}</SheetTitle>
          </SheetHeader>
          <SmartSetupResults
            orgId={org_id}
            locale={i18n.language as 'en' | 'vi'}
            onComplete={() => setSmartSetupOpen(false)}
            onSkip={() => setSmartSetupOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  )
}
