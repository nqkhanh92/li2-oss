'use client'
import { useState, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { PlusIcon, FolderIcon } from 'lucide-react'
import { useFilters } from '@/shared/hooks/use-filters'
import { TableActionProvider } from '@/shared/providers/table-action-provider'
import { CustomTable } from '@/shared/components/customize/table/custom-table'
import CustomDialogV2 from '@/shared/components/customize/custom-dialog-v2'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { Button } from '@/shared/components/ui/button'
import { DataFilterItem } from '@/shared/components/customize/data-filters/data-filter-item'
import { useGetCollections } from '../hooks/queries'
import { useCreateCollection, useDeleteCollection } from '../hooks/mutations'
import { CollectionForm } from './forms/collection-form'
import { collectionColumns } from './collection-table-columns'

interface CollectionsListProps {
  blocked?: boolean
}

export const CollectionsList = ({ blocked = false }: CollectionsListProps) => {
  const { t } = useTranslation(['common', 'collection'])
  const router = useRouter()
  const { org_id }: { org_id: string } = useParams()

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  // Filters and pagination
  const { pagination, setPagination, sorting, search, setSorting, setSearch } = useFilters({
    pagination: {
      pageIndex: 0,
      pageSize: 20,
    },
    search: '',
    sorting: [
      {
        id: 'created_at',
        desc: true,
      },
    ],
  })

  // Convert pagination and sorting to API params
  const queryParams = {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search: search || undefined,
    sort_by: (sorting[0]?.id as 'name' | 'created_at' | 'updated_at') || 'created_at',
    sort_order: (sorting[0]?.desc ? 'desc' : 'asc') as 'asc' | 'desc',
  }

  // Queries and mutations
  const { data, isLoading } = useGetCollections(org_id, queryParams)
  const { mutate: createCollection, isPending: isCreating } = useCreateCollection(org_id)
  const { mutate: deleteCollection, isPending: isDeleting } = useDeleteCollection(org_id)

  // Handlers
  const handleCreate = (values: any) => {
    createCollection(values, {
      onSuccess: () => {
        setIsCreateDialogOpen(false)
        router.refresh()
      },
    })
  }

  const handleDelete = (collectionId: string, onSuccess?: () => void) => {
    deleteCollection(collectionId, {
      onSuccess: () => {
        onSuccess?.()
        router.refresh()
      },
    })
  }

  return (
    <div className="flex flex-col">
      <TableActionProvider
        actions={[
          {
            name: 'view',
            label: t('common:buttons.view', { field: '' }),
            action: (row) => {
              router.push(`/org/${org_id}/spaces/${row.id}`)
            },
          },
          {
            name: 'edit',
            label: t('common:buttons.edit', { field: '' }),
            action: (row) => {
              router.push(`/org/${org_id}/spaces/${row.id}?tab=settings`)
            },
          },
          {
            name: 'delete',
            label: t('common:buttons.delete', {
              field: t('collection:module.collection'),
            }),
            warnTitle: t('common:buttons.delete', {
              field: t('collection:module.collection'),
            }),
            warnDesc: t('collection:messages.delete_warning', {
              defaultValue:
                'Are you sure you want to delete this collection? Links in this collection will not be deleted.',
            }),
            warnType: 'dialog',
            action: (row, options) => {
              handleDelete(row.id, options?.onSuccess)
            },
            isLoading: isDeleting,
          },
        ]}
      >
        <CustomTable
          className="bg-background rounded-2xl"
          columns={collectionColumns}
          data={data?.data || []}
          isLoading={isLoading}
          pagination={pagination}
          setPagination={setPagination}
          sorting={sorting}
          setSorting={setSorting}
          rowCount={data?.rowCount || 0}
          extras={
            <div className="lg:flex items-center gap-4 lg:space-y-0 space-y-4">
              <CustomDialogV2
                title={t('common:buttons.create', {
                  field: t('collection:module.collection'),
                })}
                size="md"
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
                button={
                  <LoadingButton
                    isLoading={isCreating}
                    variant="default"
                    className="gap-1"
                    iconLeft={<PlusIcon />}
                  >
                    {t('common:buttons.create', {
                      field: t('collection:module.collection'),
                    })}
                  </LoadingButton>
                }
              >
                {({ setOpen }) => (
                  <div className="flex flex-col gap-6 p-0 items-center w-full">
                    <Suspense>
                      <CollectionForm
                        isPending={isCreating}
                        onSubmit={handleCreate}
                        className="px-0 pb-0 w-full"
                        blocked={blocked}
                      />
                    </Suspense>
                    {blocked && (
                      <Button
                        type="button"
                        onClick={() => setOpen(false)}
                        variant="secondary"
                        className="gap-[6px] flex-1 max-w-fit"
                      >
                        {t('common:buttons.cancel')}
                      </Button>
                    )}
                  </div>
                )}
              </CustomDialogV2>

              <div className="flex gap-4 w-full lg:w-auto">
                <DataFilterItem
                  className="w-52"
                  name="search"
                  placeholder={t('collection:search_placeholder')}
                  type="search"
                  setSearch={setSearch}
                  search={search}
                />
              </div>
            </div>
          }
        />
      </TableActionProvider>
    </div>
  )
}
