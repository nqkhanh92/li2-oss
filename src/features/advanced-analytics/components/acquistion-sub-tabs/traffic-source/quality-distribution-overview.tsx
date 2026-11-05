import { Award, Crown } from 'lucide-react'
import { useParams } from 'next/navigation'
import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { useAdvancedAnalytics } from '@/features/advanced-analytics/hooks/queries'
import { useTranslation } from 'react-i18next'

const QualityDistributionOverview = () => {
  const { t } = useTranslation('advanced_analytics')
  const { org_id } = useParams<{ org_id: string }>()
  const {
    allowExtraAdvancedAnalytic,
    timePeriod,
    selectedTags,
    selectedTouchpoints,
    spaceId,
    selectedSpaceIds,
  } = useAdvancedAnalyticsProvider()

  const selectedTagsIds = useDebounce(selectedTags, 500)
  const selectedTouchpointsIds = useDebounce(selectedTouchpoints, 500)

  // Determine collection_ids to use
  const collectionIds = spaceId
    ? [spaceId]
    : selectedSpaceIds && selectedSpaceIds.length > 0
    ? selectedSpaceIds
    : undefined

  const { data } = useAdvancedAnalytics(org_id, 'acquisition-traffic', {
    period_days: timePeriod,
    tag_ids: selectedTagsIds,
    touchpoint_ids: selectedTouchpointsIds,
    collection_ids: collectionIds,
  })

  if (!allowExtraAdvancedAnalytic || !data.insights.premium_insights) return null

  return (
    <div className="bg-card rounded-2xl border p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h4 className="text-lg font-semibold text-gray-900 flex items-center">
            <Award className="w-5 h-5 text-yellow-500 mr-2" />
            {t('traffic_source.quality_overview.title')}
            <Crown className="w-4 h-4 text-purple-500 ml-2" />
          </h4>
          <p className="text-sm text-gray-600 mt-1">
            {t('traffic_source.quality_overview.subtitle')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-linear-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200 text-center">
          <div className="text-2xl font-bold text-green-600">
            {data.insights.premium_insights.quality_distribution.excellent_sources}
          </div>
          <div className="text-sm text-green-700 font-medium">{t('traffic_source.quality_overview.excellent')}</div>
        </div>
        <div className="bg-linear-to-br from-blue-50 to-cyan-50 rounded-lg p-4 border border-blue-200 text-center">
          <div className="text-2xl font-bold text-blue-600">
            {data.insights.premium_insights.quality_distribution.good_sources}
          </div>
          <div className="text-sm text-blue-700 font-medium">{t('traffic_source.quality_overview.good')}</div>
        </div>
        <div className="bg-linear-to-br from-yellow-50 to-orange-50 rounded-lg p-4 border border-yellow-200 text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {data.insights.premium_insights.quality_distribution.average_sources}
          </div>
          <div className="text-sm text-yellow-700 font-medium">{t('traffic_source.quality_overview.average')}</div>
        </div>
        <div className="bg-linear-to-br from-red-50 to-pink-50 rounded-lg p-4 border border-red-200 text-center">
          <div className="text-2xl font-bold text-red-600">
            {data.insights.premium_insights.quality_distribution.needs_improvement_sources}
          </div>
          <div className="text-sm text-red-700 font-medium">{t('traffic_source.quality_overview.needs_work')}</div>
        </div>
      </div>
    </div>
  )
}

export default QualityDistributionOverview
