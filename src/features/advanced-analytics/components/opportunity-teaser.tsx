import { DailyData, Summary } from '@/core/types/analytics/daily-trend.type'
import { CommonStats, Stats, StatsPanel } from '@/core/types/analytics/stats-panel.type'
import { Activity, Crown } from 'lucide-react'
import { Channel, channels } from '../constants'
import { Button } from '@/shared/components/ui/button'
import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { useAdvancedAnalytics } from '@/features/advanced-analytics/hooks/queries'
import { useParams } from 'next/navigation'

const OpportunityTeaser = () => {
  const { allowExtraAdvancedAnalytic, timePeriod, selectedTags, selectedTouchpoints } =
    useAdvancedAnalyticsProvider()
  const { org_id } = useParams<{ org_id: string }>()
  const selectedTagsIds = useDebounce(selectedTags, 500)
  const selectedTouchpointsIds = useDebounce(selectedTouchpoints, 500)
  const { data: overviewsData } = useAdvancedAnalytics(org_id, 'stats-panel', {
    period_days: timePeriod,
    tag_ids: selectedTagsIds,
    touchpoint_ids: selectedTouchpointsIds,
  })
  const { data: dailyTrendData } = useAdvancedAnalytics(org_id, 'daily-trend', {
    period_days: timePeriod,
    tag_ids: selectedTagsIds,
    touchpoint_ids: selectedTouchpointsIds,
  })
  return (
    <div
      className="bg-linear-to-br from-orange-50 via-red-50 to-pink-50 rounded-xl p-6 border
border-orange-200 relative overflow-hidden"
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="grid grid-cols-24 gap-1 h-full">
          {Array.from({ length: 168 }).map((_, i) => (
            <div
              key={i}
              className={`bg-orange-400 ${Math.random() > 0.8 ? 'opacity-100' : 'opacity-30'}`}
            />
          ))}
        </div>
      </div>

      <div className="relative z-10 flex flex-col gap-6">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="text-xl font-bold text-gray-900 flex items-center">
              <Activity className="w-6 h-6 text-orange-600 mr-2" />
              You're Missing Peak Hours!
              <span className="text-2xl ml-2">⏰</span>
            </h4>
            <p className="text-gray-600">Your audience has specific active times you can't see</p>
          </div>
          <Crown className="w-8 h-8 text-orange-500" />
        </div>

        {/* Teaser Stats with Real Impact - Data-Driven */}
        {(() => {
          // Calculate real stats from Free tier data
          const totalInteractions = overviewsData?.stats?.total_visits?.value || 0
          const peakDayInteractions = Math.max(
            ...(dailyTrendData?.daily_data?.map((d) => d.total_interactions) || [])
          )
          const peakDayPercentage =
            totalInteractions > 0
              ? Math.round((peakDayInteractions || 0 / totalInteractions || 0) * 100)
              : 0

          // Count unused channels
          const activeChannels = channels?.filter((channel: Channel) => {
            const stat = overviewsData?.stats?.[channel.key as keyof Stats] as
              | CommonStats
              | undefined
            return (stat?.value ?? 0) > 0
          })

          const unusedChannels = channels?.length - activeChannels?.length

          // Calculate active vs inactive days
          const activeDays = dailyTrendData?.summary?.days_with_activity || 0
          const totalDays = dailyTrendData?.summary?.total_days || 0
          const inactiveDays = totalDays - activeDays

          return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-background/80 backdrop-blur-xs rounded-lg p-4 border border-orange-200">
                <div className="text-2xl font-bold text-orange-600">{peakDayPercentage}%</div>
                <div className="text-sm text-gray-700">of your activity happens in just 1 day</div>
                <div className="text-xs text-orange-600 mt-1">🔒 Hour-by-hour breakdown locked</div>
              </div>
              <div className="bg-background/80 backdrop-blur-xs rounded-lg p-4 border border-orange-200">
                <div className="text-2xl font-bold text-red-600">{unusedChannels}</div>
                <div className="text-sm text-gray-700">unused channels with potential</div>
                <div className="text-xs text-red-600 mt-1">🔒 Channel timing insights locked</div>
              </div>
              <div className="bg-background/80 backdrop-blur-xs rounded-lg p-4 border border-orange-200">
                <div className="text-2xl font-bold text-purple-600">{inactiveDays}</div>
                <div className="text-sm text-gray-700">days with zero activity</div>
                <div className="text-xs text-purple-600 mt-1">🔒 Peak hours analysis locked</div>
              </div>
            </div>
          )
        })()}

        {/* FOMO List */}
        <div className="bg-background/90 rounded-lg p-4 mb-4">
          <div className="text-sm font-semibold text-gray-900 mb-3">What you're missing:</div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-gray-700">
                Your best posting times (could 3x your engagement)
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-gray-700">Dead hours you're wasting money on</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-gray-700">Weekend vs weekday optimization strategy</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-gray-700">Channel-specific peak hours</span>
            </div>
          </div>
        </div>

        {/* Urgency CTA */}
        <div className="flex items-center space-x-4">
          <Button
            className="h-auto bg-linear-to-r from-orange-500 to-red-500 text-white px-6 py-4 rounded-lg font-bold hover:from-orange-600 hover:to-red-600 transition-all duration-200
flex items-center justify-center space-x-2 shadow-lg hover:text-white w-full"
            iconLeft={<Crown />}
          >
            Unlock Peak Hours Now
          </Button>
          <div className="text-xs text-gray-500">
            <div className="font-semibold">Limited Time</div>
            <div>30% off Premium</div>
          </div>
        </div>
      </div>
    </div>
  )
}
export default OpportunityTeaser
