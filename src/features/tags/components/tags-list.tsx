'use client'
import { useFilters } from '@/shared/hooks/use-filters'
import { DataFilterItem } from '../../../shared/components/customize/data-filters/data-filter-item'
import { CalendarFoldIcon, PlusIcon } from 'lucide-react'
import { LoadingButton } from '../../../shared/components/customize/loading-button'
import { useParams, useRouter } from 'next/navigation'
import { useGetTags } from '@/features/tags/hooks/queries'
import { useBulkDeleteTag, useDeleteTag } from '@/features/tags/hooks/mutations'
import { createTagColumns } from './tag-table-column'
import { useTranslation } from 'react-i18next'
import { Suspense, useCallback, useMemo, useState } from 'react'
import { TableV2WithRef } from '@/shared/components/customize/table-v2/table'
import { useOrganizationStoreProvider } from '@/shared/providers/organization-store-provider'
import { ROLE_PERMISSION_KEYS, RolePermissionScope } from '@/shared/types/role-permission'
import { useProfileProvider } from '@/shared/providers/auth-provider'
import { useConfirmDialog } from '@/shared/components/customize/confirm-dialog'
import { TagDialogForm } from './form/tag-dialog-form'
import type { GetTagObject } from '@/app/api/organizations/[org_id]/tags/route'

interface TagListProps {
  blocked: boolean
}
export const TagsList = ({ blocked: _blocked }: TagListProps) => {
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
  const { org_id }: { org_id: string } = useParams()
  const { data, isLoading } = useGetTags(org_id, {
    pagination,
    search,
    sorting,
    filters,
  })
  const { mutateAsync: bulkDelete, isPending: isDeleting } = useBulkDeleteTag(org_id)
  const { mutate: deleteTag, isPending: isDeletingSingle } = useDeleteTag(org_id)
  const { t } = useTranslation('tag')

  const router = useRouter()

  const { hasPermission } = useOrganizationStoreProvider()
  const { profile } = useProfileProvider()

  const confirmButtonText = t('common:buttons.delete', {
    field: t('common:module.tag'),
  })
  const cancelButtonText = t('common:buttons.cancel')
  const warnTitle = t('common:buttons.delete', {
    field: t('common:module.tag'),
  })
  const warnDesc = t('common:messages.delete_dialog', {
    field: t('common:module.tag'),
  })

  const { confirm } = useConfirmDialog()
  const handleDeleteSingle = async (id: string) => {
    const result = await confirm({
      title: warnTitle,
      description: warnDesc,
      confirmButtonText,
      cancelButtonText,
    })
    if (result) {
      deleteTag(id)
    }
  }

  const handleDelete = async (ids: string[]) => {
    confirm({
      title: warnTitle,
      description: warnDesc,
      confirmButtonText,
      cancelButtonText,
      onConfirm: () => {
        bulkDelete(ids)
      },
    })
  }

  const canEdit = useCallback(
    (creator_id: string) => {
      const canEditAll = hasPermission(ROLE_PERMISSION_KEYS.EDIT_TAG, RolePermissionScope.ALL)
      const canEditOwn = hasPermission(ROLE_PERMISSION_KEYS.EDIT_TAG, RolePermissionScope.OWN)
      return canEditAll || (canEditOwn && creator_id === profile?.id)
    },
    [hasPermission, profile]
  )

  const canDelete = useCallback(
    (creator_id: string) => {
      const canDeleteAll = hasPermission(ROLE_PERMISSION_KEYS.EDIT_TAG, RolePermissionScope.ALL)
      const canDeleteOwn = hasPermission(ROLE_PERMISSION_KEYS.EDIT_TAG, RolePermissionScope.OWN)
      return canDeleteAll || (canDeleteOwn && creator_id === profile?.id)
    },
    [hasPermission, profile]
  )

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<GetTagObject | null>(null)

  const columns = useMemo(
    () =>
      createTagColumns({
        canEdit,
        canDelete,
        onEdit: (id) => {
          const tag = data?.data.find((t) => t.id === id)
          if (tag) {
            setEditingTag(tag)
            setEditOpen(true)
          }
        },
        onDelete: handleDeleteSingle,
        isDeletingSingle,
        permissionErrorText: t('common:messages.error.permission_error'),
      }),
    [canEdit, canDelete, isDeletingSingle, org_id, data?.data]
  )

  return (
    <div>
      {/* Edit tag dialog — rendered outside the table to avoid re-mounting on data refetch */}
      <Suspense fallback={null}>
        <TagDialogForm
          key={editingTag?.id}
          orgId={org_id}
          mode="edit"
          tagId={editingTag?.id}
          initialData={editingTag ?? undefined}
          open={editOpen}
          setOpen={setEditOpen}
          onSuccess={() => setEditOpen(false)}
        />
      </Suspense>

      <TableV2WithRef
        isDeleting={isDeleting}
        data={data?.data || []}
        columns={columns}
        pagination={pagination}
        rowCount={data?.rowCount || 0}
        setPagination={setPagination}
        setSorting={setSorting}
        isLoading={isLoading}
        onRowClick={(row) => router.push(`/org/${org_id}/tags/${row.id}`)}
        onBulkDelete={async (rows) => {
          const selectedIds = rows.map((row) => row.id)
          await handleDelete(selectedIds)
        }}
        wrapperClassName="border border-slate-300 rounded-lg"
        headerClassName="bg-slate-50 rounded-lg"
        toolsRender={() => (
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
            <div className="flex flex-wrap items-center gap-3">
              <DataFilterItem
                className="w-full sm:w-52"
                name="search"
                placeholder={t('common:filter.search_by_name')}
                type="search"
                setSearch={setSearch}
                search={search}
              />
              <DataFilterItem
                name="created_at"
                label={t('common:filter.created_at')}
                placeholder={t('common:filter.search_by_created_at')}
                type="date_range"
                setFilter={setFilter}
                filters={filters}
                Icon={CalendarFoldIcon}
              />
            </div>
            <Suspense fallback={null}>
              <TagDialogForm
                orgId={org_id}
                mode="create"
                button={
                  <LoadingButton
                    isLoading={false}
                    variant="default"
                    className="gap-1"
                    iconLeft={<PlusIcon />}
                  >
                    {t('common:buttons.create', {
                      field: t('common:module.tag'),
                    })}
                  </LoadingButton>
                }
              />
            </Suspense>
          </div>
        )}
      />
    </div>
  )
}
