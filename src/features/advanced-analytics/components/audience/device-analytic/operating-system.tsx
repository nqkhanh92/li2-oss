import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { useAdvancedAnalytics } from '@/features/advanced-analytics/hooks/queries'
import { useParams } from 'next/navigation'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { ResponsiveContainer, Tooltip, CartesianGrid, BarChart, XAxis, YAxis, Bar } from 'recharts'
import { getPlatformIcon } from '@/features/advanced-analytics/utils/helper'
import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { useTranslation } from 'react-i18next'

const OperationSystemAnalysis = () => {
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

  const [showOSDetails, setShowOSDetails] = useState(false)
  const operatingSystems = deviceAnalysisData?.device_data?.operating_systems || [
    {
      platform: 'None',
      os: 'No data',
      total_visits: 0,
      unique_users: 0,
      os_rank_in_platform: 0,
      visits_per_user: 0,
      os_share_in_platform_pct: 0,
    },
  ]

  // Operating systems grouped by platform
  const osGroupedData = useMemo(
    () =>
      deviceAnalysisData?.device_data?.platforms?.map((platform) => {
        const osForPlatform = operatingSystems?.filter((os) => os.platform === platform.platform)
        return {
          platform: platform.platform,
          operatingSystems: osForPlatform,
        }
      }) || [],
    [deviceAnalysisData?.device_data?.platforms]
  )

  return (
    <div className="bg-card rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{t('device_analytic.operating_system.title')}</h3>
          <p className="text-sm text-gray-600">{t('device_analytic.operating_system.subtitle')}</p>
        </div>
        <Button
          type="button"
          onClick={() => setShowOSDetails(!showOSDetails)}
          size="xs"
          className="bg-blue-100 text-blue-700 px-3 py-2 rounded-full hover:bg-blue-200 transition-colors flex items-center"
          iconLeft={
            showOSDetails ? (
              <ChevronDown className="max-h-3 max-w-3" />
            ) : (
              <ChevronRight className="max-h-3 max-w-3" />
            )
          }
        >
          <span>{showOSDetails ? t('device_analytic.operating_system.hide_details') : t('device_analytic.operating_system.show_details')}</span>
        </Button>
      </div>

      {/* OS Overview Chart */}
      <div className="mb-6">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={operatingSystems?.slice(0, 5)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="os"
              stroke="#6b7280"
              fontSize={12}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis stroke="#6b7280" fontSize={12} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null
                const data = payload[0].payload
                return (
                  <div className="bg-background border border-gray-200 rounded-lg p-3 shadow-lg">
                    <div className="text-sm font-medium text-gray-900 mb-2">
                      {label} ({data?.platform})
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center justify-between space-x-4">
                        <span className="text-blue-600">{t('device_analytic.operating_system.visits')}</span>
                        <span className="font-bold">{data?.total_visits || 0}</span>
                      </div>
                      <div className="flex items-center justify-between space-x-4">
                        <span className="text-green-600">{t('device_analytic.operating_system.users')}</span>
                        <span className="font-bold">{data?.unique_users || 0}</span>
                      </div>
                      {isPremium && data?.visits_per_user && (
                        <div className="flex items-center justify-between space-x-4">
                          <span className="text-purple-600">{t('device_analytic.operating_system.visits_per_user')}</span>
                          <span className="font-bold">{data?.visits_per_user || 0}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              }}
            />
            <Bar dataKey="total_visits" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* OS Details - Progressive Disclosure */}
      {showOSDetails && (
        <div className="space-y-4 border-t border-gray-100 pt-6">
          {osGroupedData?.map((platformGroup, platformIndex) => (
            <div key={platformGroup?.platform || '' + platformIndex}>
              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                {getPlatformIcon(platformGroup?.platform || '')}
                <span className="ml-2">{t('device_analytic.operating_system.os_title', { platform: platformGroup?.platform || '' })}</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {platformGroup?.operatingSystems?.map((os, index) => (
                  <div
                    key={`${os?.platform}-${os?.os}`}
                    className="bg-slate-50 rounded-lg p-3 border border-slate-200"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-gray-900 truncate">
                        {os?.os === '-' ? t('device_analytic.operating_system.unknown') : os?.os}
                      </div>
                      {isPremium && os?.os_rank_in_platform && (
                        <div className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full font-bold text-xs">
                          #{os?.os_rank_in_platform}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <div className="text-gray-600">{t('device_analytic.operating_system.visits')}</div>
                        <div className="font-semibold text-blue-600">{os?.total_visits}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">{t('device_analytic.operating_system.users')}</div>
                        <div className="font-semibold text-green-600">{os?.unique_users}</div>
                      </div>
                    </div>

                    {isPremium && (
                      <div className="mt-3 pt-2 border-t border-gray-200 space-y-1 text-xs">
                        {os?.visits_per_user && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Visits/User:</span>
                            <span className="font-medium text-purple-600">
                              {os?.visits_per_user}
                            </span>
                          </div>
                        )}
                        {os?.os_share_in_platform_pct && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">{t('device_analytic.operating_system.platform_share')}</span>
                            <span className="font-medium text-orange-600">
                              {os?.os_share_in_platform_pct}%
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default OperationSystemAnalysis
