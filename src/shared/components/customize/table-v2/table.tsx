import {
  CellContext,
  ColumnDef,
  flexRender,
  getCoreRowModel,
  HeaderContext,
  Row,
  RowData,
  useReactTable,
} from '@tanstack/react-table'

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    skeletonRender?: () => React.ReactNode
  }
}
import { Checkbox } from '@/shared/components/ui/checkbox'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table'
import { cn } from '@/shared/lib/utils'
import { DataTablePagination } from '../table/table-pagination'
import { DataTableViewOptions } from '../table/column-toggle'
import {
  Dispatch,
  ForwardedRef,
  forwardRef,
  ReactNode,
  SetStateAction,
  useImperativeHandle,
  useMemo,
  useTransition,
} from 'react'
import { PaginationState, SortingState } from '@/shared/hooks/use-filters'
import { Loader2, Trash2Icon } from 'lucide-react'
import { LoadingButton } from '../loading-button'

export type TableV2Ref<TData extends { id: string }> = {
  getTable: () => ReturnType<typeof useReactTable<TData>>
}

type TableV2Props<TData extends { id: string }, TValue> = {
  data: TData[]

  setPagination?: Dispatch<SetStateAction<PaginationState>>
  setSorting?: Dispatch<SetStateAction<SortingState>>
  rowCount?: number
  sorting?: SortingState

  className?: string
  wrapperClassName?: string
  bodyClassName?: string
  headerClassName?: string
  rowClassname?: string

  columns?: ColumnDef<TData, TValue>[]
  children?: React.ReactNode
  table?: ReturnType<typeof useReactTable<TData>>
  actionsRender?: (row: Row<TData>) => React.ReactNode
  toolsRender?: ({
    table,
    viewOptionsComponent,
    renderViewOptionButton,
  }: {
    table: ReturnType<typeof useReactTable<TData>>
    viewOptionsComponent: React.ReactNode
    renderViewOptionButton: (button: ReactNode) => ReactNode
  }) => React.ReactNode
  onRowClick?: (row: Row<TData>, table: ReturnType<typeof useReactTable<TData>>) => void
  onBulkDelete?: (rows: Row<TData>[]) => Promise<void> | void

  // Pagination
  availablePageSize?: number[]
  pagination?: {
    pageIndex: number
    pageSize: number
  }

  enableRowSelection?: boolean
  enableTableHeader?: boolean

  isLoading?: boolean
  isDeleting?: boolean
  excludeIds?: string[]
  loadingRender?: () => React.ReactNode
  emptyRender?: () => React.ReactNode
  footer?: React.ReactNode
}
const TableV2 = <TData extends { id: string }, TValue>(
  {
    data,

    setPagination,
    setSorting,
    rowCount,
    sorting,

    className,
    wrapperClassName,
    bodyClassName,
    headerClassName,
    rowClassname,

    columns: _columns,
    children,
    table: _table,
    actionsRender,
    toolsRender,
    onRowClick,
    onBulkDelete,

    // Pagination
    availablePageSize = [10, 20, 30],
    pagination,

    enableRowSelection = true,
    enableTableHeader = true,
    isLoading = false,
    isDeleting = false,

    excludeIds = [],
    loadingRender,
    emptyRender,
    footer,
  }: TableV2Props<TData, TValue>,
  ref: ForwardedRef<TableV2Ref<TData>>
) => {
  const [bulkDeleteTransaction, startBulkDelete] = useTransition()

  const leftColumns: ColumnDef<TData, TValue>[] = []
  if (enableRowSelection) {
    leftColumns.push({
      id: 'select',
      header: () => (
        <div className="flex items-center gap-2 px-2">
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && 'indeterminate')
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          />
          {onBulkDelete && (
            <LoadingButton
              type="button"
              variant={'ghost'}
              size={'icon'}
              isLoading={bulkDeleteTransaction || isDeleting}
              onClick={() => {
                const selectedRows = table.getSelectedRowModel().rows
                if (onBulkDelete && selectedRows.length > 0) {
                  startBulkDelete(async () => {
                    await onBulkDelete(selectedRows)
                  })
                }
              }}
            >
              <Trash2Icon
                className={cn('h-4.5 w-4.5 text-semantic-error cursor-pointer', {
                  'opacity-0':
                    !table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected(),
                })}
              />
            </LoadingButton>
          )}
        </div>
      ),
      cell: ({ row }) => (
        <div className="px-2" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    })
  }

  const filteredData = useMemo(() => {
    return data.filter((item) => !excludeIds.includes(item.id))
  }, [data, excludeIds])

  const rightColumns: ColumnDef<TData, TValue>[] = [
    {
      id: 'actions',
      cell: ({ row }) => <div>{actionsRender?.(row)}</div>,
      enableSorting: false,
      enableHiding: false,
      header: () => null,
    },
  ]

  const table =
    _table ??
    useReactTable<TData>({
      data: filteredData,
      columns: [...leftColumns, ...(_columns || []), ...rightColumns],
      getCoreRowModel: getCoreRowModel(),
      manualPagination: true,
      manualSorting: true,
      enableSorting: true,
      enableSortingRemoval: true,
      state: {
        pagination,
        sorting,
      },
      rowCount: rowCount,
      onPaginationChange: setPagination,
      onSortingChange: setSorting,
      enableRowSelection,
      getRowId: (row) => row.id,
    })

  useImperativeHandle(ref, () => ({
    getTable: () => table,
  }))

  return (
    <div>
      <div>
        {toolsRender?.({
          table,
          viewOptionsComponent: <DataTableViewOptions table={table} />,
          renderViewOptionButton: (button) => (
            <DataTableViewOptions button={button} table={table} />
          ),
        })}
      </div>
      <div className={cn(wrapperClassName, 'overflow-x-auto overflow-y-auto')}>
        <table
          className={cn(
            'w-full caption-bottom text-sm rounded-lg bg-card overflow-hidden',
            className
          )}
        >
          {enableTableHeader && (
            <TableHeader className={cn('sticky top-0 z-10 bg-card', headerClassName)}>
              {table.getHeaderGroups().map((headerGroup) => (
                <>
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead
                          key={header.id}
                          className={cn(header.id === 'select' ? 'w-10 px-2' : 'px-2')}
                          style={
                            header.column.columnDef.size !== undefined &&
                            header.column.columnDef.size !== 150
                              ? { width: header.column.columnDef.size }
                              : undefined
                          }
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      )
                    })}
                  </TableRow>
                </>
              ))}
            </TableHeader>
          )}
          <TableBody className={cn(bodyClassName)}>
            {isLoading ? (
              loadingRender ? (
                <>{loadingRender()}</>
              ) : (() => {
                const visibleCols = table.getVisibleLeafColumns()
                const hasSkeletons = visibleCols.some((col) => col.columnDef.meta?.skeletonRender)
                if (hasSkeletons) {
                  const rowCount = table.getState().pagination?.pageSize ?? 10
                  return (
                    <>
                      {Array.from({ length: rowCount }).map((_, i) => (
                        <TableRow key={i} className="animate-pulse">
                          {visibleCols.map((col) => (
                            <TableCell
                              key={col.id}
                              className={cn(col.id === 'select' ? 'w-10 px-2' : 'px-2')}
                              style={
                                col.columnDef.size !== undefined && col.columnDef.size !== 150
                                  ? { width: col.columnDef.size }
                                  : undefined
                              }
                            >
                              {col.columnDef.meta?.skeletonRender?.()}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </>
                  )
                }
                return (
                  <TableRow>
                    <TableCell colSpan={table.getAllColumns().length} className="h-24 text-center">
                      <Loader2 className="animate-spin mx-auto w-6 h-6" />
                    </TableCell>
                  </TableRow>
                )
              })()
            ) : (
              <>
                {table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      onClick={() => onRowClick?.(row, table)}
                      key={row.id}
                      data-state={row.getIsSelected() && 'selected'}
                      className={cn(
                        'hover:bg-slate-50 data-[state=selected]:bg-slate-50',
                        onRowClick && 'cursor-pointer',
                        rowClassname
                      )}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className={cn(cell.column.id === 'select' ? 'w-10 px-2' : 'px-2')}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={table.getAllColumns().length} className="h-24 text-center">
                      {emptyRender ? emptyRender() : 'No data'}
                    </TableCell>
                  </TableRow>
                )}
              </>
            )}
          </TableBody>
          {footer && (
            <tfoot>
              <tr>
                <td colSpan={table.getAllColumns().length}>{footer}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <div className="mt-4">
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
const TableV2WithRef = forwardRef(TableV2) as <TData extends { id: string }, TValue>(
  props: TableV2Props<TData, TValue> & { ref?: React.Ref<TableV2Ref<TData>> }
) => React.ReactElement

export { TableV2, TableV2WithRef }
