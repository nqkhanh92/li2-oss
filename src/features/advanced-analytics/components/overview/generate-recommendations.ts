// services/recommendations.ts

import { HeatmapDaum } from '@/core/types/analytics/peak-heatmap.type'
import { Channel, COLOR_CLASSES } from '../../constants'
import { analyzeChannels } from './channel-analysis'
import { formatHour } from '../../utils/calculation'
import type { TFunction } from 'i18next'

export const generateRecommendations = (
  heatmapData: HeatmapDaum[],
  channels: Channel[],
  t: TFunction
) => {
  const channelAnalysis = analyzeChannels(channels, heatmapData)
  const recommendations: {
    color: keyof typeof COLOR_CLASSES
    title: string
    description: string
  }[] = []

  const totalActivity = heatmapData?.reduce((sum, d) => sum + d.interactions, 0)

  // Peak time
  const peakData = heatmapData?.reduce((max, current) =>
    current.interactions > max.interactions ? current : max
  )
  if (peakData.interactions > 0) {
    recommendations.push({
      color: 'green',
      title: t('advanced_analytics:peak_hours.rec_optimize_title'),
      description: t('advanced_analytics:peak_hours.rec_optimize_desc', {
        day: peakData.day_name,
        hour: formatHour(peakData.hour_of_day),
      }),
    })
  }

  // Inactive channels
  const inactive = channelAnalysis?.filter((c) => !c.hasActivity)
  if (inactive.length > 0) {
    recommendations.push({
      color: 'yellow',
      title: t('advanced_analytics:peak_hours.rec_activate_title', { channel: inactive[0].name }),
      description: t('advanced_analytics:peak_hours.rec_activate_desc', {
        channels: inactive.map((c) => c.name).join(', '),
      }),
    })
  }

  // Weekday vs weekend
  const weekendActivity = heatmapData
    ?.filter((d) => ['Saturday', 'Sunday'].includes(d.day_name))
    .reduce((sum, d) => sum + d.interactions, 0)
  const weekdayActivity = totalActivity - weekendActivity

  if (weekdayActivity > weekendActivity * 2) {
    recommendations.push({
      color: 'blue',
      title: t('advanced_analytics:peak_hours.rec_weekday_title'),
      description: t('advanced_analytics:peak_hours.rec_weekday_desc', {
        pct: Math.round((weekdayActivity / totalActivity) * 100),
      }),
    })
  } else if (weekendActivity > weekdayActivity) {
    recommendations.push({
      color: 'purple',
      title: t('advanced_analytics:peak_hours.rec_weekend_title'),
      description: t('advanced_analytics:peak_hours.rec_weekend_desc'),
    })
  }

  return recommendations.slice(0, 3)
}
