import { Award, ChevronDown, ChevronRight, Crown } from 'lucide-react'
import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { useAdvancedAnalytics } from '@/features/advanced-analytics/hooks/queries'
import { useParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { useTranslation } from 'react-i18next'

const QualityEvolution = () => {
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

  const [showQualityDetails, setShowQualityDetails] = useState<boolean>(false)

  const growth_analysis = useMemo(() => data?.growth_analysis, [data])

  if (!growth_analysis?.quality_evolution) return <></>
  return (
    <div className="bg-card rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center">
            <Award className="w-5 h-5 text-gold-600 mr-2" />
            {t('growth_trends.quality_evolution.title')}
            <Crown className="w-4 h-4 text-purple-500 ml-2" />
          </h3>
          <p className="text-sm text-gray-600">{t('growth_trends.quality_evolution.subtitle')}</p>
        </div>
        <Button
          onClick={() => setShowQualityDetails(!showQualityDetails)}
          type="button"
          size="xs"
          className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full hover:bg-indigo-200 transition-colors flex items-center font-normal"
          iconLeft={
            showQualityDetails ? (
              <ChevronDown className="max-h-3 max-w-3" />
            ) : (
              <ChevronRight className="max-h-3 max-w-3" />
            )
          }
        >
          <span>{showQualityDetails ? t('growth_trends.quality_evolution.hide_breakdown') : t('growth_trends.quality_evolution.show_breakdown')}</span>
        </Button>
      </div>

      {/* Quality Summary (Always Visible) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {(() => {
          const currentPeriod = growth_analysis?.quality_evolution?.find(
            (p) => p.period_type === 'current_period'
          )
          const previousPeriod = growth_analysis?.quality_evolution?.find(
            (p) => p.period_type === 'comparison_period'
          )

          return (
            <>
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-600">
                  {currentPeriod?.avg_visits_per_user || 'N/A'}
                </div>
                <div className="text-sm text-green-700">{t('growth_trends.quality_evolution.visits_user')}</div>
                {previousPeriod && (
                  <div
                    className={`text-xs mt-1 ${
                      currentPeriod?.avg_visits_per_user! > previousPeriod.avg_visits_per_user!
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {currentPeriod?.avg_visits_per_user! > previousPeriod.avg_visits_per_user!
                      ? '↑'
                      : '↓'}{' '}
                    {t('growth_trends.quality_evolution.vs_prev')}
                  </div>
                )}
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="text-2xl font-bold text-orange-600">
                  {currentPeriod?.avg_countries_per_day || 'N/A'}
                </div>
                <div className="text-sm text-orange-700">{t('growth_trends.quality_evolution.countries_day')}</div>
                {previousPeriod && (
                  <div
                    className={`text-xs mt-1 ${
                      currentPeriod?.avg_visits_per_user! > previousPeriod.avg_countries_per_day
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {currentPeriod?.avg_visits_per_user! > previousPeriod.avg_countries_per_day
                      ? '↑'
                      : '↓'}{' '}
                    {t('growth_trends.quality_evolution.vs_prev')}
                  </div>
                )}
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="text-2xl font-bold text-purple-600">
                  {currentPeriod?.avg_active_channels || 'N/A'}
                </div>
                <div className="text-sm text-purple-700">{t('growth_trends.quality_evolution.active_channels')}</div>
                {previousPeriod && (
                  <div
                    className={`text-xs mt-1 ${
                      currentPeriod!.avg_active_channels > previousPeriod.avg_active_channels
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {currentPeriod!.avg_active_channels > previousPeriod.avg_active_channels
                      ? '↑'
                      : '↓'}{' '}
                    {t('growth_trends.quality_evolution.vs_prev')}
                  </div>
                )}
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-blue-600">
                  {currentPeriod?.mobile_percentage || 'N/A'}%
                </div>
                <div className="text-sm text-blue-700">{t('growth_trends.quality_evolution.mobile_traffic')}</div>
                {previousPeriod && (
                  <div
                    className={`text-xs mt-1 ${
                      currentPeriod?.mobile_percentage! > previousPeriod.mobile_percentage
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {currentPeriod?.mobile_percentage! > previousPeriod.mobile_percentage
                      ? '↑'
                      : '↓'}{' '}
                    {t('growth_trends.quality_evolution.vs_prev')}
                  </div>
                )}
              </div>
            </>
          )
        })()}
      </div>

      {/* Detailed Breakdown (Progressive Disclosure) */}
      {showQualityDetails && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {growth_analysis?.quality_evolution?.map((period, index) => {
            const isCurrentPeriod = period.period_type === 'current_period'

            return (
              <div
                key={period.period_type + index}
                className={`rounded-lg p-4 border ${
                  isCurrentPeriod ? 'bg-blue-50 border-blue-200' : 'bg-slate-200 border-slate-200'
                }`}
              >
                <div className="text-center mb-4">
                  <div
                    className={`text-lg font-bold ${
                      isCurrentPeriod ? 'text-blue-900' : 'text-gray-700'
                    }`}
                  >
                    {isCurrentPeriod ? t('growth_trends.quality_evolution.current_period') : t('growth_trends.quality_evolution.previous_period')}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {period.days_analyzed} {t('growth_trends.quality_evolution.days_analyzed')}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-background rounded border">
                    <span className="text-sm text-gray-600">{t('growth_trends.quality_evolution.visits_per_user')}</span>
                    <span className="font-bold text-green-600">{period.avg_visits_per_user}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-background rounded border">
                    <span className="text-sm text-gray-600">{t('growth_trends.quality_evolution.countries_day')}</span>
                    <span className="font-bold text-orange-600">
                      {period.avg_countries_per_day}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-background rounded border">
                    <span className="text-sm text-gray-600">{t('growth_trends.quality_evolution.active_channels')}</span>
                    <span className="font-bold text-purple-600">{period.avg_active_channels}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-background rounded border">
                    <span className="text-sm text-gray-600">{t('growth_trends.quality_evolution.mobile_pct')}</span>
                    <span className="font-bold text-blue-600">{period.mobile_percentage}%</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default QualityEvolution
