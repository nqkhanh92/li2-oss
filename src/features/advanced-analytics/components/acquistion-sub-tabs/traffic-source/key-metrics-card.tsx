import { BarChart3, MousePointer, TrendingUp, Users } from 'lucide-react'
import { useParams } from 'next/navigation'
import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { useAdvancedAnalytics } from '@/features/advanced-analytics/hooks/queries'
import { useTranslation } from 'react-i18next'

const KeyMetricsCard = () => {
  const { t } = useTranslation('advanced_analytics')
  const { org_id } = useParams<{ org_id: string }>()
  const { allowExtraAdvancedAnalytic, timePeriod, selectedTags, selectedTouchpoints,
    spaceId,
    selectedSpaceIds,
  } =
    useAdvancedAnalyticsProvider()

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="bg-linear-to-br from-purple-50 to-indigo-50 rounded-lg p-6 border border-purple-200">
        <div className="flex items-center justify-between mb-2">
          <div className="p-2 bg-purple-100 rounded-lg">
            <MousePointer className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-purple-600">📊</div>
        </div>
        <div className="text-2xl font-bold text-purple-900">
          {data?.traffic_sources?.summary?.total_visits || 0}
        </div>
        <div className="text-sm text-purple-700">{t('traffic_source.key_metrics.total_visits')}</div>
      </div>

      <div className="bg-linear-to-br from-blue-50 to-cyan-50 rounded-lg p-6 border border-blue-200">
        <div className="flex items-center justify-between mb-2">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-blue-600">👥</div>
        </div>
        <div className="text-2xl font-bold text-blue-900">
          {data?.traffic_sources?.summary?.total_unique_users || 0}
        </div>
        <div className="text-sm text-blue-700">{t('traffic_source.key_metrics.unique_users')}</div>
      </div>

      <div className="bg-linear-to-br from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
        <div className="flex items-center justify-between mb-2">
          <div className="p-2 bg-green-100 rounded-lg">
            <BarChart3 className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-green-600">🎯</div>
        </div>
        <div className="text-2xl font-bold text-green-900">
          {data?.traffic_sources?.summary?.total_source_categories || 0}
        </div>
        <div className="text-sm text-green-700">{t('traffic_source.key_metrics.traffic_sources')}</div>
      </div>

      <div className="bg-linear-to-br from-orange-50 to-red-50 rounded-lg p-6 border border-orange-200">
        <div className="flex items-center justify-between mb-2">
          <div className="p-2 bg-orange-100 rounded-lg">
            <TrendingUp className="w-5 h-5 text-orange-600" />
          </div>
          <div className="text-orange-600">⚡</div>
        </div>
        <div className="text-2xl font-bold text-orange-900">
          {allowExtraAdvancedAnalytic && data?.traffic_sources?.summary?.avg_quality_score
            ? data?.traffic_sources?.summary?.avg_quality_score
            : data?.traffic_sources?.summary?.avg_engagement_rate || 0}
        </div>
        <div className="text-sm text-orange-700">
          {allowExtraAdvancedAnalytic ? t('traffic_source.key_metrics.avg_quality_score') : t('traffic_source.key_metrics.avg_engagement')}
        </div>
      </div>
    </div>
  )
}

export default KeyMetricsCard
