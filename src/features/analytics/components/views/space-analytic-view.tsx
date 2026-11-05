'use client'

import React, { Suspense, useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { ContentLayout } from '@/shared/components/layout/content-layout'
import { SpaceAnalyticByTag } from '@/features/analytics/components/sections/space-analytic-by-tag'
import { useTranslation } from 'react-i18next'
import { AdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { useSearchParams, useParams, useRouter } from 'next/navigation'
import { SkeletonCard } from '@/shared/components/customize/skeleton-card'
import { useGetCollection } from '@/features/collections/hooks/queries'
import { Button } from '@/shared/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function SpaceAnalyticView() {
  const [tab, setTab] = useState('basic')
  const { t } = useTranslation(['common', 'collection'])
  const searchParams = useSearchParams()
  const router = useRouter()
  const { org_id, collection_id } = useParams<{ org_id: string; collection_id: string }>()

  const AdvancedAnalyticView = React.lazy(() => import('@/features/advanced-analytics/components'))

  const { data: collectionResponse, isLoading: isLoadingCollection } = useGetCollection(
    org_id,
    collection_id
  )
  const collection = collectionResponse?.data

  useEffect(() => {
    const type = searchParams.get('type')
    if (type === 'advanced') {
      setTab('advanced')
    }
  }, [searchParams])

  const handleBack = () => {
    router.push(`/org/${org_id}/spaces/${collection_id}`)
  }

  return (
    <ContentLayout
      title={
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleBack} className="h-8 w-8 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="text-sm text-muted-foreground">
              {collection?.name || t('common:loading.default')}
            </div>
            <div className="font-semibold">{t('common:module.analytics')}</div>
          </div>
        </div>
      }
      className="md:pt-6 pt-4"
      isBackable={false}
      extra={
        <Tabs value={tab} onValueChange={setTab} className="">
          <TabsList className="*:rounded-full *:h-[34px] *:py-2 *:px-4 bg-background rounded-full">
            <TabsTrigger value="basic">{t('common:module.basic_analytics')}</TabsTrigger>
            {/* <TabsTrigger value="advanced">{t('common:module.advanced_analytics')}</TabsTrigger> */}
          </TabsList>
        </Tabs>
      }
    >
      <div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsContent value="basic">
            <SpaceAnalyticByTag spaceId={collection_id} />
          </TabsContent>
          {/* <TabsContent value="advanced">
            <AdvancedAnalyticsProvider>
              <Suspense fallback={<SkeletonCard className="w-full h-[calc(100vh-200px)]" />}>
                <AdvancedAnalyticView />
              </Suspense>
            </AdvancedAnalyticsProvider>
          </TabsContent> */}
        </Tabs>
      </div>
    </ContentLayout>
  )
}
