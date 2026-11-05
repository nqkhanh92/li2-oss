'use client'
import { useFilters } from '@/shared/hooks/use-filters'
import { assetFormSchema, AssetType } from '@/shared/schemas/assets'
import { CustomTable } from '@/shared/components/customize/table/custom-table'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { PlusCircleIcon } from 'lucide-react'
import { DataFilterItem } from '@/shared/components/customize/data-filters/data-filter-item'
import { assetColumn, AssetColumn } from '@/features/assets/components/columns'
import { CustomDialog, DialogCustomRef } from '@/shared/components/customize/custom-dialog'
import { AssetForm } from '@/features/assets/components/forms/asset-form'
import { z } from 'zod'
import { useRef, useState } from 'react'
import { useParams } from 'next/navigation'

import { TableActionProvider } from '@/shared/providers/table-action-provider'
import { useGetAsset } from '@/features/assets/hooks/queries'
import { useCreateAsset, useUpdateAsset } from '@/features/assets/hooks/mutations'
export const AssetLists = () => {
  const { org_id }: { org_id: string } = useParams()
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

  const { data, isLoading } = useGetAsset(org_id, {
    pagination,
    search,
    sorting,
    filters: { ...filters },
  })

  const onDeleteBulk = ({
    selectedRows,
    callback,
  }: {
    selectedRows: Record<string, boolean>
    callback?: () => void
  }) => {}

  const [selectedRow, setSelectedRow] = useState<AssetColumn | null>(null)

  const createAssetRef = useRef<DialogCustomRef>(null)
  const { mutate: createAsset, isPending: isCreating } = useCreateAsset(org_id)
  const handleCreateAsset = (values: z.infer<typeof assetFormSchema>) => {
    createAsset(values, {
      onSuccess: () => {
        createAssetRef.current?.close()
      },
    })
  }

  const updateAssetRef = useRef<DialogCustomRef>(null)
  const { mutate: updateAsset, isPending: isUpdating } = useUpdateAsset(
    org_id,
    selectedRow?.id || ''
  )
  const handleUpdateAsset = (values: z.infer<typeof assetFormSchema>) => {
    updateAsset(values, {
      onSuccess: () => {
        setSelectedRow(null)
        updateAssetRef.current?.close()
      },
    })
  }
  return (
    <div>
      <CustomDialog ref={updateAssetRef} noFooter noButton title="Edit Asset" size="md">
        {({ close }) => (
          <>
            {selectedRow && (
              <AssetForm
                onSubmit={handleUpdateAsset}
                isLoading={isUpdating}
                initialData={selectedRow}
              />
            )}
          </>
        )}
      </CustomDialog>
      <TableActionProvider
      // actions={{
      //   onDelete: (row) => {},
      //   onEdit: (row) => {
      //     setSelectedRow(row);
      //     updateAssetRef.current?.open();
      //   },
      // }}
      >
        <CustomTable
          className="bg-background rounded-2xl"
          extras={
            <div className="flex gap-4 items-end">
              <CustomDialog
                ref={createAssetRef}
                noFooter
                button={
                  <LoadingButton
                    isLoading={isCreating}
                    className="h-8 font-normal"
                    size={'sm'}
                    variant={'success'}
                  >
                    <PlusCircleIcon /> New
                  </LoadingButton>
                }
                title="New Asset"
                size="md"
              >
                {({ close }) => <AssetForm onSubmit={handleCreateAsset} isLoading={isCreating} />}
              </CustomDialog>
              <DataFilterItem
                className="w-96 h-8"
                name="search"
                placeholder="Search in asset's name"
                type="search"
                setSearch={setSearch}
                search={search}
              />
              <DataFilterItem
                className="w-32 h-8"
                name="type"
                label="Type"
                placeholder="Type"
                type="select"
                options={[
                  { label: 'NFC', value: AssetType.NFC },
                  {
                    label: 'Digital Signage',
                    value: AssetType.DIGITAL_SIGNAGE,
                  },
                ]}
                setFilter={setFilter}
                filters={filters}
              />
            </div>
          }
          pagination={pagination}
          setPagination={setPagination}
          setSorting={setSorting}
          sorting={sorting}
          columns={assetColumn}
          data={data?.data || []}
          rowCount={data?.rowCount}
          enableRowSelection={false}
          onDeleteSelected={onDeleteBulk}
          isLoading={isLoading}
          isDeleting={false}
        />
      </TableActionProvider>
    </div>
  )
}
