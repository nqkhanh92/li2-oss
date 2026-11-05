import React, { Suspense, useState } from 'react'
import { MousePointer } from 'lucide-react'
import { useOrganizationStoreProvider } from '@/shared/providers/organization-store-provider'
import TrafficSourcesSubTab from '../acquistion-sub-tabs/traffic-source'
import { CampaignPerformanceSubTab } from '../acquistion-sub-tabs/campagin-performance'
import { subTabs } from '../../constants'
import { HeaderSection } from '../header-section'
import GrowthTrendsSubTab from '../acquistion-sub-tabs/growth-trends'
import { ChannelAttributionSubTab } from '../acquistion-sub-tabs/channel-attribution'
import { Button } from '@/shared/components/ui/button'
import { SkeletonCard } from '@/shared/components/customize/skeleton-card'

interface AcquisitionTabProps {
  collectionIds?: string[]
}

const AcquisitionsTab = ({ collectionIds }: AcquisitionTabProps) => {
  const { orgPlan } = useOrganizationStoreProvider()

  const allowExtraAdvancedAnalytic = orgPlan?.extra_advanced_analytics

  const [activeSubTab, setActiveSubTab] = useState('traffic-sources')

  const renderSubTabContent = () => {
    switch (activeSubTab) {
      case 'traffic-sources':
        return (
          <Suspense fallback={<SkeletonCard className="w-full h-[600px]" />}>
            <TrafficSourcesSubTab />
          </Suspense>
        )
      case 'campaigns':
        return (
          <Suspense fallback={<SkeletonCard className="w-full h-[600px]" />}>
            <CampaignPerformanceSubTab />
          </Suspense>
        )
      case 'attribution':
        return (
          <Suspense fallback={<SkeletonCard className="w-full h-[600px]" />}>
            <ChannelAttributionSubTab />
          </Suspense>
        )
      case 'trends':
        return (
          <Suspense fallback={<SkeletonCard className="w-full h-[600px]" />}>
            <GrowthTrendsSubTab />
          </Suspense>
        )
      default:
        return <TrafficSourcesSubTab />
    }
  }

  return (
    <div className="space-y-6">
      {/* Main Header */}
      <HeaderSection
        title="Traffic Acquisition"
        description="Comprehensive acquisition analysis across traffic sources, campaigns, and attribution"
        subTitle=""
        icon={<MousePointer className="w-7 h-7 text-purple-600 mr-3" />}
        textSize="2xl"
        showPremiumBadge={allowExtraAdvancedAnalytic}
      />
      {/* Sub-Navigation */}
      <div className="bg-card rounded-lg border overflow-hidden">
        <div className="flex border-b overflow-x-auto">
          {subTabs.map((tab) => (
            <Button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id)}
              className={`h-auto flex-1 px-6 py-4 text-left relative transition-all duration-200 ${
                activeSubTab === tab.id
                  ? 'bg-purple-50 text-purple-600 border-b-2 border-purple-500 hover:bg-purple-100 hover:text-purple-600'
                  : 'bg-transparent text-gray-600 hover:bg-purple-100 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center space-x-3">
                <tab.icon
                  className={`w-5 h-5 ${
                    activeSubTab === tab.id ? 'text-purple-600' : 'text-gray-400'
                  }`}
                />
                <div>
                  <div
                    className={`font-medium ${
                      activeSubTab === tab.id ? 'text-purple-900' : 'text-gray-900'
                    } flex items-center`}
                  >
                    {tab.label}
                    {/* {tab.comingSoon && (
                      <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-600 rounded-full">
                        Soon
                      </span>
                    )} */}
                  </div>
                  <div
                    className={`text-xs ${
                      activeSubTab === tab.id ? 'text-purple-600' : 'text-gray-500'
                    } mt-1`}
                  >
                    {tab.description}
                  </div>
                </div>
              </div>
            </Button>
          ))}
        </div>
      </div>
      {/* Sub-Tab Content */}
      <div className="min-h-[600px]">{renderSubTabContent()}</div>
    </div>
  )
}

export default AcquisitionsTab
