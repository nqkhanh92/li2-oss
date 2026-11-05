import { ChevronDown, ChevronRight, Crown } from 'lucide-react'
import { getMomentumStyling } from '../../../utils/helper'
import { useTranslation } from 'react-i18next'
import { useMemo, useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { useParams } from 'next/navigation'
import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { useAdvancedAnalytics } from '@/features/advanced-analytics/hooks/queries'

const ChannelGrowthAnalytic = () => {
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

  const { data } = useAdvancedAnalytics(org_id, 'acquisitions-growth-trends', {
    period_days: timePeriod,
    tag_ids: selectedTagsIds,
    touchpoint_ids: selectedTouchpointsIds,
    collection_ids: collectionIds,
  })

  const summary = useMemo(() => data?.growth_analysis?.summary, [data])
  const sourceGrowth = useMemo(() => data?.growth_analysis?.source_growth, [data])

  // Progressive disclosure state
  const [showChannelDetails, setShowChannelDetails] = useState<boolean>(false)

  return (
    <div className="bg-card rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{t('growth_trends.channel_growth.title')}</h3>
          <p className="text-sm text-gray-600">{t('growth_trends.channel_growth.subtitle')}</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
            {allowExtraAdvancedAnalytic ? t('growth_trends.channel_growth.all_sources', { n: sourceGrowth?.length }) : t('growth_trends.channel_growth.top_5_sources')}
            {allowExtraAdvancedAnalytic && (
              <Crown className="inline w-3 h-3 ml-1 text-purple-500" />
            )}
          </div>
          {allowExtraAdvancedAnalytic ? (
            <Button
              onClick={() => setShowChannelDetails(!showChannelDetails)}
              type="button"
              size="xs"
              className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full hover:bg-blue-200 transition-colors flex items-center font-normal"
              iconLeft={
                showChannelDetails ? (
                  <ChevronDown className="max-h-3 max-w-3" />
                ) : (
                  <ChevronRight className="max-h-3 max-w-3" />
                )
              }
            >
              <span>{showChannelDetails ? t('growth_trends.channel_growth.hide_details') : t('growth_trends.channel_growth.show_details')}</span>
            </Button>
          ) : (
            <div className="relative group">
              <Button
                className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full cursor-not-allowed flex items-center opacity-60 font-normal"
                size="xs"
                disabled
                iconLeft={<Crown />}
              >
                <span>{t('growth_trends.channel_growth.details')}</span>
              </Button>
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                <div className="text-center">
                  <div className="font-medium mb-1">{t('growth_trends.channel_growth.premium_feature')}</div>
                  <div>{t('growth_trends.channel_growth.detailed_breakdowns')}</div>
                  <div>{t('growth_trends.channel_growth.growth_comparisons')}</div>
                </div>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Visual Bar Chart */}
      <div className="space-y-3">
        {sourceGrowth?.slice(0, allowExtraAdvancedAnalytic ? undefined : 5).map((source, index) => {
          const maxVisits = Math.max(...sourceGrowth?.map((s) => s.current_period_visits))
          const barWidth = (source.current_period_visits / maxVisits) * 100
          const momentumStyling = getMomentumStyling(source?.growth_momentum || '')

          return (
            <div key={source.channel} className="group">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full font-bold text-xs">
                    {index + 1}
                  </div>
                  <span className="font-medium text-gray-900 capitalize">{source.channel}</span>
                  <div
                    className={`px-2 py-1 rounded-full text-xs font-medium ${momentumStyling.bg} ${momentumStyling.color}`}
                  >
                    {source.growth_momentum}
                  </div>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <span className="font-bold text-gray-900">{source.current_period_visits}</span>
                  <span className="text-gray-500">{t('growth_trends.channel_growth.visits')}</span>
                  {source.visits_growth_rate && (
                    <span
                      className={`font-medium ${
                        source?.visits_growth_rate! > 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      ({source.visits_growth_rate > 0 ? '+' : ''}
                      {source.visits_growth_rate}%)
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ${
                    source.growth_momentum === 'accelerating'
                      ? 'bg-linear-to-r from-green-400 to-green-600'
                      : source.growth_momentum === 'emerging'
                      ? 'bg-linear-to-r from-purple-400 to-purple-600'
                      : source.growth_momentum === 'growing'
                      ? 'bg-linear-to-r from-blue-400 to-blue-600'
                      : source.growth_momentum === 'stable'
                      ? 'bg-linear-to-r from-yellow-400 to-yellow-600'
                      : 'bg-linear-to-r from-red-400 to-red-600'
                  }`}
                  style={{ width: `${barWidth}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-end pr-2">
                  <div className="text-xs font-medium text-white drop-shadow-sm">
                    {Math.round(
                      (source?.current_period_visits / (summary?.current_total_visits || 0)) * 100
                    )}
                    %
                  </div>
                </div>
              </div>

              {/* Detailed Breakdown - Progressive Disclosure */}
              {showChannelDetails &&
                allowExtraAdvancedAnalytic &&
                source?.comparison_period_visits !== undefined && (
                  <div className="mt-2 p-3 rounded border border-gray-200 bg-slate-50">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div className="text-center">
                        <div className="font-bold text-blue-600">
                          {source?.current_period_visits || 0}
                        </div>
                        <div className="text-gray-600">{t('growth_trends.channel_growth.current_visits')}</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-green-600">
                          {source?.current_period_users || 'N/A'}
                        </div>
                        <div className="text-gray-600">{t('growth_trends.channel_growth.current_users')}</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-purple-600">
                          {source?.comparison_period_visits || 0}
                        </div>
                        <div className="text-gray-600">{t('growth_trends.channel_growth.previous_visits')}</div>
                      </div>
                      <div className="text-center">
                        <div
                          className={`font-bold ${
                            source?.visits_growth_rate! > 0
                              ? 'text-green-600'
                              : source?.visits_growth_rate! < 0
                              ? 'text-red-600'
                              : 'text-gray-600'
                          }`}
                        >
                          {source?.visits_growth_rate
                            ? `${
                                source?.visits_growth_rate! > 0 ? '+' : ''
                              }${source?.visits_growth_rate!}%`
                            : '—'}
                        </div>
                        <div className="text-gray-600">{t('growth_trends.channel_growth.growth_rate')}</div>
                      </div>
                    </div>
                  </div>
                )}
            </div>
          )
        })}
      </div>

      {/* Free Tier: Premium Feature Hint */}
      {!allowExtraAdvancedAnalytic && (
        <div className="mt-4 p-4 bg-linear-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
          <div className="flex items-center space-x-3">
            <Crown className="w-5 h-5 text-purple-500" />
            <div className="flex-1">
              <div className="text-sm font-medium text-purple-900 mb-1">
                {t('growth_trends.channel_growth.unlock_title')}
              </div>
              <div className="text-xs text-purple-700">
                {t('growth_trends.channel_growth.unlock_desc')}
              </div>
            </div>
            <Button className="text-xs bg-purple-500 text-white px-3 py-1 rounded-full hover:bg-purple-600 transition-colors">
              {t('growth_trends.channel_growth.upgrade_btn')}
            </Button>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
        <div className="text-center">
          <div className="text-lg font-bold text-green-600">
            {sourceGrowth?.filter((s) => s.growth_momentum === 'accelerating').length || 0}
          </div>
          <div className="text-xs text-gray-600">Accelerating</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-purple-600">
            {sourceGrowth?.filter((s) => s.growth_momentum === 'emerging').length || 0}
          </div>
          <div className="text-xs text-gray-600">Emerging</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-blue-600">
            {sourceGrowth?.filter((s) => s.growth_momentum === 'growing').length || 0}
          </div>
          <div className="text-xs text-gray-600">Growing</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-red-600">
            {sourceGrowth?.filter((s) => s.growth_momentum === 'declining').length || 0}
          </div>
          <div className="text-xs text-gray-600">Declining</div>
        </div>
      </div>
    </div>
  )
}

export default ChannelGrowthAnalytic
