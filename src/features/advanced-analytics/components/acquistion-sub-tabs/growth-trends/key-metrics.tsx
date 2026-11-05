import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { useAdvancedAnalytics } from '@/features/advanced-analytics/hooks/queries'
import { useMemo } from 'react'
type KeyMetricsProps = {}

const KeyMetrics = () => {
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

  const { data } = useAdvancedAnalytics(org_id, 'acquisitions-growth-trends', {
    period_days: timePeriod,
    tag_ids: selectedTagsIds,
    touchpoint_ids: selectedTouchpointsIds,
    collection_ids: collectionIds,
  })

  const summary = useMemo(() => data?.growth_analysis?.summary, [data])
  const source_growth = useMemo(() => data?.growth_analysis?.source_growth, [data])

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="bg-card rounded-xl p-4 border border-gray-200 text-center">
        <div className="text-2xl font-bold text-gray-900">{summary?.current_total_visits}</div>
        <div className="text-sm text-gray-600">{t('growth_trends.key_metrics.total_visits')}</div>
        <div className="text-xs text-gray-500 mt-1">
          {summary?.current_total_users} {t('growth_trends.key_metrics.unique_users')}
        </div>
      </div>
      <div className="bg-card rounded-xl p-4 border border-gray-200 text-center">
        <div className="text-2xl font-bold text-green-600">{summary?.positive_growth_days}</div>
        <div className="text-sm text-gray-600">{t('growth_trends.key_metrics.growth_days')}</div>
        <div className="text-xs text-gray-500 mt-1">{t('growth_trends.key_metrics.out_of_days', { n: summary?.total_current_days })}</div>
      </div>
      <div className="bg-card rounded-xl p-4 border border-gray-200 text-center">
        <div className="text-2xl font-bold text-blue-600">
          {Math.round(
            (summary?.positive_growth_days || 0 / (summary?.total_current_days || 0)) * 100
          ) || 0}
          %
        </div>
        <div className="text-sm text-gray-600">{t('growth_trends.key_metrics.consistency_rate')}</div>
        <div className="text-xs text-gray-500 mt-1">{t('growth_trends.key_metrics.positive_growth_freq')}</div>
      </div>
      <div className="bg-card rounded-xl p-4 border border-gray-200 text-center">
        <div className="text-2xl font-bold text-orange-600">{source_growth?.length || 0}</div>
        <div className="text-sm text-gray-600">{t('growth_trends.key_metrics.active_sources')}</div>
        <div className="text-xs text-gray-500 mt-1">{t('growth_trends.key_metrics.channels_analyzed')}</div>
      </div>
    </div>
  )
}

export default KeyMetrics
