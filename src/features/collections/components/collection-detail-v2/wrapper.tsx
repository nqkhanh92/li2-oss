'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ContentLayout } from '@/shared/components/layout/content-layout'
import { SkeletonCard } from '@/shared/components/customize/skeleton-card'
import { useGetCollection } from '../../hooks/queries'
import { Link2Icon, UsersIcon } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { CollectionDetailHeaderV2 } from './header'
import { CollectionTouchPointsV2 } from './touch-points'
import { CollectionMembersV2 } from './members'

type TabType = 'links' | 'members'

export const CollectionDetailWrapperV2 = () => {
  const { t } = useTranslation(['collection', 'common'])
  const router = useRouter()
  const { org_id, collection_id } = useParams<{ org_id: string; collection_id: string }>()

  const [activeTab, setActiveTab] = useState<TabType>('links')
  const { data: collectionResponse, isLoading } = useGetCollection(org_id, collection_id)
  const collection = collectionResponse?.data

  const handleBack = () => {
    router.push(`/org/${org_id}/spaces`)
  }

  if (isLoading) {
    return (
      <ContentLayout
        title={t('common:loading.default')}
        suspenseFallback={
          <div className="2xl:max-w-7xl p-6 md:py-4 md:px-12 w-full 2xl:mx-auto mr-auto">
            <SkeletonCard className="h-[540px]" />
          </div>
        }
      >
        <div className="2xl:w-[1280px] w-full p-6 md:py-4 md:px-12 2xl:mx-auto mr-auto">
          <SkeletonCard className="h-[540px]" />
        </div>
      </ContentLayout>
    )
  }

  if (!collection) {
    return (
      <ContentLayout title={t('collection:module.collection')}>
        <div className="p-6">
          <p>{t('common:messages.error.not_found')}</p>
        </div>
      </ContentLayout>
    )
  }

  return (
    <ContentLayout title={collection.name} backPath={`/org/${org_id}/spaces`}>
      <div className="2xl:w-[1280px] w-full p-6 md:py-4 md:px-12 2xl:mx-auto mr-auto">
        {/* Space Header Info */}
        <CollectionDetailHeaderV2 collection={collection} orgId={org_id} />

        {/* Stats Cards - Tab Selectors */}
        <div className="flex gap-0 border border-slate-200 rounded-t-lg overflow-hidden">
          {/* Links Tab */}
          <button
            onClick={() => setActiveTab('links')}
            className={cn(
              'flex-1 p-4 text-left transition-colors border-r border-slate-200 bg-card',
              activeTab === 'links' ? ' border-b-2 border-b-slate-800' : ' hover:bg-slate-100'
            )}
          >
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <div className="w-4 h-4 bg-orange-500 rounded-sm flex items-center justify-center">
                <Link2Icon className="w-2 h-2 text-white" />
              </div>
              <span>{t('collection:stats.touch_points')}</span>
            </div>
            <div className="text-2xl font-semibold text-slate-900">
              {collection.touch_points_count || 0}
            </div>
          </button>

          {/* Members Tab */}
          <button
            onClick={() => setActiveTab('members')}
            className={cn(
              'flex-1 p-4 text-left transition-colors bg-card',
              activeTab === 'members' ? ' border-b-2 border-b-slate-800' : ' hover:bg-slate-100'
            )}
          >
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <div className="w-4 h-4 bg-blue-500 rounded-sm flex items-center justify-center">
                <UsersIcon className="w-2 h-2 text-white" />
              </div>
              <span>{t('collection:stats.members')}</span>
            </div>
            <div className="text-2xl font-semibold text-slate-900">
              {collection.members_count || 0}
            </div>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'links' && (
          <CollectionTouchPointsV2 collectionId={collection_id} orgId={org_id} />
        )}
        {activeTab === 'members' && (
          <CollectionMembersV2 collectionId={collection_id} orgId={org_id} />
        )}
      </div>
    </ContentLayout>
  )
}
