import {
  PremiumTierAcquisitionsTrafficSrc,
  SourceCategory,
} from '@/core/types/analytics/acquisition-traffic.type'
import { BarChart3, Crown } from 'lucide-react'
import { useState } from 'react'
import React from 'react'
import { FreeTierList } from './free-tier-list'
import { PremiumTierTable } from './premium-detail-table'
import { useParams } from 'next/navigation'
import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { useAdvancedAnalytics } from '@/features/advanced-analytics/hooks/queries'
import { useTranslation } from 'react-i18next'

const TrafficSourceAnalytic = () => {
  const { t } = useTranslation('advanced_analytics')
  const { org_id } = useParams<{ org_id: string }>()
  const { allowExtraAdvancedAnalytic, timePeriod, selectedTags, selectedTouchpoints } =
    useAdvancedAnalyticsProvider()

  const selectedTagsIds = useDebounce(selectedTags, 500)
  const selectedTouchpointsIds = useDebounce(selectedTouchpoints, 500)

  const { data } = useAdvancedAnalytics(org_id, 'acquisition-traffic', {
    period_days: timePeriod,
    tag_ids: selectedTagsIds,
    touchpoint_ids: selectedTouchpointsIds,
  })

  return (
    <div className="bg-card rounded-2xl border p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h4 className="text-lg font-semibold text-gray-900 flex items-center">
            <BarChart3 className="w-5 h-5 text-purple-600 mr-2" />
            {t('traffic_source.analytic.title')}
            {allowExtraAdvancedAnalytic && <Crown className="w-4 h-4 text-purple-500 ml-2" />}
          </h4>
          <p className="text-sm text-gray-600 mt-1">
            {allowExtraAdvancedAnalytic
              ? t('traffic_source.analytic.subtitle_premium')
              : t('traffic_source.analytic.subtitle_free')}
          </p>
        </div>
      </div>
      {/* FREE TIER: Basic Source List */}
      {!allowExtraAdvancedAnalytic && <FreeTierList data={data} />}
      {/* PREMIUM TIER: Compact Table with Expandable Details */}
      {allowExtraAdvancedAnalytic && (
        <PremiumTierTable data={data as PremiumTierAcquisitionsTrafficSrc} />
      )}
    </div>
  )
}

export default TrafficSourceAnalytic
