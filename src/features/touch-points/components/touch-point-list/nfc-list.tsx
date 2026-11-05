'use client'
import { useFilters } from '@/shared/hooks/use-filters'
import { CustomTable, TableRef } from '@/shared/components/customize/table/custom-table'
import {
  Tags as TagIcon,
  CalendarFoldIcon,
  Plus,
  TrashIcon,
  FolderOpen,
  FolderInput,
} from 'lucide-react'
import { DataFilterItem } from '@/shared/components/customize/data-filters/data-filter-item'
import { useGetTouchPoints } from '@/features/touch-points/hooks/queries'
import { useBulkDeleteTouchPoint } from '@/features/touch-points/hooks/mutations'
import { useParams, useRouter } from 'next/navigation'
import { TableActionProvider } from '@/shared/providers/table-action-provider'
import { useGetTagDropdowns } from '@/features/tags/hooks/queries'
import { useGetCollectionsDropdown } from '@/features/collections/hooks/queries'
import { Button } from '@/shared/components/ui/button'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { DropdownMenuItem, DropdownMenuShortcut } from '@/shared/components/ui/dropdown-menu'
import { useConfirmDialog } from '@/shared/components/customize/confirm-dialog'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { touchPointNfcColumns } from './nfc-columns'
import { useRef, useState } from 'react'
import { MoveToCollectionDialog } from '../dialogs/move-to-collection-dialog'
import { ImportExportAction } from './import-export-action'
import { AllTouchPointVariants } from '@/features/touch-points/types'
import { usePlanFeatures } from '../../hooks'
import { PremiumOnlySection } from '../touch-point-detail-advanced/premium-only-section'
import { NfcEmptyState } from './nfc-empty-state'

export const NfcList = () => {
  const { org_id }: { org_id: string } = useParams()
  const { isTpTypeEnabled } = usePlanFeatures()

  if (!isTpTypeEnabled(AllTouchPointVariants.NFC)) {
    return <PremiumOnlySection />
  }

  const [showMoveDialog, setShowMoveDialog] = useState(false)
  const [selectedTouchPointIds, setSelectedTouchPointIds] = useState<string[]>([])
  const [currentCollectionId, setCurrentCollectionId] = useState<string | null>(null)

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
    })
  const { data, isLoading } = useGetTouchPoints(org_id, {
    pagination,
    search,
    sorting,
    filters: {
      ...filters,
      variants_content: {
        [AllTouchPointVariants.NFC]: {
          enabled: true,
        },
      },
    },
  })

  const { confirm } = useConfirmDialog()
  const { mutate: bulkDelete, isPending: isDeleting } = useBulkDeleteTouchPoint(org_id, {
    noToast: true,
  })
  const tableRef = useRef<TableRef>(null)
  const onDeleteBulk = async (selectedRows: Record<string, boolean>) => {
    const result = await confirm({
      title: t('common:buttons.delete', {
        field: t('common:label.nfc_tag'),
      }),
      description: t('common:messages.delete_dialog', {
        field: t('common:label.nfc_tag'),
      }),
    })
    if (!result) return

    const selectedIds = Object.entries(selectedRows)
      .filter(([_, isSelected]) => isSelected)
      .map(([id]) => id)
    bulkDelete(selectedIds, {
      onSuccess: () => {
        tableRef.current?.getTable().resetRowSelection()
        toast.success(
          t('common:messages.success.deleted_count', {
            count: selectedIds.length,
            field: '$t(common:label.nfc_tag)',
          })
        )
      },
    })
  }
  const router = useRouter()
  const { data: tags, isLoading: isLoadingTags } = useGetTagDropdowns(org_id)
  const { data: collectionsData } = useGetCollectionsDropdown(org_id)
  const collections = collectionsData?.data || []
  const { t } = useTranslation('touchpoint')

  // Show empty state if no data and not loading
  const hasNoData = !isLoading && (!data?.data || data.data.length === 0)

  if (hasNoData) {
    return <NfcEmptyState />
  }

  return (
    <div>
      <TableActionProvider
        actions={[
          {
            name: 'edit',
            label: t('common:buttons.edit', { field: '' }),
            action: (row) => {
              router.push(`/org/${org_id}/short-links/${row.id}?tab=detail`)
            },
          },
          {
            name: 'move_to_collection',
            label: t('touchpoint:actions.move_to_collection'),
            render: (row) => {
              const isFlagged = row.original.safety_status === 'flagged'
              return (
                <DropdownMenuItem
                  key="move_to_collection"
                  disabled={isFlagged}
                  onSelect={(e) => {
                    e.preventDefault()
                    if (isFlagged) return
                    setSelectedTouchPointIds([row.original.id])
                    setCurrentCollectionId(row.original.collection_id || null)
                    setShowMoveDialog(true)
                  }}
                  className="text-slate-500 font-medium"
                >
                  {t('touchpoint:actions.move_to_collection')}
                  <DropdownMenuShortcut>
                    <FolderInput className="h-4 w-4" />
                  </DropdownMenuShortcut>
                </DropdownMenuItem>
              )
            },
          },
          {
            name: 'delete',
            label: t('common:buttons.delete', { field: '' }),
            warnTitle: t('common:buttons.delete', {
              field: t('common:label.nfc_tag'),
            }),
            warnDesc: t('common:messages.delete_dialog', {
              field: t('common:label.nfc_tag'),
            }),
            warnType: 'dialog' as const,
            action: (row: any, options: any) => {
              bulkDelete([row.id], {
                onSuccess: () => {
                  options?.onSuccess?.()
                  toast.success(
                    t('common:messages.success.deleted', {
                      field: '$t(common:label.nfc_tag)',
                    })
                  )
                },
              })
            },
            isLoading: isDeleting,
          },
        ]}
      >
        <CustomTable
          enableBulkDelete={false}
          renderTools={(table) => {
            return (
              <div className="flex items-center px-2 py-1 border-b border-white gap-[6px] h-9 mt-6 mb-0">
                <div className="px-2">
                  <Checkbox
                    className="translate-y-[2px]"
                    checked={
                      table.getIsAllPageRowsSelected() ||
                      (table.getIsSomePageRowsSelected() && 'indeterminate')
                    }
                    onCheckedChange={(value) => {
                      const checked = !!value
                      table.toggleAllPageRowsSelected(checked)
                    }}
                  />
                </div>
                {(table.getIsSomePageRowsSelected() || table.getIsAllPageRowsSelected()) && (
                  <>
                    <Button
                      type="button"
                      disabled={table.getSelectedRowModel().rows.some(
                        (r) => r.original.safety_status === 'flagged'
                      )}
                      onClick={() => {
                        const selectedIds = Object.entries(table.getState().rowSelection)
                          .filter(([_, isSelected]) => isSelected)
                          .map(([id]) => id)
                        setSelectedTouchPointIds(selectedIds)
                        setCurrentCollectionId(null)
                        setShowMoveDialog(true)
                      }}
                      size="icon"
                      variant="ghost"
                      title={t('touchpoint:actions.move_to_collection')}
                    >
                      <FolderInput className="w-[18px] h-[18px]" />
                    </Button>
                    <LoadingButton
                      type="button"
                      onClick={() => onDeleteBulk(table.getState().rowSelection)}
                      size="icon"
                      variant="ghost"
                      isLoading={isDeleting}
                    >
                      <TrashIcon className="w-[18px] h-[18px]" />
                    </LoadingButton>
                  </>
                )}
                <div className="text-s font-medium text-slate-500">
                  {(() => {
                    const selectedCount = Object.values(table.getState().rowSelection).filter(
                      Boolean
                    ).length
                    return selectedCount === 0
                      ? t('common:text.select_all')
                      : t('common:text.selected_n', { count: selectedCount })
                  })()}
                </div>
              </div>
            )
          }}
          ref={tableRef}
          isHeadless
          className="table-fixed w-full border-separate border-spacing-y-4 bg-transparent [&_tr>td]:p-0 [&_tr>td]:bg-card [&_tr>td]:first:pl-2 [&_tr>td]:first:rounded-l-[8px] [&_tr>td]:last:rounded-r-[8px] [&_tr>td]:first:w-[26px] [&_tr]:bg-transparent! [&_tr[data-state='selected']>td]:bg-neutral-50"
          extras={
            <div className="flex flex-col-reverse md:flex-row gap-4 justify-between w-full">
              <div className="flex gap-4 items-center">
                <DataFilterItem
                  name="search"
                  placeholder={t('common:filter.search_by_name')}
                  type="search"
                  setSearch={setSearch}
                  search={search}
                  className="flex-1"
                />
                <DataFilterItem
                  name="created_at"
                  label={t('common:filter.search_by_created_at')}
                  placeholder={t('common:filter.search_by_created_at')}
                  type="date_range"
                  setFilter={setFilter}
                  filters={filters}
                  Icon={CalendarFoldIcon}
                />
                <DataFilterItem
                  name="tag_ids"
                  label={t('common:filter.search_by_tag')}
                  placeholder="Tag"
                  type="select"
                  options={
                    Array.isArray(tags)
                      ? tags?.map((tag) => ({
                          label: tag.name,
                          value: tag.id,
                          color: tag.color,
                        })) || []
                      : []
                  }
                  setFilter={setFilter}
                  filters={filters}
                  Icon={TagIcon}
                />
                <DataFilterItem
                  name="collection_id"
                  label={t('common:filter.search_by_collection', 'Filter by Collection')}
                  placeholder="Collection"
                  type="select"
                  options={collections.map((collection) => ({
                    label: collection.name,
                    value: collection.id,
                    color: collection.color || undefined,
                  }))}
                  setFilter={setFilter}
                  filters={filters}
                  Icon={FolderOpen}
                />
              </div>
              {/* <div className="flex gap-4 justify-end">
                <ImportExportAction nfcOnly />
                <Button
                  size="default"
                  variant="default"
                  className="gap-1"
                  onClick={() => {
                    router.push(`/org/${org_id}/touch-points/create?type=nfc`)
                  }}
                  iconLeft={<Plus />}
                >
                  {t('common:buttons.create', {
                    field: t('common:label.nfc_tag'),
                  })}
                </Button>
              </div> */}
            </div>
          }
          pagination={pagination}
          setPagination={setPagination}
          setSorting={setSorting}
          sorting={sorting}
          columns={touchPointNfcColumns}
          enableColumnToggle={false}
          data={data?.data || []}
          rowCount={data?.rowCount}
          enableRowSelection={true}
          isLoading={isLoading}
          isDeleting={isDeleting}
        />
      </TableActionProvider>
      <div className="flex flex-col gap-4 items-start md:h-0 h-[calc(20svh-60px)]"></div>

      <MoveToCollectionDialog
        open={showMoveDialog}
        onOpenChange={setShowMoveDialog}
        touchPointIds={selectedTouchPointIds}
        currentCollectionId={currentCollectionId}
        orgId={org_id}
        onSuccess={() => {
          tableRef.current?.getTable().resetRowSelection(true)
          setSelectedTouchPointIds([])
          setCurrentCollectionId(null)
        }}
      />
    </div>
  )
}
