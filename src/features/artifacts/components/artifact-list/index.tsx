'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { getCoreRowModel, useReactTable, type PaginationState } from '@tanstack/react-table'
import { CalendarFoldIcon, TrashIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { ArtifactDTO } from '@/core/types/artifact.type'
import { TableV2WithRef, TableV2Ref } from '@/shared/components/customize/table-v2/table'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { DataFilterItem } from '@/shared/components/customize/data-filters/data-filter-item'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { useConfirmDialog } from '@/shared/components/customize/confirm-dialog'

import { useDeleteArtifact, useGetArtifacts, useArtifactQuota } from '../../hooks/use-artifacts'
import { formatBytes } from '../../utils/format-bytes'
import { artifactColumns } from './columns'
import { ArtifactCardSkeleton } from './artifact-card-skeleton'
import { ArtifactEmptyState } from './artifact-empty-state'
import { ArtifactQuickPublish } from '../artifact-quick-publish'

/** Bù phần cuối ngày cho mốc "đến" của bộ lọc ngày (24h - 1ms). */
const END_OF_DAY_MS = 24 * 60 * 60 * 1000 - 1

export const ArtifactList = () => {
  const { org_id }: { org_id: string } = useParams()
  const { t } = useTranslation(['artifact', 'common'])
  const { confirm } = useConfirmDialog()

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 20 })
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Record<string, any>>({})

  const debouncedSearch = useDebounce(search, 400)

  // `date_range` giữ mốc dạng timestamp ms; API nhận ISO.
  const createdAt = filters.created_at as { from?: number; to?: number } | undefined
  const listParams = useMemo(
    () => ({
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
      search: debouncedSearch.trim() || undefined,
      from_date: createdAt?.from ? new Date(createdAt.from).toISOString() : undefined,
      // Người dùng chọn một NGÀY, không phải một thời điểm: lấy nguyên ngày đó kể cả phần cuối
      // ngày, nếu không artifact tạo lúc 15h của ngày "đến" sẽ bị rơi khỏi kết quả.
      to_date: createdAt?.to ? new Date(createdAt.to + END_OF_DAY_MS).toISOString() : undefined,
      status: (filters.status as string[] | undefined)?.join(',') || undefined,
    }),
    [pagination, debouncedSearch, createdAt?.from, createdAt?.to, filters.status]
  )

  // Đổi bộ lọc mà đang ở trang 5 thì kết quả mới chỉ có 1 trang → bảng trống mà không ai hiểu vì
  // sao. Về trang đầu mỗi lần điều kiện đổi.
  useEffect(() => {
    setPagination((p) => (p.pageIndex === 0 ? p : { ...p, pageIndex: 0 }))
  }, [debouncedSearch, createdAt?.from, createdAt?.to, filters.status])

  const { data, isLoading } = useGetArtifacts(org_id, listParams)
  const { data: quota } = useArtifactQuota(org_id)
  const { mutateAsync: deleteArtifact, isPending: isDeleting } = useDeleteArtifact(org_id)

  const rows = useMemo(() => data?.data ?? [], [data?.data])

  const table = useReactTable<ArtifactDTO>({
    data: rows,
    columns: artifactColumns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    enableSorting: false,
    enableRowSelection: true,
    state: { pagination },
    rowCount: data?.rowCount,
    onPaginationChange: setPagination,
    getRowId: (row) => row.id,
  })

  const tableRef = useRef<TableV2Ref<ArtifactDTO>>(null)
  const isEmpty = !isLoading && rows.length === 0
  const selectedRows = table.getSelectedRowModel().rows
  const hasSomeSelected = selectedRows.length > 0

  /**
   * Không có endpoint xoá hàng loạt — lặp `DELETE` từng id. Chạy tuần tự, không `Promise.all`: mỗi
   * lần xoá đã invalidate danh sách và quota, và năm request song song kéo theo năm lượt refetch
   * cho một thao tác.
   */
  const deleteSelected = async () => {
    if (!selectedRows.length) return
    const ok = await confirm({
      title: t('artifact:list.bulk_delete_title', { count: selectedRows.length }),
      description: t('artifact:detail.delete_confirm_description'),
      confirmButtonText: t('artifact:detail.delete_confirm_action'),
      cancelButtonText: t('common:buttons.cancel'),
    })
    if (!ok) return

    const ids = selectedRows.map((r) => r.original.id)
    let deleted = 0
    for (const id of ids) {
      try {
        await deleteArtifact(id)
        deleted += 1
      } catch {
        // Hàng nào hỏng thì dừng ở đó; toast nói đúng số đã xoá chứ không nói số đã chọn.
        break
      }
    }
    table.resetRowSelection()
    if (deleted > 0) toast.success(t('artifact:list.bulk_deleted', { count: deleted }))
    if (deleted < ids.length) toast.error(t('artifact:errors.generic'))
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4">
      <TableV2WithRef
        ref={tableRef}
        data={rows}
        table={table}
        pagination={isEmpty ? undefined : pagination}
        setPagination={setPagination}
        availablePageSize={[20, 50, 100]}
        rowCount={data?.rowCount}
        isLoading={isLoading}
        isDeleting={isDeleting}
        loadingRender={() => (
          <>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                <td className="!p-0 !border-0">
                  <ArtifactCardSkeleton />
                </td>
              </tr>
            ))}
          </>
        )}
        enableRowSelection={false}
        enableTableHeader={false}
        className="border-separate border-spacing-y-3 bg-transparent table-fixed"
        wrapperClassName={
          isEmpty ? 'hidden' : '[&_td]:!p-0 [&_tr]:!bg-transparent [&_td]:!border-0'
        }
        toolsRender={() => (
          <div className="flex flex-col gap-4">
            {/* Thả file là có link ngay; trang tạo đầy đủ vẫn còn cho ai cần đặt tên hay mật khẩu. */}
            <ArtifactQuickPublish />
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <span className="max-w-[420px] text-xs text-slate-500">
                {t('artifact:list.empty.description')}
              </span>
              {/* Lọc chạy ở SERVER (`GET …/artifacts` nhận search/from_date/to_date/status), không
                  lọc mảng của trang hiện tại — lọc phía client sẽ đúng với 20 hàng đang xem và
                  nói dối về phần còn lại. */}
              <div className="flex flex-wrap items-center gap-2">
                <DataFilterItem
                  className="w-full sm:w-[250px]"
                  name="search"
                  placeholder={t('artifact:list.tools.search_placeholder')}
                  type="search"
                  search={search}
                  setSearch={setSearch}
                />
                <DataFilterItem
                  name="created_at"
                  label={t('common:filter.search_by_created_at')}
                  placeholder={t('common:filter.search_by_created_at')}
                  type="date_range"
                  setFilter={(key, value) => setFilters((f) => ({ ...f, [key]: value }))}
                  filters={filters}
                  Icon={CalendarFoldIcon}
                />
                <DataFilterItem
                  name="status"
                  label={t('artifact:list.tools.status')}
                  placeholder={t('artifact:list.tools.status')}
                  type="select"
                  options={[
                    { label: t('artifact:status.live.badge'), value: 'live' },
                    { label: t('artifact:status.draft.badge'), value: 'draft' },
                  ]}
                  setFilter={(key, value) => setFilters((f) => ({ ...f, [key]: value }))}
                  filters={filters}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 border-b-2 border-slate-50 px-2">
              <div className="flex items-center gap-2 px-2">
                <Checkbox
                  aria-label={t('artifact:list.select_all')}
                  checked={
                    table.getIsAllPageRowsSelected() ||
                    (table.getIsSomePageRowsSelected() && 'indeterminate')
                  }
                  onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                />
              </div>

              {hasSomeSelected ? (
                <div className="flex items-center gap-2">
                  <LoadingButton
                    type="button"
                    size="icon"
                    variant="ghost"
                    isLoading={isDeleting}
                    aria-label={t('artifact:list.bulk_delete')}
                    className="text-semantic-error"
                    onClick={deleteSelected}
                  >
                    <TrashIcon className="size-[18px]" />
                  </LoadingButton>
                  <span className="text-s font-medium text-slate-500">
                    {t('artifact:list.selected_count', { count: selectedRows.length })}
                  </span>
                </div>
              ) : (
                <span className="flex-1 px-2 py-1 text-s font-medium text-slate-500">
                  {t('artifact:list.select_all')}
                </span>
              )}

              {quota && (
                <span className="ml-auto text-xs text-slate-500">
                  {t('artifact:list.summary', {
                    total: data?.rowCount ?? rows.length,
                    live: quota.live_count,
                    liveQuota: quota.live_quota,
                    used: formatBytes(quota.used_bytes),
                    quota: formatBytes(quota.quota_bytes),
                  })}
                </span>
              )}
            </div>
          </div>
        )}
      />

      {isEmpty && <ArtifactEmptyState />}
    </div>
  )
}
