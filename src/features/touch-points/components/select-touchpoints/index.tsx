'use client'
import { TableV2, TableV2Ref, TableV2WithRef } from '@/shared/components/customize/table-v2/table'
import { useGetTouchPointDropdown, useGetTouchPoints } from '../../hooks/queries'
import { useParams } from 'next/navigation'
import { ColumnDef } from '@tanstack/react-table'
import { TouchPointInList } from '@/core/types/touch-point.type'
import Link from 'next/link'
import CustomDialogV2, { CustomDialogRef } from '@/shared/components/customize/custom-dialog-v2'
import { Button } from '@/shared/components/ui/button'
import { Suspense, useMemo, useRef, useState } from 'react'
import { Typography } from '@/shared/components/ui/typography'
import {
  CalendarIcon,
  FolderIcon,
  FolderOpen,
  Link2Icon,
  LinkIcon,
  NavigationIcon,
  Redo2Icon,
  TagIcon,
  UserIcon,
} from 'lucide-react'
import dayjs from 'dayjs'
import { FilterItemInput } from '@/shared/components/customize/data-filters/filter-item-input'
import { FilterItemSelect } from '@/shared/components/customize/data-filters/filter-item-select'
import { DataFilterItem } from '@/shared/components/customize/data-filters/data-filter-item'
import { useTranslation } from 'react-i18next'
import { useGetTagDropdowns } from '@/features/tags/hooks/queries'
import { useGetCollectionsDropdown } from '@/features/collections/hooks/queries'
import { Badge } from '@/shared/components/ui/badge'
import { LoadingMask } from '@/shared/components/customize/loading-mask'
import { SkeletonCard } from '@/shared/components/customize/skeleton-card'

type SelectTouchPointsProps = {
  value: string[]
  onChange: (value: string[], selectedRows?: TouchPointInList[]) => void
  button?: React.ReactNode
  disabledIds?: string[]
  title?: string
  single?: boolean
  confirmText?: string
  cancelText?: string
}

export const SelectTouchPoints = ({
  value,
  onChange,
  button,
  disabledIds,
  title = 'Select links',
  single = false,
  confirmText = 'Add links',
  cancelText = 'Cancel',
}: SelectTouchPointsProps) => {
  const { org_id } = useParams<{ org_id: string }>()
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 1000,
  })
  const [filters, setFilters] = useState({})
  const handleSetFilter = (name: string, value: any) => {
    setFilters({ ...filters, [name]: value })
  }

  const [search, setSearch] = useState('')

  const { data: touchPointData, isLoading } = useGetTouchPoints(org_id, {
    filters: {
      excludeIds: disabledIds,
      ...filters,
    },
    pagination: {
      pageIndex: pagination.pageIndex,
      pageSize: pagination.pageSize,
    },
    sorting: [{ id: 'created_at', desc: true }],
    search,
  })

  const { data: tags, isLoading: isLoadingTags } = useGetTagDropdowns(org_id)
  const { data: collections, isLoading: isLoadingCollections } = useGetCollectionsDropdown(org_id)

  const columns: ColumnDef<TouchPointInList>[] = [
    {
      accessorKey: 'name',
      header: ({ table }) =>
        single
          ? `Select (${table.getSelectedRowModel().rows.length}/${table.getRowModel().rows.length})`
          : `Select All (${table.getSelectedRowModel().rows.length}/${table.getRowModel().rows.length})`,
      cell: ({ row }) => {
        return (
          <div className="flex gap-2 justify-between">
            <div className="flex gap-1 flex-col">
              <Link href={`#`} className="font-semibold text-base truncate max-w-[320px]">
                {row.original.name}
              </Link>
              <div className="flex items-center gap-2 max-w-[320px]">
                <Redo2Icon className="inline scale-y-[-1] shrink-0" size={16} />
                <Typography size={'xs'} className="text-slate-500 truncate">
                  {row.original.content_value}
                </Typography>
              </div>
              <div className="flex gap-2">
                {row.original.tp_tag_links?.length > 0 ? (
                  <div className="flex gap-2 items-center">
                    <Typography size={'xs'} className="text-slate-500 gap-1 flex items-center">
                      <TagIcon className="inline scale-y-[-1]" size={16} />
                    </Typography>
                    {row.original.tp_tag_links?.slice(0, 2)?.map(({ tags }) => (
                      <Badge
                        className="px-2 py-0.5 text-xs"
                        key={tags.id}
                        color={tags.color}
                        variant="outline"
                      >
                        {tags.name}
                      </Badge>
                    ))}
                    {row.original.tp_tag_links?.length > 2 && (
                      <Badge className="px-2 py-0.5 text-xs" variant="outline">
                        +{row.original.tp_tag_links.length - 2}
                      </Badge>
                    )}
                  </div>
                ) : (
                  <div className="flex gap-2 items-center">
                    <Typography size={'xs'} className="text-slate-500 gap-1 flex items-center">
                      <TagIcon className="inline scale-y-[-1]" size={16} />
                      No tags
                    </Typography>
                  </div>
                )}
                {row.original.collections && (
                  <div className="flex gap-2 items-center">
                    <Typography size={'xs'} className="text-slate-500 gap-1 flex items-center">
                      <FolderIcon className="inline scale-y-[-1]" size={16} />
                    </Typography>
                    <Badge
                      className="px-2 py-0.5 text-xs"
                      key={row.original.collections.id}
                      color={row.original.collections.color ?? undefined}
                      variant="outline"
                    >
                      {row.original.collections.name}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col justify-end items-end">
              <div className="flex gap-2 items-center text-slate-500">
                <Typography className="text-inherit" size={'xs'}>
                  {dayjs(row.original.created_at).format('LL')}
                </Typography>
                <CalendarIcon size={16} />
              </div>
              <div className="flex gap-2 items-center text-slate-500">
                <UserIcon size={16} />
                <Typography size={'xs'} className="text-inherit">
                  {row.original.profiles.email}
                </Typography>
              </div>
            </div>
          </div>
        )
      },
    },
  ]
  const dialogRef = useRef<CustomDialogRef>(null)

  const ref = useRef<TableV2Ref<TouchPointInList>>(null)

  const handleSelect = () => {
    const table = ref.current?.getTable()
    const selectedRows = table?.getSelectedRowModel().rows
    onChange(
      selectedRows?.map((row) => row.original.id) || [],
      selectedRows?.map((row) => row.original)
    )
    dialogRef.current?.close()
  }
  const { t } = useTranslation(['touchpoint'])

  return (
    <CustomDialogV2
      title={title}
      ref={dialogRef}
      button={button ?? <Button variant="outline">'Select'</Button>}
    >
      <Suspense fallback={<SkeletonCard className="h-[720px]" bodyParts={6} />}>
        <div className="flex flex-wrap gap-x-4 gap-y-2 items-center mb-4">
          <DataFilterItem
            name="search"
            placeholder={t('common:filter.search_by_name')}
            type="search"
            setSearch={setSearch}
            search={search}
            className="flex-1"
          />
          {/* <DataFilterItem
          name="created_at"
          label={t('common:filter.search_by_created_at')}
          placeholder={t('common:filter.search_by_created_at')}
          type="date_range"
          setFilter={handleSetFilter}
          filters={filters}
          Icon={CalendarIcon}
        /> */}
          <LoadingMask loading={isLoadingTags}>
            <DataFilterItem
              name="tag_ids"
              label={t('common:filter.search_by_tag')}
              placeholder={t('common:filter.search_by_tag')}
              type="select"
              options={
                tags?.map((tag) => ({
                  label: tag.name,
                  value: tag.id,
                  color: tag.color,
                })) || []
              }
              setFilter={handleSetFilter}
              filters={filters}
              Icon={TagIcon}
            />
          </LoadingMask>
          <LoadingMask loading={isLoadingCollections}>
            <DataFilterItem
              name="collection_id"
              label={t('common:filter.search_by_collection')}
              placeholder={t('common:filter.search_by_collection')}
              type="select"
              options={collections?.data?.map((collection) => ({
                label: collection.name,
                value: collection.id,
                color: collection.color || undefined,
              }))}
              setFilter={handleSetFilter}
              filters={filters}
              Icon={FolderOpen}
            />
          </LoadingMask>
        </div>
        <TableV2WithRef
          wrapperClassName="h-[480px] border-slate-300 border rounded-lg"
          // enableTableHeader={false}
          isLoading={isLoading}
          enableRowSelection={!single}
          columns={columns}
          data={touchPointData?.data || []}
          // pagination={pagination}
          setPagination={setPagination}
          ref={ref}
          onRowClick={(row, table) => {
            if (single) {
              onChange([row.original.id], [row.original])
              dialogRef.current?.close()
            } else {
              row.toggleSelected()
            }
          }}
          rowCount={touchPointData?.rowCount || 0}
          availablePageSize={[]}
        ></TableV2WithRef>
        {!single && (
          <div className="mt-4 flex gap-2 justify-end">
            <Button variant={'secondary'} onClick={() => dialogRef.current?.close()}>
              {cancelText}
            </Button>
            <Button onClick={handleSelect}>{confirmText}</Button>
          </div>
        )}
      </Suspense>
    </CustomDialogV2>
  )
}
