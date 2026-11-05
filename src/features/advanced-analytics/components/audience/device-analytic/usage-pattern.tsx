import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { useAdvancedAnalytics } from '@/features/advanced-analytics/hooks/queries'
import { useParams } from 'next/navigation'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { getPlatformColor, getPlatformIcon } from '@/features/advanced-analytics/utils/helper'
import { useMemo, useState } from 'react'
import { Clock, ChevronDown, ChevronRight, Crown } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { UsagePattern as UsagePatternType } from '@/core/types/analytics/device-analytic.type'
import { useTranslation } from 'react-i18next'

const UsagePattern = () => {
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
  const [showUsagePatterns, setShowUsagePatterns] = useState(false)
  const usagePatterns: UsagePatternType = deviceAnalysisData?.device_data?.platforms[0]
    ?.usage_patterns || {
    business_hours_pct: 0,
    weekend_usage_pct: 0,
    weekday_visits: 0,
    weekend_visits: 0,
  }
  if (!usagePatterns || !deviceAnalysisData?.device_data?.platforms) {
    return <></>
  }
  return (
    <div className="bg-card rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center">
            <Clock className="w-5 h-5 text-indigo-600 mr-2" />
            {t('device_analytic.usage_pattern.title')}
            <Crown className="w-4 h-4 text-purple-500 ml-2" />
          </h3>
          <p className="text-sm text-gray-600">{t('device_analytic.usage_pattern.subtitle')}</p>
        </div>
        <Button
          onClick={() => setShowUsagePatterns(!showUsagePatterns)}
          className="h-auto text-xs bg-indigo-100 text-indigo-700 px-3 py-2 rounded-full hover:bg-indigo-200 transition-colors flex items-center space-x-1"
          iconLeft={showUsagePatterns ? <ChevronDown /> : <ChevronRight />}
        >
          <span>{showUsagePatterns ? t('device_analytic.usage_pattern.hide_details') : t('device_analytic.usage_pattern.show_details')}</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {deviceAnalysisData?.device_data?.platforms
          ?.filter((p) => p.usage_patterns)
          .map((platform, index) => (
            <div
              key={platform.platform}
              className="bg-slate-100 border-2 border-gray-200 rounded-lg p-5"
            >
              <div className="flex items-center justify-between mb-4">
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
                    <div className="font-semibold text-gray-900">{platform?.platform || ''}</div>
                    <div className="text-sm text-gray-600">{t('device_analytic.usage_pattern.timing_analysis')}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Business Hours vs Weekend */}
                <div className="bg-background rounded-lg p-4 border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                    <Clock className="w-4 h-4 mr-2 text-blue-600" />
                    {t('device_analytic.usage_pattern.time_distribution')}
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {platform?.usage_patterns?.business_hours_pct}%
                      </div>
                      <div className="text-sm text-blue-700">{t('device_analytic.usage_pattern.business_hours')}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {platform?.usage_patterns?.business_hours_visits} {t('device_analytic.usage_pattern.visits_suffix')}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {platform?.usage_patterns?.weekend_usage_pct}%
                      </div>
                      <div className="text-sm text-green-700">{t('device_analytic.usage_pattern.weekend')}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {platform?.usage_patterns?.weekend_visits} {t('device_analytic.usage_pattern.visits_suffix')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Weekday vs Weekend breakdown */}
                <div className="bg-background rounded-lg p-4 border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-3">{t('device_analytic.usage_pattern.weekly_pattern')}</h4>
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{
                          width: `${
                            (platform?.usage_patterns?.weekday_visits ||
                              0 / (platform?.total_visits || 0)) * 100
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>{t('device_analytic.usage_pattern.weekdays')} {platform?.usage_patterns?.weekday_visits}</span>
                    <span>{t('device_analytic.usage_pattern.weekend_label')} {platform?.usage_patterns?.weekend_visits}</span>
                  </div>
                </div>

                {showUsagePatterns && (
                  <div className="bg-background rounded-lg p-4 border border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-3">{t('device_analytic.usage_pattern.interaction_breakdown')}</h4>
                    <div className="space-y-2">
                      {platform?.interaction_breakdown &&
                        Object.entries(platform?.interaction_breakdown).map(
                          ([key, value]) =>
                            value > 0 && (
                              <div key={key} className="flex items-center justify-between text-sm">
                                <span className="text-gray-600 capitalize">
                                  {key
                                    .replace('_', ' ')
                                    .replace('clicks', 'Clicks')
                                    .replace('scans', 'Scans')
                                    .replace('taps', 'Taps')
                                    .replace('accesses', 'Access')}
                                  :
                                </span>
                                <span className="font-medium text-gray-900">{value}</span>
                              </div>
                            )
                        )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}

export default UsagePattern
