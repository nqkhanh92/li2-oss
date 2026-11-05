'use client'

import React, { Suspense, useMemo, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { BarChart3, Users, MousePointer, Activity, Target, Brain, Filter } from 'lucide-react'
import { NavBarAdavanedAnalytic } from '@/features/advanced-analytics/components/nav-bar'
import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'

import { SkeletonCard } from '@/shared/components/customize/skeleton-card'

import { FilterAdvancedAnalyticNewUI } from './filter-advanced-analytic-new-ui'
import { EmptySection } from '@/shared/components/customize/empty-section'
export default function AdvancedAnalyticView() {
  const [tab, setTab] = useState('overviews')
  const [activeTab, setActiveTab] = useState('overviews')
  const {
    allowExtraAdvancedAnalytic,
    selectedTags,
    selectedTouchpoints,
    timePeriod,
    spaceId,
    selectedSpaceIds,
  } = useAdvancedAnalyticsProvider()

  // Determine collection_ids to use
  const collectionIds = spaceId
    ? [spaceId] // Space-specific: use single space
    : selectedSpaceIds && selectedSpaceIds.length > 0
      ? selectedSpaceIds // Org-wide: use selected spaces from filter
      : undefined

  const tabs = [
    {
      id: 'overviews',
      label: 'Overviews',
      icon: BarChart3,
      premium: false,
      Component: React.lazy(() => import('@/features/advanced-analytics/components/overview')),
    },
    {
      id: 'audiences',
      label: 'Audiences',
      icon: Users,
      premium: false,
      Component: React.lazy(() => import('@/features/advanced-analytics/components/audience')),
    },
    {
      id: 'acquisitions',
      label: 'Acquisitions',
      icon: MousePointer,
      premium: false,
      Component: React.lazy(
        () => import('@/features/advanced-analytics/components/tabs/acquisition-tab')
      ),
    },
    {
      id: 'behaviors',
      label: 'Behaviors',
      icon: Activity,
      premium: false,
      Component: React.lazy(() => import('@/features/advanced-analytics/components/behaviors')),
    },
    {
      id: 'conversions',
      label: 'Conversions',
      icon: Target,
      premium: true,
      disabled: true,
    },
    {
      id: 'ai-insights',
      label: 'AI Insights',
      icon: Brain,
      premium: true,
      disabled: true,
    },
  ]
  return (
    <div className="space-y-6">
      {/* Filters Section */}
      <FilterAdvancedAnalyticNewUI />
      {/* <CombinedFilter />
      <CurrentFilters /> */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <NavBarAdavanedAnalytic
          tabs={tabs}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          setTab={setTab}
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        {tabs.map((tab) => (
          <TabsContent value={tab.id} key={tab.id}>
            <Suspense fallback={<SkeletonCard className="w-full h-[600px]" />}>
              {tab.disabled || !tab.Component ? (
                <EmptySection title="Conversions" size="lg" description="Coming soon" />
              ) : (
                <tab.Component collectionIds={collectionIds} />
              )}
            </Suspense>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
