'use client'
import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { useAdvancedAnalytics } from '@/features/advanced-analytics/hooks/queries'
import { getCustomerJourneyInsight } from '../../../utils/helper'
import { useMemo } from 'react'

type JourneyInsight = {
  type: string
  message: string
  implication: string
}

const CustomerJourney = () => {
  const { t } = useTranslation('advanced_analytics')
  const { org_id } = useParams<{ org_id: string }>()
  const { timePeriod, selectedTags, selectedTouchpoints, spaceId, selectedSpaceIds } =
    useAdvancedAnalyticsProvider()

  const selectedTagsIds = useDebounce(selectedTags, 500)
  const selectedTouchpointsIds = useDebounce(selectedTouchpoints, 500)

  // Determine collection_ids to use
  const collectionIds = spaceId
    ? [spaceId]
    : selectedSpaceIds && selectedSpaceIds.length > 0
    ? selectedSpaceIds
    : undefined

  const { data } = useAdvancedAnalytics(org_id, 'acquisitions-touchpoint-channel-attribution', {
    period_days: timePeriod,
    tag_ids: selectedTagsIds,
    touchpoint_ids: selectedTouchpointsIds,
    collection_ids: collectionIds,
  })

  const summary = useMemo(() => data?.touchpoint_attribution?.summary, [data])

  // Generate insights based on actual data patterns
  const journeyInsight = getCustomerJourneyInsight(
    summary?.journey_distribution?.single_touchpoint,
    summary?.total_users_analyzed
  )

  const multiTouchPercent = Math.round(summary?.multi_touch_rate_pct || 0)

  return (
    <div className="bg-linear-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">{t('channel_attribution.customer_journey.title')}</h2>
        <p className="text-gray-600">{t('channel_attribution.customer_journey.based_on', { count: summary?.total_users_analyzed })}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-card rounded-lg p-6 text-center">
          <div className="text-2xl font-bold text-blue-600">
            {Math.round(
              (summary?.journey_distribution?.single_touchpoint / summary?.total_users_analyzed) *
                100
            ) || 0}
            %
          </div>
          <div className="text-sm text-gray-600">{t('channel_attribution.customer_journey.single_touch')}</div>
          <div className="text-xs text-gray-500">
            {summary?.journey_distribution?.single_touchpoint} {t('channel_attribution.customer_journey.users_suffix')}
          </div>
        </div>
        <div className="bg-background rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">{multiTouchPercent}%</div>
          <div className="text-sm text-gray-600">{t('channel_attribution.customer_journey.multi_touch')}</div>
          <div className="text-xs text-gray-500">
            {summary?.journey_distribution?.two_touchpoint +
              summary?.journey_distribution?.multi_touchpoint || 0}{' '}
            {t('channel_attribution.customer_journey.users_suffix')}
          </div>
        </div>
        <div className="bg-background rounded-lg p-6 text-center">
          <div className="text-2xl font-bold text-green-600">
            {summary?.avg_journey_duration_hours || 0}h
          </div>
          <div className="text-sm text-gray-600">{t('channel_attribution.customer_journey.avg_journey_time')}</div>
          <div className="text-xs text-gray-500">{t('channel_attribution.customer_journey.first_to_last')}</div>
        </div>
      </div>

      <div className="bg-background rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">
          {t('channel_attribution.customer_journey.journey_pattern')} {journeyInsight?.type}
        </h3>
        <p className="text-sm text-gray-700 mb-2">{journeyInsight?.message}</p>
        <p className="text-xs text-gray-600">{journeyInsight?.implication}</p>
      </div>
    </div>
  )
}

export default CustomerJourney
