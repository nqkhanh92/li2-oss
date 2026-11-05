import { Table } from '@tanstack/react-table'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
} from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { useTranslation } from 'react-i18next'
import { useMemo } from 'react'
interface DataTablePaginationProps<TData> {
  table: Table<TData>
  availablePageSize?: number[]
  enableRowSelection: boolean
}

export function DataTablePagination<TData>({
  table,
  availablePageSize = [10, 20, 30, 40, 50],
  enableRowSelection,
}: DataTablePaginationProps<TData>) {
  const { t } = useTranslation('common')
  const listPageSize = useMemo(() => {
    return Array.from(
      new Set([...availablePageSize, table.getState().pagination.pageSize].sort((a, b) => a - b))
    )
  }, [table, availablePageSize])

  return (
    <div className="flex items-center lg:justify-between justify-end px-2">
      <div className="lg:flex hidden flex-1 text-sm text-muted-foreground">
        {enableRowSelection && (
          <>
            {t('pagination.row_selected', {
              row: table.getFilteredSelectedRowModel().rows.length,
              total: table.getFilteredRowModel().rows.length,
            })}
          </>
        )}
      </div>
      <div className="flex items-center space-x-6 lg:space-x-8 text-slate-600">
        <div className="hidden md:flex items-center space-x-2">
          <p className="text-sm font-medium">{t('pagination.row_per_page')}</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value))
            }}
          >
            <SelectTrigger
              isArrow={false}
              className="h-8 w-fit rounded-[8px] text-slate-500 flex gap-1"
            >
              <SelectValue placeholder={table.getState().pagination.pageSize} />
              <ChevronsUpDown className="w-3 h-3" />
            </SelectTrigger>
            <SelectContent side="top">
              {listPageSize.map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-[100px] items-center justify-center text-sm font-medium text-nowrap">
          {t('pagination.page', {
            page: table.getState().pagination.pageIndex + 1,
            total: table.getPageCount(),
          })}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="secondary"
            className="h-8 w-8 p-0 lg:flex rounded-[8px] bg-transparent border border-slate-50 text-slate-500 hover:text-slate-500 hover:border-slate-50"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Go to first page</span>
            <ChevronsLeft />
          </Button>
          <Button
            variant="secondary"
            className="h-8 w-8 p-0 flex rounded-[8px] bg-transparent border border-slate-50 text-slate-500 hover:text-slate-500 hover:border-slate-50"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeft />
          </Button>
          <Button
            variant="secondary"
            className="h-8 w-8 p-0 flex rounded-[8px] bg-transparent border border-slate-50 text-slate-500 hover:text-slate-500 hover:border-slate-50"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRight />
          </Button>
          <Button
            variant="secondary"
            className="h-8 w-8 p-0 flex rounded-[8px] bg-transparent border border-slate-50 text-slate-500 hover:text-slate-500 hover:border-slate-50"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Go to last page</span>
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  )
}
