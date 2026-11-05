import React from 'react'
import { HeaderSection } from '../header-section'
import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { LazyRender } from '@/shared/components/customize/lazy-render'
import { useParams } from 'next/navigation'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { useAdvancedAnalytics } from '@/features/advanced-analytics/hooks/queries'
import { useTranslation } from 'react-i18next'

interface OverviewsProps {
  collectionIds?: string[]
}

const Overviews = ({ collectionIds }: OverviewsProps) => {
  const { t } = useTranslation('advanced_analytics')
  const { org_id } = useParams<{ org_id: string }>()
  const { allowExtraAdvancedAnalytic, timePeriod, selectedTags, selectedTouchpoints } =
    useAdvancedAnalyticsProvider()

  const selectedTagsIds = useDebounce(selectedTags, 500)
  const selectedTouchpointsIds = useDebounce(selectedTouchpoints, 500)

  const { data: overviewsData } = useAdvancedAnalytics(org_id, 'stats-panel', {
    period_days: timePeriod,
    tag_ids: selectedTagsIds,
    touchpoint_ids: selectedTouchpointsIds,
    collection_ids: collectionIds,
  })

  return (
    <div className="w-full mx-auto flex flex-col gap-6">
      <HeaderSection
        title={t('overview.title')}
        description={t('overview.description', {
          count: overviewsData?.stats?.touchpoints_active ?? 0,
        })}
        premiumDescription={t('overview.description', {
          count: overviewsData?.stats?.touchpoints_active ?? 0,
        })}
      />

      {/* Tabs Navigation */}
      <div className="rounded-lg flex flex-col gap-6">
        {/* Tab Content Area */}
        {/* Stats Panel Section */}
        <LazyRender
          loader={() =>
            import('@/features/advanced-analytics/components/overview/activity-timeline')
          }
          skeletonProps={{ bodyParts: 2 }}
          skeletonHeight={600}
        />

        {/* Section 3: Peak Hours Heatmap - Premium Only */}
        {allowExtraAdvancedAnalytic && (
          <LazyRender
            loader={() =>
              import('@/features/advanced-analytics/components/overview/peak-hours-heatmap')
            }
            skeletonHeight={600}
          />
        )}

        {/* FREE TIER: Hidden Opportunities Teaser */}
        {!allowExtraAdvancedAnalytic && (
          <LazyRender
            loader={() => import('@/features/advanced-analytics/components/opportunity-teaser')}
            skeletonHeight={600}
          />
        )}
        {/* Section 4: Top 5 Performing Touchpints - Tier Conditional */}
        <LazyRender
          loader={() =>
            import('@/features/advanced-analytics/components/overview/top-performance-tp')
          }
          skeletonHeight={600}
        />
      </div>
    </div>
  )
}

export default Overviews
