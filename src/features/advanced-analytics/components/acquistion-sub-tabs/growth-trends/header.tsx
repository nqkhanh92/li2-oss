import { getTrendStyling } from '../../../utils/helper'
import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { useAdvancedAnalytics } from '@/features/advanced-analytics/hooks/queries'
import { useMemo } from 'react'

const Header = () => {
  const { t } = useTranslation('advanced_analytics')
  const { org_id } = useParams<{ org_id: string }>()
  const { timePeriod, selectedTags, selectedTouchpoints,
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


  const { data } = useAdvancedAnalytics(org_id, 'acquisitions-growth-trends', {
    period_days: timePeriod,
    tag_ids: selectedTagsIds,
    touchpoint_ids: selectedTouchpointsIds,
    collection_ids: collectionIds,
  })

  const summary = useMemo(() => data?.growth_analysis?.summary, [data])

  const trend_direction = summary?.trend_direction || ''
  const growth_consistency = summary?.growth_consistency || ''
  const totalDays = summary?.total_current_days || 0
  const period_info = data?.period_info

  const trendStyling = getTrendStyling(trend_direction || '')

  return (
    <div className={`rounded-xl p-6 border ${trendStyling.bg} ${trendStyling.border}`}>
      <div className="text-center">
        <div className="text-4xl mb-3">{trendStyling.icon}</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{t('growth_trends.header.title')}</h2>
        <p className="text-gray-600 mb-4">
          {t('growth_trends.header.based_on', { days: totalDays, start: period_info?.start_date.split('T')[0], end: period_info?.end_date.split('T')[0] })}
        </p>
        <div
          className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full ${trendStyling.bg} ${trendStyling.border} border`}
        >
          <span className={`font-medium capitalize ${trendStyling.color}`}>
            {trend_direction?.replace('_', ' ')}
          </span>
          <span className="text-gray-500">•</span>
          <span className={`text-sm ${trendStyling.color}`}>
            {growth_consistency?.replace('_', ' ')}
          </span>
        </div>
      </div>
    </div>
  )
}

export default Header
