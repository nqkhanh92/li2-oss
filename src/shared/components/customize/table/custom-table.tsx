'use client'

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  SortingState,
  Table as TableInstance,
  useReactTable,
  VisibilityState,
} from '@tanstack/react-table'
import { DataTablePagination } from './table-pagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { DataTableViewOptions } from './column-toggle'
import { PaginationState } from '@/shared/hooks/use-filters'
import { Dispatch, ForwardedRef, forwardRef, SetStateAction, useImperativeHandle, useState } from 'react'
import { Checkbox } from '../../ui/checkbox'
import { Loader2, TrashIcon } from 'lucide-react'
import { ConfirmButton } from '../confirm-button'
import { cn } from '@/shared/lib/utils'
import { useTranslation } from 'react-i18next'

interface CustomTableProps<TData extends { id: string }, TValue = any> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  availablePageSize?: number[]
  pagination?: {
    pageIndex: number
    pageSize: number
  }
  setPagination?: Dispatch<SetStateAction<PaginationState>>
  setSorting?: Dispatch<SetStateAction<SortingState>>
  rowCount?: number
  sorting?: SortingState
  extras?: React.ReactNode
  enableRowSelection?: boolean
  enableColumnToggle?: boolean
  onDeleteSelected?: ({
    selectedRows,
    callback,
  }: {
    selectedRows: Record<string, boolean>
    callback?: () => void
  }) => void
  onRowClick?: (row: TData) => void
  isLoading?: boolean
  isDeleting?: boolean
  className?: string
  enableSpacing?: boolean
  isHeadless?: boolean
  enableTableTool?: boolean
  rightExtras?: React.ReactNode
  renderTools?: (table: TableInstance<TData>) => React.ReactNode
  enableBulkDelete?: boolean
  initialColumnVisibility?: VisibilityState
}

export type TableRef = {
  getTable: () => TableInstance<any>
}
const TableComponent = <TData extends { id: string }, TValue>(
  {
    columns,
    data,
    pagination,
    setPagination,
    setSorting,
    availablePageSize,
    rowCount,
    sorting,
    extras,
    enableRowSelection = false,
    enableColumnToggle = true,
    enableSpacing = true,
    onDeleteSelected,
    onRowClick,
    isLoading,
    isDeleting,
    className,
    isHeadless = false,
    enableTableTool = true,
    rightExtras,
    renderTools,
    enableBulkDelete = true,
    initialColumnVisibility = {},
  }: CustomTableProps<TData, TValue>,
  ref: ForwardedRef<TableRef>
) => {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(initialColumnVisibility)
  const leftColumns: ColumnDef<TData, TValue>[] = enableRowSelection
    ? [
        {
          id: 'select',
          header: ({ table }: { table: any }) => (
            <Checkbox
              className="ml-2 mr-2 lg:mr-1 max-w-10"
              checked={
                table.getIsAllPageRowsSelected() ||
                (table.getIsSomePageRowsSelected() && 'indeterminate')
              }
              onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
              aria-label="Select all"
            />
          ),
          cell: ({ row }: { row: any }) => (
            <Checkbox
              className="mx-2 mr-2 lg:mr-1 max-w-10"
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label="Select row"
            />
          ),
          enableSorting: false,
          enableHiding: false,
        },
      ]
    : []
  const finalColumns = [...leftColumns, ...columns]
  const table = useReactTable({
    columns: finalColumns,
    data,
    manualPagination: true,
    manualSorting: true,
    enableSorting: true,
    enableSortingRemoval: true,
    state: {
      pagination,
      sorting,
      columnVisibility,
    },
    rowCount: rowCount,
    getCoreRowModel: getCoreRowModel(),
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    enableRowSelection,
    getRowId: (row) => row.id,
  })

  const { t } = useTranslation('common')
  useImperativeHandle(ref, () => ({
    getTable: () => table,
  }))

  return (
    <div className={enableSpacing ? 'space-y-4' : ''}>
      {enableTableTool && (
        <div className="flex justify-between items-end">
          <div className="flex gap-4 items-end flex-wrap lg:flex-nowrap w-full">
            {(table.getIsSomePageRowsSelected() || table.getIsAllPageRowsSelected()) &&
              enableBulkDelete && (
                <ConfirmButton
                  title={t('table.warning')}
                  onConfirm={() => {
                    onDeleteSelected?.({
                      selectedRows: table.getState().rowSelection,
                      callback: () => {
                        table.resetRowSelection()
                      },
                    })
                  }}
                  variant={'destructive'}
                  className="w-10 h-10 text-red-500 bg-red-100 hover:text-white"
                >
                  {isDeleting ? <Loader2 className="animate-spin" /> : <TrashIcon />}
                </ConfirmButton>
              )}
            {extras}
          </div>
          <div className="h-10 items-center gap-4 md:flex hidden">
            {enableColumnToggle && columns.length > 1 && <DataTableViewOptions table={table} />}
            {rightExtras}
          </div>
        </div>
      )}
      {renderTools?.(table)}
      <div className="rounded-md">
        <Table className={cn('overflow-hidden', className)}>
          {!isHeadless && (
            <TableHeader className="px-8 [&_tr]:border-b-slate-50">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead
                        key={header.id}
                        className={header.id === 'select' ? 'w-10' : 'px-2'}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
          )}
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
                  onClick={
                    onRowClick
                      ? (e) => {
                          e.stopPropagation()
                          onRowClick(row.original)
                        }
                      : undefined
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={finalColumns.length} className="h-24 text-center">
                  <div className="flex justify-center items-center w-full">
                    {isLoading ? <Loader2 className="animate-spin " /> : t('common:form.no_data')}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div>
        {pagination && (
          <DataTablePagination
            enableRowSelection={enableRowSelection}
            table={table}
            availablePageSize={availablePageSize}
          />
        )}
      </div>
    </div>
  )
}

export const CustomTable = forwardRef<TableRef, CustomTableProps<any>>(TableComponent)
CustomTable.displayName = 'CustomTable'
