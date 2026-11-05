import { GeographicData } from '@/core/types/analytics/geographic-distribution.type'
import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { Activity, Globe, MapPin, TrendingUp } from 'lucide-react'
import { useAdvancedAnalytics } from '@/features/advanced-analytics/hooks/queries'
import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
type KeyMetricCardProps = {}

const KeyMetricCard = () => {
  const { t } = useTranslation('advanced_analytics')
  const {
    allowExtraAdvancedAnalytic,
    timePeriod,
    selectedTags,
    selectedTouchpoints,
    spaceId,
    selectedSpaceIds,
  } = useAdvancedAnalyticsProvider()
  const { org_id } = useParams<{ org_id: string }>()

  // Determine collection_ids to use
  const collectionIds = spaceId
    ? [spaceId]
    : selectedSpaceIds && selectedSpaceIds.length > 0
      ? selectedSpaceIds
      : undefined

  const { data: geographicDistribution } = useAdvancedAnalytics(org_id, 'geographic-distribution', {
    period_days: timePeriod,
    tag_ids: selectedTags,
    touchpoint_ids: selectedTouchpoints,
    collection_ids: collectionIds,
  })

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="bg-linear-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <div className="flex items-center justify-between mb-2">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Globe className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-blue-600">🌍</div>
        </div>
        <div className="text-2xl font-bold text-blue-900">
          {geographicDistribution?.geographic_data?.summary?.total_countries}
        </div>
        <div className="text-sm text-blue-700">
          {geographicDistribution?.geographic_data?.summary?.total_countries === 1
            ? t('geographic.key_metrics.country_singular')
            : t('geographic.key_metrics.country_plural')}
        </div>
      </div>

      {allowExtraAdvancedAnalytic && (
        <div className="bg-linear-to-br from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <MapPin className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-green-600">🏙️</div>
          </div>
          <div className="text-2xl font-bold text-green-900">
            {geographicDistribution?.geographic_data?.summary?.total_cities || 0}
          </div>
          <div className="text-sm text-green-700">{t('geographic.key_metrics.cities')}</div>
        </div>
      )}

      <div className="bg-linear-to-br from-purple-50 to-pink-50 rounded-lg p-6 border border-purple-200">
        <div className="flex items-center justify-between mb-2">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Activity className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-purple-600">👥</div>
        </div>
        <div className="text-2xl font-bold text-purple-900">
          {geographicDistribution?.geographic_data?.summary?.total_unique_users || 0}
        </div>
        <div className="text-sm text-purple-700">{t('geographic.key_metrics.unique_users')}</div>
      </div>

      <div className="bg-linear-to-br from-orange-50 to-red-50 rounded-lg p-6 border border-orange-200">
        <div className="flex items-center justify-between mb-2">
          <div className="p-2 bg-orange-100 rounded-lg">
            <TrendingUp className="w-5 h-5 text-orange-600" />
          </div>
          <div className="text-orange-600">📊</div>
        </div>
        <div className="text-2xl font-bold text-orange-900">
          {geographicDistribution?.geographic_data?.summary?.avg_engagement_rate || 0}
        </div>
        <div className="text-sm text-orange-700">{t('geographic.key_metrics.avg_engagement')}</div>
      </div>
    </div>
  )
}

export default KeyMetricCard
