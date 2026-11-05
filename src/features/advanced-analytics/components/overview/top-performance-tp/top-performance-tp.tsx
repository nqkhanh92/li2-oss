import { TopTouchpoint } from '@/core/types/analytics/top-touch-point.type'
import { RankingPerformanceCard } from '../../ranking-performance-card'
import { Crown } from 'lucide-react'
import { getEngagementBadge, getPerformanceBadge } from '../../../utils/helper'
import { EmptySection } from '@/shared/components/customize/empty-section'
import { Button } from '@/shared/components/ui/button'
import { useTranslation } from 'react-i18next'

type TopPerformanceTpLeaderBoardProps = {
  top_touchpoints: TopTouchpoint[]
  allowExtraAdvancedAnalytic?: boolean
  active_touchpoints_in_period: number
  total_touchpoints_in_filter: number
}

export const TopPerformanceTpLeaderBoard = ({
  top_touchpoints,
  allowExtraAdvancedAnalytic = false,
  active_touchpoints_in_period,
  total_touchpoints_in_filter,
}: TopPerformanceTpLeaderBoardProps) => {
  const { t } = useTranslation('advanced_analytics')
  return (
    <div className="w-ful flex flex-col gap-6">
      {/* FREE TIER: Limited Touchpoints List */}
      {!allowExtraAdvancedAnalytic && (
        <div className="flex flex-col gap-4">
          {/* Show only top 3 with basic info */}
          <div className="flex flex-col gap-3">
            {top_touchpoints?.slice(0, 3).map((touchpoint, index) => (
              <div
                key={touchpoint.touchpoint_id}
                className="flex items-center justify-between p-4 rounded-lg border border-gray-200 shadow-sm"
              >
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full font-bold text-sm">
                    #{touchpoint.rank}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{touchpoint.name}</div>
                    <div className="text-xs text-gray-500">
                      {touchpoint?.core_metrics?.active_days !== 1
                        ? t('top_performing_links.interactions_active_plural', {
                            interactions: touchpoint?.core_metrics?.total_interactions,
                            days: touchpoint?.core_metrics?.active_days,
                          })
                        : t('top_performing_links.interactions_active', {
                            interactions: touchpoint?.core_metrics?.total_interactions,
                            days: touchpoint?.core_metrics?.active_days,
                          })}
                    </div>
                  </div>
                </div>

                {/* Limited metrics */}
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">
                    {touchpoint?.core_metrics?.volume_share_pct || 0}%
                  </div>
                  <div className="text-xs text-gray-500">{t('top_performing_links.volume_share')}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Locked Premium Features Teaser */}
          <div className="">
            <div className="inset-0 flex items-center justify-center bg-background/90 backdrop-blur-xs rounded-lg">
              <div className="text-center p-6">
                <Crown className="w-10 h-10 text-indigo-500 mx-auto mb-3" />
                <div className="font-bold text-lg text-gray-900 mb-2">{t('top_performing_links.unlock_ranking')}</div>
                <div className="text-sm text-gray-600 mb-4 max-w-sm">
                  {t('top_performing_links.unlock_desc')}
                </div>
              </div>
            </div>
          </div>

          {/* Conversion-focused feature preview */}
          <div className="bg-linear-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h5 className="font-semibold text-indigo-900 mb-2">
                  {t('top_performing_links.premium_missing_title')}
                </h5>
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-indigo-800">{t('top_performing_links.feature_scoring')}</span>
                    <Crown className="w-3 h-3 text-red-500" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-indigo-800">{t('top_performing_links.feature_audience')}</span>
                    <Crown className="w-3 h-3 text-yellow-500" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-indigo-800">{t('top_performing_links.feature_peak')}</span>
                    <Crown className="w-3 h-3 text-green-500" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-indigo-800">{t('top_performing_links.feature_engagement')}</span>
                    <Crown className="w-3 h-3 text-blue-500" />
                  </div>
                </div>
              </div>
              <div className="text-center ml-4">
                <div className="text-2xl font-bold text-indigo-600 mb-1">
                  {total_touchpoints_in_filter}
                </div>
                <div className="text-xs text-indigo-700">{t('top_performing_links.total_touchpoints')}</div>
              </div>
            </div>

            <Button
              type="button"
              className="w-full mt-4 bg-linear-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all flex items-center justify-center space-x-2"
              iconLeft={<Crown />}
            >
              {t('top_performing_links.unlock_analysis')}
            </Button>
          </div>
        </div>
      )}

      {/* PREMIUM TIER: Complete Touchpoints Analysis */}
      {allowExtraAdvancedAnalytic && (
        <div className="flex flex-col gap-6">
          {/* Premium: Enhanced Detailed touchpoints list */}
          {top_touchpoints && top_touchpoints?.length > 0 ? (
            <div className="flex flex-col gap-6">
              {top_touchpoints?.map((touchpoint, index) => {
                const performanceBadge = getPerformanceBadge(
                  touchpoint?.performance_tier,
                  touchpoint?.performance_score
                )
                const engagementBadge = getEngagementBadge(touchpoint?.engagement_quality)
                return (
                  <RankingPerformanceCard
                    key={touchpoint?.touchpoint_id + '_' + index}
                    id={touchpoint?.touchpoint_id}
                    touchpoint={touchpoint}
                    performanceBadge={performanceBadge}
                    engagementBadge={engagementBadge}
                  />
                )
              })}
            </div>
          ) : (
            <EmptySection description={t('top_performing_links.empty_leaderboard')} />
          )}
          {/* Premium: Summary insights */}
          <div className="bg-linear-to-r from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-200">
            <h5 className="font-semibold text-purple-900 mb-3">{t('top_performing_links.perf_summary')}</h5>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-lg font-bold text-purple-700">
                  {
                    top_touchpoints?.filter((tp) => tp?.performance_tier === 'top_performer')
                      ?.length
                  }
                </div>
                <div className="text-purple-600">{t('top_performing_links.top_performers')}</div>
              </div>
              <div>
                <div className="text-lg font-bold text-purple-700">
                  {active_touchpoints_in_period}
                </div>
                <div className="text-purple-600">{t('top_performing_links.active_period')}</div>
              </div>
              <div>
                <div className="text-lg font-bold text-purple-700">
                  {Math.round(
                    top_touchpoints?.reduce(
                      (sum, tp) => sum + tp?.core_metrics?.volume_share_pct!,
                      0
                    )
                  ) || 0}
                  %
                </div>
                <div className="text-purple-600">{t('top_performing_links.top5_share')}</div>
              </div>
              <div>
                <div className="text-lg font-bold text-purple-700">
                  {top_touchpoints?.reduce(
                    (sum, tp) => sum + tp?.core_metrics?.total_interactions!,
                    0 || 0
                  )}
                </div>
                <div className="text-purple-600">{t('top_performing_links.total_interactions')}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
