import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'
import { useAdvancedAnalytics } from '@/features/advanced-analytics/hooks/queries'
import { useParams } from 'next/navigation'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { getPlatformColor, getPlatformIcon } from '@/features/advanced-analytics/utils/helper'
import { EmptySection } from '@/shared/components/customize/empty-section'
import { useTranslation } from 'react-i18next'

const PlatformDistribution = () => {
  const { t } = useTranslation('advanced_analytics')
  const {
    allowExtraAdvancedAnalytic: isPremium,
    timePeriod,
    selectedTags,
    selectedTouchpoints,
    spaceId,
    selectedSpaceIds,
  } = useAdvancedAnalyticsProvider()
  const { org_id } = useParams<{ org_id: string }>()
  const selectedTagsIds = useDebounce(selectedTags, 500)
  const selectedTouchpointsIds = useDebounce(selectedTouchpoints, 500)

  // Determine collection_ids to use
  const collectionIds = spaceId
    ? [spaceId]
    : selectedSpaceIds && selectedSpaceIds.length > 0
    ? selectedSpaceIds
    : undefined

  const { data: deviceAnalysisData } = useAdvancedAnalytics(org_id, 'device-analysis', {
    period_days: timePeriod,
    tag_ids: selectedTagsIds,
    touchpoint_ids: selectedTouchpointsIds,
    collection_ids: collectionIds,
  })

  // Prepare chart data
  const platformChartData = deviceAnalysisData?.device_data?.platforms?.map((platform, index) => ({
    platform: platform?.platform,
    visits: platform?.total_visits,
    users: platform?.unique_users,
    share: platform?.platform_share_pct,
    color: getPlatformColor(platform?.platform || '', index),
    visits_per_user:
      platform?.visits_per_user || (platform?.total_visits || 0) / (platform?.unique_users || 0),
  }))

  return (
    <div className="bg-card rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{t('device_analytic.platform_distribution.title')}</h3>
          <p className="text-sm text-gray-600">{t('device_analytic.platform_distribution.subtitle')}</p>
        </div>
      </div>
      {!platformChartData ? (
        <EmptySection />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={platformChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) => `${entry.platform}: ${entry.share}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="share"
                >
                  {platformChartData?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name, props) => [
                    `${value}% (${props.payload.visits} visits)`,
                    name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Platform Details */}
          <div className="space-y-4">
            {deviceAnalysisData?.device_data?.platforms?.map((platform, index) => (
              <div
                key={platform?.platform}
                className="bg-slate-50 rounded-lg p-4 border border-gray-200 shadow-xs"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div
                      className="p-2 rounded-lg"
                      style={{
                        backgroundColor: getPlatformColor(platform?.platform || '', index) + '20',
                      }}
                    >
                      {getPlatformIcon(platform?.platform || '')}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{platform?.platform}</div>
                      <div className="text-sm text-gray-600">{platform?.unique_users} {t('device_analytic.platform_distribution.users_suffix')}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className="text-xl font-bold"
                      style={{ color: getPlatformColor(platform?.platform || '', index) }}
                    >
                      {platform?.platform_share_pct}%
                    </div>
                    <div className="text-xs text-gray-500">{t('device_analytic.platform_distribution.market_share')}</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="text-center">
                    <div className="font-medium text-gray-900">{platform?.total_visits}</div>
                    <div className="text-xs text-gray-600">{t('device_analytic.platform_distribution.total_visits')}</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-gray-900">{platform?.unique_users}</div>
                    <div className="text-xs text-gray-600">{t('device_analytic.platform_distribution.unique_users')}</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-gray-900">
                      {platform?.visits_per_user
                        ? platform?.visits_per_user
                        : ((platform?.total_visits || 0) / (platform?.unique_users || 0)).toFixed(
                            2
                          )}
                    </div>
                    <div className="text-xs text-gray-600">{t('device_analytic.platform_distribution.visits_per_user')}</div>
                  </div>
                </div>

                {/* Premium: Touchpoints accessed */}
                {isPremium && platform?.touchpoints_accessed && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{t('device_analytic.platform_distribution.links_accessed')}</span>
                      <span className="font-medium text-indigo-600">
                        {platform?.touchpoints_accessed}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default PlatformDistribution
