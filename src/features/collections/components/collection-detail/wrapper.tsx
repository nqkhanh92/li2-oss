'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ContentLayout } from '@/shared/components/layout/content-layout'
import { SkeletonCard } from '@/shared/components/customize/skeleton-card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { useGetCollection } from '../../hooks/queries'
import { CollectionDetailHeader } from './header'
import { CollectionOverview } from './overview'
import { CollectionTouchPoints } from './touch-points'
import { CollectionMembers } from './members'
import { SpaceAnalyticByTag } from '@/features/analytics/components/sections/space-analytic-by-tag'

const tabList = ['overview', 'touch-points', 'members', 'analytics'] as const

export const CollectionDetailWrapper = () => {
  const { t } = useTranslation(['collection', 'common'])
  const router = useRouter()
  const searchParams = useSearchParams()
  const { org_id, collection_id } = useParams<{ org_id: string; collection_id: string }>()

  const getInitTab = () => {
    const tab = searchParams.get('tab')
    if (tabList.includes(tab as (typeof tabList)[number])) {
      return tab as (typeof tabList)[number]
    }
    return 'overview'
  }

  const [tab, setTab] = useState<(typeof tabList)[number]>(getInitTab())
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
    <ContentLayout
      title={
        <CollectionDetailHeader
          name={collection.name}
          description={collection.description}
          color={collection.color}
          handleBack={handleBack}
        />
      }
      isBackable={false}
      navBarClassName="py-2 h-[78px]"
      className="p-0!"
    >
      <div className="2xl:w-[1280px] w-full p-6 md:py-4 md:px-12 2xl:mx-auto mr-auto">
        <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
          <TabsList className="p-1 bg-background mb-4">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-slate-200 data-[state=active]:text-[#000E29] rounded-lg"
            >
              {t('collection:tabs.overview')}
            </TabsTrigger>
            <TabsTrigger
              value="touch-points"
              className="data-[state=active]:bg-slate-200 data-[state=active]:text-[#000E29] rounded-lg"
            >
              {t('collection:tabs.touch_points')}
            </TabsTrigger>
            <TabsTrigger
              value="members"
              className="data-[state=active]:bg-slate-200 data-[state=active]:text-[#000E29] rounded-lg"
            >
              {t('collection:tabs.members')}
            </TabsTrigger>
            {/* <TabsTrigger
              value="analytics"
              className="data-[state=active]:bg-slate-200 data-[state=active]:text-[#000E29] rounded-lg"
            >
              {t('common:module.analytics')}
            </TabsTrigger> */}
          </TabsList>

          <TabsContent value="overview">
            <CollectionOverview collection={collection} />
          </TabsContent>

          <TabsContent value="touch-points">
            <CollectionTouchPoints collectionId={collection_id} orgId={org_id} />
          </TabsContent>

          <TabsContent value="members">
            <CollectionMembers collectionId={collection_id} orgId={org_id} />
          </TabsContent>

          {/* <TabsContent value="analytics">
            <SpaceAnalyticByTag spaceId={collection_id} />
          </TabsContent> */}
        </Tabs>
      </div>
    </ContentLayout>
  )
}
