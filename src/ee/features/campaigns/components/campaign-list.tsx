'use client'
import { useFilters } from '@/shared/hooks/use-filters'
import { CustomTable } from '@/shared/components/customize/table/custom-table'
import { campaignColumns } from './columns'
import { useEffect, useRef } from 'react'
import { useGetCampaigns } from '@/ee/features/campaigns/hooks/queries'
import { DataFilterItem } from '@/shared/components/customize/data-filters/data-filter-item'
import { DataFilters } from '@/shared/components/customize/data-filters/data-filters'
import {
  useBulkDeleteCampaign,
  useCreateCampaign,
  useDeleteCampaign,
} from '@/ee/features/campaigns/hooks/mutations'
import { PlusCircleIcon } from 'lucide-react'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { useParams, useRouter } from 'next/navigation'
import { CustomDialog, DialogCustomRef } from '@/shared/components/customize/custom-dialog'
import { CampaignForm } from './forms/campaign-form'
import { campaignContentTypes, campaignFormSchema } from '@/shared/schemas/campaigns'
import { z } from 'zod'
import { TableActionProvider } from '@/shared/providers/table-action-provider'

export const CampaignList = () => {
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
  const { org_id } = useParams<{ org_id: string }>()
  const { data, isLoading } = useGetCampaigns(org_id, {
    pagination,
    search,
    sorting,
    filters: filters,
  })
  const { mutate: bulkDelete, isPending: isDeleting } = useBulkDeleteCampaign(org_id)
  const { mutate: deleteCampaign, isPending: isDeletingCampaign } = useDeleteCampaign(org_id)
  const onDeleteBulk = ({
    selectedRows,
    callback,
  }: {
    selectedRows: Record<string, boolean>
    callback?: () => void
  }) => {
    const selectedIds = Object.entries(selectedRows)
      .filter(([_, isSelected]) => isSelected)
      .map(([id]) => id)
    bulkDelete(selectedIds, {
      onSuccess: () => {
        callback?.()
      },
    })
  }
  const { mutate: createCampaign, isPending: isCreatingCampaign } = useCreateCampaign(org_id)
  const handleCreateCampaign = (values: z.infer<typeof campaignFormSchema>) => {
    createCampaign(values, {
      onSuccess: () => {
        createCampaignRef.current?.close()
      },
    })
  }
  const router = useRouter()
  const createCampaignRef = useRef<DialogCustomRef>(null)
  return (
    <div>
      <TableActionProvider
        actions={[
          {
            name: 'edit',
            label: 'Edit',
            action: (row) => {
              router.push(`campaigns/${row.id}`)
            },
          },
          {
            name: 'delete',
            label: 'Delete',
            warnTitle: 'Delete Campaign?',
            warnDesc:
              'Are you sure you want to delete this campaign? This action cannot be undone and may affect connected services.',
            isLoading: isDeletingCampaign,
            action: (row, options) => {
              deleteCampaign(row.id, {
                onSuccess: () => {
                  options?.onSuccess?.()
                },
              })
            },
          },
        ]}
      >
        <CustomTable
          extras={
            <div className="flex gap-2">
              {/* <LoadingButton
              isLoading={isCreatingCampaign}
              className="h-8 font-normal"
              size={"sm"}
              variant={"success"}
              onClick={handleCreateCampaign}
            >
              <PlusCircleIcon /> New Campaign
            </LoadingButton> */}
              <CustomDialog
                ref={createCampaignRef}
                noFooter
                button={
                  <LoadingButton
                    isLoading={false}
                    className="h-8 font-normal"
                    size={'sm'}
                    variant={'success'}
                  >
                    <PlusCircleIcon /> New
                  </LoadingButton>
                }
                title="New Campaign"
                size="md"
              >
                {({ close }) => (
                  <CampaignForm
                    onSubmit={handleCreateCampaign}
                    isPending={isCreatingCampaign}
                    close={close}
                  />
                )}
              </CustomDialog>
              <DataFilterItem
                className="w-96 h-8"
                name="search"
                placeholder="Search in campaign's name"
                type="search"
                setSearch={setSearch}
                search={search}
              />
              <DataFilterItem
                className="w-32 h-8"
                name="content_type"
                label="Content Type"
                placeholder="Content Type"
                type="select"
                options={Object.entries(campaignContentTypes).map(([key, value]) => ({
                  label: value.label,
                  value: key,
                }))}
                setFilter={setFilter}
                filters={filters}
              />
              <DataFilterItem
                className="w-32 h-8"
                name="enabled"
                label="Status"
                placeholder="Status"
                type="select"
                options={[
                  { label: 'Active', value: 'true' },
                  { label: 'Inactive', value: 'false' },
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
          columns={campaignColumns}
          data={data?.data || []}
          rowCount={data?.rowCount}
          enableRowSelection={true}
          onDeleteSelected={onDeleteBulk}
          isLoading={isLoading}
          isDeleting={isDeleting}
        />
      </TableActionProvider>
    </div>
  )
}
