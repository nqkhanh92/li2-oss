// services/channelAnalysis.ts
import { Breakdown, HeatmapDaum } from '@/core/types/analytics/peak-heatmap.type'
import { Channel } from '../../constants'
import { formatTimeRange } from '../../utils/calculation'

export const analyzeChannels = (channels: Channel[], heatmapData: HeatmapDaum[]) =>
  channels?.map((channel) => {
    const total = heatmapData?.reduce(
      (sum, d) => sum + (d.breakdown?.[channel.key as keyof Breakdown] || 0),
      0
    )

    const peak = heatmapData
      ?.filter((d) => (d.breakdown?.[channel.key as keyof Breakdown] || 0) > 0)
      ?.reduce(
        (max, current) =>
          (current.breakdown?.[channel.key as keyof Breakdown] || 0) >
          (max?.breakdown?.[channel.key as keyof Breakdown] || 0)
            ? current
            : max,
        null as HeatmapDaum | null
      )

    const activeHours = heatmapData
      ?.filter((d) => (d.breakdown?.[channel.key as keyof Breakdown] || 0) > 0)
      ?.map((d) => d.hour_of_day)
      ?.sort((a, b) => a - b)

    return {
      ...channel,
      total,
      peak,
      activeTimeRange: formatTimeRange(
        // Todo: remove length limit later
        activeHours?.length > 3 ? activeHours?.slice(0, 3) : activeHours
      ),
      hasActivity: total > 0,
    }
  })
