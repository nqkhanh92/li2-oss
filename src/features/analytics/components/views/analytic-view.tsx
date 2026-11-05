'use client'

import React, { Suspense, useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { ContentLayout } from '@/shared/components/layout/content-layout'
import { AnalyticByTag } from '@/features/analytics/components/sections/analytic-by-tag'
import { useTranslation } from 'react-i18next'
import { AdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { useSearchParams } from 'next/navigation'
import { SkeletonCard } from '@/shared/components/customize/skeleton-card'

export default function AnalyticView() {
  const [tab, setTab] = useState('tag_analytic')
  const { t } = useTranslation()
  const searchParams = useSearchParams()
  const AdvancedAnalyticView = React.lazy(() => import('@/features/advanced-analytics/components'))

  useEffect(() => {
    const type = searchParams.get('type')
    if (type) {
      setTab(type)
    }
  }, [searchParams])
  return (
    <ContentLayout
      title={t('common:module.analytics')}
      className="md:pt-6 pt-4"
      isBackable={false}
      extra={
        // <Tabs value={tab} onValueChange={setTab} className="hidden">
        <Tabs value={tab} onValueChange={setTab} className="">
          <TabsList className="*:h-[34px] *:py-2 *:px-4 bg-background *:rounded-[8px] *:data-[state=active]:bg-white  *:data-[state=active]:text-primary">
            <TabsTrigger value="tag_analytic">{t('common:module.basic_analytics')}</TabsTrigger>
            <TabsTrigger value="advance_analytic">
              {t('common:module.advanced_analytics')}
              <span>
                <i className="text-xs">{' (' + t('common:label.experimental') + ')'}</i>
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      }
    >
      <div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsContent value="tag_analytic">
            {/* Basic Analytic */}
            <AnalyticByTag />
          </TabsContent>
          <TabsContent value="campaign_analytic">{/* <AnalyticByCampaign /> */}</TabsContent>
          <TabsContent value="advance_analytic">
            <AdvancedAnalyticsProvider>
              <Suspense fallback={<SkeletonCard className="w-full h-[calc(100vh-200px)]" />}>
                <AdvancedAnalyticView />
              </Suspense>
            </AdvancedAnalyticsProvider>
          </TabsContent>
        </Tabs>
      </div>
    </ContentLayout>
  )
}
