import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { useTranslation } from 'react-i18next'
import { useMemo } from 'react'
import { cn } from '@/shared/lib/utils'

type PaginationProps = {
  pageSize: number
  pageIndex: number
  rowCount: number
  onPageChange: (pageIndex: number) => void
  onPageSizeChange: (pageSize: number) => void
  availablePageSize?: number[]
}

export const Pagination = ({
  pageSize,
  pageIndex,
  rowCount,
  onPageChange,
  onPageSizeChange,
  availablePageSize = [10, 20, 30, 40, 50],
}: PaginationProps) => {
  const { t } = useTranslation('common')

  const listPageSize = useMemo(() => {
    return Array.from(new Set([...availablePageSize, pageSize].sort((a, b) => a - b)))
  }, [pageSize, availablePageSize])

  const pageCount = Math.ceil(rowCount / pageSize)
  const canPreviousPage = pageIndex > 0
  const canNextPage = pageIndex < pageCount - 1

  const navButtonClass = cn(
    'flex items-center justify-center p-1 rounded-[6px] border border-slate-50',
    'text-slate-500 hover:border-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
  )

  const NavButtons = () => (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        className={navButtonClass}
        onClick={() => onPageChange(0)}
        disabled={!canPreviousPage}
      >
        <span className="sr-only">Go to first page</span>
        <ChevronsLeft className="size-6" />
      </button>
      <button
        type="button"
        className={navButtonClass}
        onClick={() => onPageChange(pageIndex - 1)}
        disabled={!canPreviousPage}
      >
        <span className="sr-only">Go to previous page</span>
        <ChevronLeft className="size-6" />
      </button>
      <button
        type="button"
        className={navButtonClass}
        onClick={() => onPageChange(pageIndex + 1)}
        disabled={!canNextPage}
      >
        <span className="sr-only">Go to next page</span>
        <ChevronRight className="size-6" />
      </button>
      <button
        type="button"
        className={navButtonClass}
        onClick={() => onPageChange(pageCount - 1)}
        disabled={!canNextPage}
      >
        <span className="sr-only">Go to last page</span>
        <ChevronsRight className="size-6" />
      </button>
    </div>
  )

  const PageSizeSelector = () => (
    availablePageSize.length > 0 ? (
      <div className="flex items-center gap-6">
        <p className="text-sm font-medium text-slate-600 whitespace-nowrap">
          {t('pagination.row_per_page')}
        </p>
        <Select
          value={`${pageSize}`}
          onValueChange={(value) => onPageSizeChange(Number(value))}
        >
          <SelectTrigger
            isArrow={false}
            className="h-auto px-2 py-1 rounded-[6px] border-slate-100 text-slate-500 flex items-center gap-0.5 w-fit"
          >
            <SelectValue placeholder={pageSize} />
            <ChevronsUpDown className="size-3" />
          </SelectTrigger>
          <SelectContent side="top">
            {listPageSize.map((size) => (
              <SelectItem key={size} value={`${size}`}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    ) : null
  )

  const PageInfo = () => (
    <p className="text-sm font-medium text-slate-600 whitespace-nowrap">
      {t('pagination.page', {
        page: pageIndex + 1,
        total: pageCount,
      })}
    </p>
  )

  return (
    <>
      {/* Desktop: single row */}
      <div className="hidden lg:flex items-center justify-end gap-6">
        <PageSizeSelector />
        <PageInfo />
        <NavButtons />
      </div>

      {/* Mobile: two stacked rows, right-aligned */}
      <div className="flex lg:hidden flex-col items-end gap-4">
        <PageSizeSelector />
        <div className="flex items-center gap-6">
          <PageInfo />
          <NavButtons />
        </div>
      </div>
    </>
  )
}
