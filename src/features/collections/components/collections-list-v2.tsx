'use client'
import { useState, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { PlusIcon, FolderOpenIcon, Link2Icon, UsersIcon, SearchIcon, UserRound } from 'lucide-react'
import { useFilters } from '@/shared/hooks/use-filters'
import CustomDialogV2 from '@/shared/components/customize/custom-dialog-v2'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Pagination } from '@/shared/components/customize/pagination'
import { useGetCollections } from '../hooks/queries'
import { useCreateCollection, useDeleteCollection } from '../hooks/mutations'
import { CollectionForm } from './forms/collection-form'
import { CollectionWithStats, CollectionOrgPermission } from '@/shared/types/collection.types'
import { cn } from '@/shared/lib/utils'
import Link from 'next/link'
import { Typography } from '@/shared/components/ui/typography'
import { CollectionFormDialogV2 } from './form-v2'
import { FeatureUpgradeSection } from '@/shared/components/customize/feature-upgrade-section'

interface CollectionsListV2Props {
  blocked?: boolean
}

export const getPermissionConfig = (permission: CollectionOrgPermission) => {
  switch (permission) {
    case CollectionOrgPermission.CAN_EDIT:
      return {
        label: 'Public',
        bgColor: 'bg-green-50',
        textColor: 'text-green-800',
      }
    case CollectionOrgPermission.CAN_VIEW:
      return {
        label: 'View Only',
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-600',
      }
    case CollectionOrgPermission.NO_ACCESS:
      return {
        label: 'Private',
        bgColor: 'bg-yellow-50',
        textColor: 'text-yellow-600',
      }
    default:
      return {
        label: 'Unknown',
        bgColor: 'bg-gray-50',
        textColor: 'text-gray-600',
      }
  }
}

export const getIconBgColor = (color: string | null) => {
  if (!color) return 'bg-blue-50'

  const colorMap: Record<string, string> = {
    '#3B82F6': 'bg-blue-50',
    '#8B5CF6': 'bg-purple-50',
    '#EC4899': 'bg-pink-50',
    '#EF4444': 'bg-red-50',
    '#F59E0B': 'bg-amber-50',
    '#10B981': 'bg-emerald-50',
    '#14B8A6': 'bg-teal-50',
    '#6366F1': 'bg-indigo-50',
    '#F97316': 'bg-orange-50',
    '#06B6D4': 'bg-cyan-50',
  }

  return colorMap[color] || 'bg-blue-50'
}

interface SpaceCardProps {
  collection: CollectionWithStats
  orgId: string
}

const SpaceCard = ({ collection, orgId }: SpaceCardProps) => {
  const permissionConfig = getPermissionConfig(collection.org_permission as CollectionOrgPermission)
  const iconColor = collection.color || '#2563EB'
  const iconBgColor = getIconBgColor(collection.color)

  return (
    <Link href={`/org/${orgId}/spaces/${collection.id}`}>
      <div className="border border-slate-300 rounded-lg p-4 flex flex-col gap-4 hover:border-slate-400 transition-colors cursor-pointer bg-white">
        <div className="flex items-center justify-between">
          <div className={cn('p-3 rounded-lg w-10 h-10', iconBgColor)}>
            <FolderOpenIcon className="w-4.5 h-4.5" style={{ color: iconColor }} />
          </div>
          <div
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium',
              permissionConfig.bgColor,
              permissionConfig.textColor
            )}
          >
            {permissionConfig.label}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <Typography
            component="h3"
            size={'sm'}
            weight={'semibold'}
            className="text-slate-700 leading-[22px]"
          >
            {collection.name}
          </Typography>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Link2Icon className="w-3 h-3 text-slate-500" />
              <span className="text-xs text-slate-500">{collection.touch_points_count} links</span>
            </div>
            <div className="flex items-center gap-1">
              <UserRound className="w-3 h-3 text-slate-500" />
              <span className="text-xs text-slate-500">{collection.members_count} members</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

interface EmptyStateProps {
  onCreateClick: () => void
  isCreating: boolean
}

const EmptyState = ({ onCreateClick, isCreating }: EmptyStateProps) => {
  const { t } = useTranslation(['common', 'collection'])

  return (
    <div className="flex flex-col items-center justify-center py-[72px] gap-4 rounded-2xl">
      <FolderOpenIcon className="w-10 h-10 text-slate-400" />
      <p className="text-sm text-slate-500 text-center">
        {t('collection:empty_state_description')}
      </p>
      <LoadingButton
        isLoading={isCreating}
        variant="default"
        className="gap-1"
        iconLeft={<PlusIcon className="w-5 h-5" />}
        onClick={onCreateClick}
      >
        {t('common:buttons.create', {
          field: t('collection:module.collection'),
        })}
      </LoadingButton>
    </div>
  )
}


export const CollectionsListV2 = ({ blocked = false }: CollectionsListV2Props) => {
  const { t } = useTranslation(['common', 'collection'])
  const router = useRouter()
  const { org_id }: { org_id: string } = useParams()

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')

  const { pagination, setPagination, sorting, search, setSorting, setSearch } = useFilters({
    pagination: {
      pageIndex: 0,
      pageSize: 12,
    },
    search: '',
    sorting: [
      {
        id: 'created_at',
        desc: true,
      },
    ],
  })

  const queryParams = {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search: search || undefined,
    sort_by: (sorting[0]?.id as 'name' | 'created_at' | 'updated_at') || 'created_at',
    sort_order: (sorting[0]?.desc ? 'desc' : 'asc') as 'asc' | 'desc',
  }
  console.log({ queryParams })

  const { data, isLoading } = useGetCollections(org_id, queryParams)
  const { mutate: createCollection, isPending: isCreating } = useCreateCollection(org_id)
  const { mutate: deleteCollection, isPending: isDeleting } = useDeleteCollection(org_id)

  const handleCreate = (values: any) => {
    createCollection(values, {
      onSuccess: () => {
        setIsCreateDialogOpen(false)
        router.refresh()
      },
    })
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value)
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setSearch(searchValue)
      setPagination({ ...pagination, pageIndex: 0 })
    }
  }

  const handleSearchBlur = () => {
    if (searchValue !== search) {
      setSearch(searchValue)
      setPagination({ ...pagination, pageIndex: 0 })
    }
  }

  if (blocked) {
    return (
      <div className="flex flex-col gap-6 px-12 py-0 w-full">
        <FeatureUpgradeSection
          title={t('collection:plan_upgrade.title')}
          description={t('collection:plan_upgrade.description')}
        />
      </div>
    )
  }

  const collections = data?.data || []
  const rowCount = data?.rowCount || 0
  const isEmpty = !isLoading && collections.length === 0 && !search

  return (
    <div className="flex flex-col gap-6 px-12 py-0 w-full">
      {/* Header */}
      <div className="flex items-center justify-between w-full">
        <div className="relative w-[250px]">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-600" />
          <Input
            className="pl-11 pr-4 py-[10px] h-auto border-slate-300 rounded-md text-sm placeholder:text-slate-600/50"
            placeholder={t('collection:search_placeholder', { defaultValue: 'Search by title...' })}
            value={searchValue}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            onBlur={handleSearchBlur}
          />
        </div>

        <CollectionFormDialogV2
            mode="create"
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
            button={
              <LoadingButton
                isLoading={isCreating}
                variant="default"
                className="gap-1 bg-[#000D27] hover:bg-[#000D27]/90"
                iconLeft={<PlusIcon className="w-5 h-5" />}
              >
                {t('common:buttons.create', {
                  field: t('collection:module.collection'),
                })}
              </LoadingButton>
            }
          />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 12 }).map((_, index) => (
            <div
              key={index}
              className="border border-slate-300 rounded-lg p-4 flex flex-col gap-4 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-slate-200 rounded-lg" />
                <div className="w-16 h-6 bg-slate-200 rounded-full" />
              </div>
              <div className="flex flex-col gap-2">
                <div className="w-3/4 h-5 bg-slate-200 rounded" />
                <div className="w-1/2 h-4 bg-slate-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : isEmpty ? (
        <EmptyState onCreateClick={() => setIsCreateDialogOpen(true)} isCreating={isCreating} />
      ) : (
        <>
          {/* Grid of cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {collections.map((collection) => (
              <SpaceCard key={collection.id} collection={collection} orgId={org_id} />
            ))}
          </div>

          {/* No results state */}
          {collections.length === 0 && search && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <p className="text-sm text-slate-500">No spaces found matching "{search}"</p>
            </div>
          )}
        </>
      )}

      {/* Pagination */}
      {rowCount > 0 && (
        <Pagination
          pageSize={pagination.pageSize}
          pageIndex={pagination.pageIndex}
          rowCount={rowCount}
          onPageChange={(pageIndex) => setPagination({ ...pagination, pageIndex })}
          onPageSizeChange={(pageSize) => setPagination({ pageIndex: 0, pageSize })}
          // availablePageSize={[10, 20, 30, 40, 50]}
        />
      )}
    </div>
  )
}
