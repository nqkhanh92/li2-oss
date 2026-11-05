'use client'
import { useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { useQueryClient } from '@tanstack/react-query'
import { TrashIcon, Settings, DownloadIcon, TrendingUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { TableV2WithRef, TableV2Ref } from '@/shared/components/customize/table-v2/table'
import { TableActionProvider } from '@/shared/providers/table-action-provider'
import { DataFilterItem } from '@/shared/components/customize/data-filters/data-filter-item'
import { Button } from '@/shared/components/ui/button'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { DropdownMenuItem, DropdownMenuShortcut } from '@/shared/components/ui/dropdown-menu'
import { useConfirmDialog } from '@/shared/components/customize/confirm-dialog'

import { useFilters } from '@/shared/hooks/use-filters'
import { useGetTouchPoints } from '@/features/touch-points/hooks/queries'
import { useBulkDeleteTouchPoint } from '@/features/touch-points/hooks/mutations'
import { usePlanFeatures } from '@/features/touch-points/hooks/use-plan-features'
import { useGetTagDropdowns } from '@/features/tags/hooks/queries'
import { useGetCollectionsDropdown } from '@/features/collections/hooks/queries'
import { useGetCustomDomainDropdown } from '@/features/custom-domains/hooks/queries'

import QRCodeStyling from 'qr-code-styling'
import type { Options } from 'qr-code-styling'
import { isSafari, downloadQrViaApi } from '@/shared/lib/utils'
import { getQrDefaultOptions } from '@/features/touch-points/constants'
import { PasteOrDrop } from './paste-or-drop'
import { ShortLinkFilterMenu } from './short-link-filter-menu'
import { touchPointV2Columns } from './columns'
import { TouchPointData } from './touchpoint-card'
import { ShortLinkCardSkeleton } from './short-link-card-skeleton'
import { getRowEditPath } from '@/features/short-links/utils/row-kind'
import { ShortLinkEmptyState } from './short-link-empty-state'
import { ShortLinkListStatus } from './short-link-list-status'
import { getShortLinkListState } from '@/features/short-links/utils/list-state'
import { artifactKeys } from '@/features/artifacts/hooks/use-artifacts'
import { AssistantStrip } from './assistant-strip'

export const ShortLinkList = () => {
  const { org_id }: { org_id: string } = useParams()
  const router = useRouter()
  const { t } = useTranslation(['touchpoint', 'common'])
  const { confirm } = useConfirmDialog()
  const queryClient = useQueryClient()
  // Deep-link analytics is Pro-only; hide the row action entirely for plans without it
  // (the page would upsell anyway). Within a Pro org it doubles as a discovery nudge.
  const { enableDeepLinkAttribution } = usePlanFeatures()


  const { pagination, setPagination, sorting, filters, search, setSorting, setFilter, setSearch } =
    useFilters({
      pagination: { pageIndex: 0, pageSize: 20 },
      search: '',
      sorting: [{ id: 'created_at', desc: true }],
    })

  const { data, isLoading, isError, refetch } = useGetTouchPoints(org_id, {
    pagination,
    search,
    sorting,
    filters,
  })

  const { mutate: bulkDelete, isPending: isDeleting } = useBulkDeleteTouchPoint(org_id, {
    noToast: true,
  })

  const { data: tags } = useGetTagDropdowns(org_id)
  // `collections` vẫn nạp cho hộp thoại "Chuyển vào space" — chỉ mục LỌC theo space bị bỏ.
  const { data: collectionsData } = useGetCollectionsDropdown(org_id)
  const collections = collectionsData?.data || []

  /**
   * Nguồn domain cho ô lọc: endpoint này trả CẢ domain hệ thống (`is_default`) lẫn domain tổ chức
   * tự thêm — đúng điều chủ sản phẩm chốt, và nhờ vậy 9 hàng `domain_id IS NULL` (phục vụ trên
   * domain hệ thống) có chỗ thay vì phải thêm một mục "không có tên miền" nghe như lỗi.
   */
  const { data: domainsData } = useGetCustomDomainDropdown(org_id)
  const domainOptions = (domainsData ?? [])
    // `name` nullable trong lược đồ; hàng không có tên thì không bày ra được một lựa chọn trống.
    .filter((d): d is typeof d & { name: string } => !!d.name)
    .map((d) => ({ label: d.name, value: d.id }))

  // External table instance — passed to TableV2WithRef so we control columns exactly
  const table = useReactTable<TouchPointData>({
    data: data?.data || [],
    columns: touchPointV2Columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    enableSorting: true,
    enableSortingRemoval: true,
    enableRowSelection: true,
    state: { pagination, sorting },
    rowCount: data?.rowCount,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getRowId: (row) => row.id,
  })

  const tableRef = useRef<TableV2Ref<TouchPointData>>(null)

  const onDeleteBulk = async () => {
    const selectedRows = table.getSelectedRowModel().rows
    if (!selectedRows.length) return

    const result = await confirm({
      title: t('common:buttons.delete', { field: t('common:label.short_link') }),
      description: t('common:messages.delete_dialog', { field: t('common:label.short_link') }),
    })
    if (!result) return

    const selectedIds = selectedRows.map((r) => r.original.id)
    bulkDelete(selectedIds, {
      onSuccess: () => {
        table.resetRowSelection()
        toast.success(
          t('common:messages.success.deleted_count', {
            count: selectedIds.length,
            field: '$t(common:label.short_link)',
          })
        )
      },
    })
  }

  const hasSomeSelected = table.getIsSomePageRowsSelected() || table.getIsAllPageRowsSelected()

  /**
   * Bốn trạng thái loại trừ nhau — lý do và thứ tự xét nằm ở `getShortLinkListState`.
   * `isEmpty` cũ (`rows.length === 0`) gộp cả lỗi tải và lọc-không-khớp vào "chưa có gì".
   */
  const listState = getShortLinkListState({
    isLoading,
    isError,
    rowCount: (data?.data || []).length,
    search,
    filters,
  })
  const showsRows = listState === 'loading' || listState === 'rows'

  /**
   * "Thử lại" phải tải lại CẢ header, không chỉ bảng.
   *
   * `refetch()` chỉ gọi lại query danh sách. Quota và số link là hai query riêng, nên nếu chỉ
   * `refetch()` thì bảng hồi phục mà header kẹt ở `— link · — artifact` vĩnh viễn — đo được trên
   * trình duyệt. Một nút tên là "Thử lại" mà chỉ sửa được nửa màn hình thì nửa kia thành hỏng
   * âm thầm, đúng thứ nhánh lỗi này sinh ra để tránh.
   */
  const retryAll = () => {
    refetch()
    queryClient.invalidateQueries({ queryKey: ['organizations', org_id, 'touch-points'] })
    queryClient.invalidateQueries({ queryKey: artifactKeys.quota(org_id) })
  }

  const clearAllFilters = () => {
    setSearch('')
    Object.keys(filters || {}).forEach((key) => setFilter(key, null))
  }

  return (
    <div className="flex flex-col gap-4 max-w-7xl mx-auto">
      <TableActionProvider
        actions={[
          {
            name: 'edit',
            label: t('common:buttons.edit', { field: '' }),
            /**
             * Hai loại sửa ở hai trang — lý do và cái bẫy "hai id khác nhau" ở `getRowEditPath`.
             * `router.push` cần tiền tố org đầy đủ; helper trả đường tương đối theo org.
             */
            action: (row) => {
              router.push(`/org/${org_id}${getRowEditPath(row)}`)
            },
          },
          {
            name: 'download_qr',
            label: t('common:buttons.download_qr'),
            render: (row) => {
              const data = row.original
              const hasQrOptions =
                data.qr_customize_options && Object.keys(data.qr_customize_options).length > 0
              const qrOptions: Options = hasQrOptions
                ? (data.qr_customize_options as Options)
                : getQrDefaultOptions(`${data.short_url}?t=1`)
              return (
                <DropdownMenuItem
                  key="download_qr"
                  className="text-slate-500 font-medium"
                  onClick={() => {
                    const options = {
                      ...qrOptions,
                      type: 'canvas' as const,
                      width: 512,
                      height: 512,
                    }
                    if (isSafari()) {
                      downloadQrViaApi(options)
                    } else {
                      new QRCodeStyling(options).download({
                        extension: 'png',
                        name: `qr-${data.id}`,
                      })
                    }
                  }}
                >
                  {t('common:buttons.download_qr')}
                  <DropdownMenuShortcut>
                    <DownloadIcon className="h-4 w-4" />
                  </DropdownMenuShortcut>
                </DropdownMenuItem>
              )
            },
          },
          ...(enableDeepLinkAttribution
            ? [
                {
                  name: 'deep_link_analytics',
                  label: t('touchpoint:actions.view_deep_link_analytics'),
                  icon: TrendingUp,
                  action: (row: TouchPointData) => {
                    router.push(`/org/${org_id}/deep-link-analytics?tp_ids=${row.id}`)
                  },
                },
              ]
            : []),
          {
            name: 'delete',
            label: t('common:buttons.delete', { field: '' }),
            warnTitle: t('common:buttons.delete', { field: t('common:label.short_link') }),
            warnDesc: t('common:messages.delete_dialog', { field: t('common:label.short_link') }),
            warnType: 'dialog' as const,
            action: (row: any, options: any) => {
              bulkDelete([row.id], {
                onSuccess: () => {
                  options?.onSuccess?.()
                  toast.success(
                    t('common:messages.success.deleted', {
                      field: '$t(common:label.short_link)',
                    })
                  )
                },
              })
            },
            isLoading: isDeleting,
          },
        ]}
      >
        <TableV2WithRef
          ref={tableRef}
          data={data?.data || []}
          table={table}
          pagination={showsRows ? pagination : undefined}
          setPagination={setPagination}
          availablePageSize={[20, 50, 100]}
          sorting={sorting}
          setSorting={setSorting}
          rowCount={data?.rowCount}
          isLoading={isLoading}
          isDeleting={isDeleting}
          loadingRender={() => (
            <>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="!p-0 !border-0">
                    <ShortLinkCardSkeleton />
                  </td>
                </tr>
              ))}
            </>
          )}
          enableRowSelection={false}
          enableTableHeader={false}
          className="border-separate border-spacing-y-3 bg-transparent table-fixed"
          wrapperClassName={
            showsRows ? '[&_td]:!p-0 [&_tr]:!bg-transparent [&_td]:!border-0' : 'hidden'
          }
          toolsRender={() => (
            <div className="flex flex-col gap-4">
              {/* Header: một bề mặt tạo nhanh trung tính + bộ lọc — xếp dọc trên mobile */}
              <div className="flex flex-col gap-2 w-full lg:flex-row lg:items-center lg:justify-between">
                <PasteOrDrop orgId={org_id} className="w-full min-w-0 lg:max-w-[480px] lg:flex-1" />
                <div className="flex items-center gap-2 lg:flex-none">
                  <DataFilterItem
                    name="search"
                    placeholder={t('common:filter.search_by_name_or_slug')}
                    type="search"
                    setSearch={setSearch}
                    search={search}
                    className="flex-1 md:w-[250px] md:flex-none"
                  />
                  {/* Ô lọc theo ngày tạo đã BỎ — chủ sản phẩm 2026-10-27, không cần đường thay
                      thế. ⚠ `created_at` vẫn là khoá sắp xếp mặc định (`useFilters` ở trên); đây
                      chỉ gỡ ô LỌC, gỡ nhầm chỗ kia là danh sách mất thứ tự. */}
                  <ShortLinkFilterMenu
                    filters={filters}
                    setFilter={setFilter}
                    tags={
                      Array.isArray(tags)
                        ? tags.map((tag) => ({ label: tag.name, value: tag.id, color: tag.color }))
                        : []
                    }
                    domains={domainOptions}
                  />
                </div>
              </div>

              {/* Table header row */}
              <div className="flex items-center gap-2 px-2 border-b-2 border-slate-50">
                <div className="flex items-center gap-2 px-2">
                  <Checkbox
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
                      onClick={onDeleteBulk}
                    >
                      <TrashIcon className="w-[18px] h-[18px]" />
                    </LoadingButton>
                    <span className="text-s font-medium text-slate-500">
                      {t('common:text.selected_n', {
                        count: table.getSelectedRowModel().rows.length,
                      })}
                    </span>
                  </div>
                ) : (
                  <span className="flex-1 text-s font-medium text-slate-500 px-2 py-1">
                    {t('common:form.fields.info', { field: '' })}
                  </span>
                )}

                {/* <div className="ml-auto">
                  <button className="flex items-center justify-center p-1.5 rounded-full hover:bg-slate-100">
                    <Settings className="w-4 h-4 text-slate-500" />
                  </button>
                </div> */}
              </div>
            </div>
          )}
        />
      </TableActionProvider>

      {listState === 'empty' && <ShortLinkEmptyState />}
      {listState === 'no_match' && (
        <ShortLinkListStatus variant="no_match" onClearFilters={clearAllFilters} />
      )}
      {listState === 'error' && <ShortLinkListStatus variant="error" onRetry={retryAll} />}

      <AssistantStrip />
    </div>
  )
}
