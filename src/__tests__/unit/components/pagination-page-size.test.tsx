// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { getCoreRowModel, useReactTable } from '@tanstack/react-table'

import { Pagination } from '@/shared/components/customize/pagination'
import { DataTablePagination } from '@/shared/components/customize/table/table-pagination'

/**
 * Radix `Select` chỉ dựng `SelectItem` sau một thao tác chuột thật (pointer capture), thứ jsdom
 * không có. Thay primitives bằng markup phẳng để các lựa chọn luôn nằm trong DOM — điều cần kiểm
 * ở đây là **tập page size** mà component sinh ra, không phải hành vi đóng/mở của dropdown.
 */
vi.mock('@/shared/components/ui/select', () => ({
  Select: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid="page-size-select" data-value={value}>
      {children}
    </div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => null,
  SelectItem: ({ value }: { value: string }) => <div data-testid="page-size-option">{value}</div>,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const renderedPageSizes = () =>
  screen.getAllByTestId('page-size-option').map((el) => el.textContent)

describe('Pagination — lựa chọn số dòng mỗi trang', () => {
  /** Component dựng selector hai lần (bản desktop và bản mobile), nên so sánh theo tập giá trị. */
  it('render đúng 20/50/100 khi truyền availablePageSize', () => {
    render(
      <Pagination
        pageSize={20}
        pageIndex={0}
        rowCount={120}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
        availablePageSize={[20, 50, 100]}
      />
    )

    expect([...new Set(renderedPageSizes())]).toEqual(['20', '50', '100'])
    expect(screen.getAllByTestId('page-size-select')[0].getAttribute('data-value')).toBe('20')
  })
})

/** Danh sách short link và artifact đi qua TableV2 → DataTablePagination, nên kiểm cả nhánh này. */
const TableHarness = ({
  pageSize,
  availablePageSize,
}: {
  pageSize: number
  availablePageSize: number[]
}) => {
  const table = useReactTable<{ id: string }>({
    data: [],
    columns: [{ id: 'id', accessorKey: 'id' }],
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    rowCount: 120,
    state: { pagination: { pageIndex: 0, pageSize } },
  })
  return (
    <DataTablePagination
      table={table}
      enableRowSelection={false}
      availablePageSize={availablePageSize}
    />
  )
}

describe('DataTablePagination — lựa chọn số dòng mỗi trang', () => {
  it('render đúng 20/50/100 với pageSize mặc định 20', () => {
    render(<TableHarness pageSize={20} availablePageSize={[20, 50, 100]} />)
    expect(renderedPageSizes()).toEqual(['20', '50', '100'])
  })

  it('không bỏ mất pageSize đang dùng nếu nó nằm ngoài danh sách', () => {
    render(<TableHarness pageSize={5} availablePageSize={[20, 50, 100]} />)
    expect(renderedPageSizes()).toEqual(['5', '20', '50', '100'])
  })
})
