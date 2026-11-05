import { SourceCategory } from '@/core/types/analytics/acquisition-traffic.type'
import { Channel, channels, COLOR_CLASSES } from '../constants'
import { InteractionBreakdown } from '@/core/types/analytics/campaign-performance.type'
import {
  Activity,
  BarChart3,
  Clock,
  Link,
  Monitor,
  Moon,
  Navigation,
  QrCode,
  Smartphone,
  Sun,
  Wifi,
  Zap,
} from 'lucide-react'
import { DailyTrend } from '@/core/types/analytics/acquisitions-growth-trends.type'

export const getPerformanceBadge = (tier: string, score: number) => {
  if (tier === 'top_performer')
    return {
      bg: 'bg-green-100',
      text: 'text-green-800',
      label: 'Top Performer',
      icon: '🏆',
    }
  if (tier === 'good_performer')
    return {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      label: 'Good Performer',
      icon: '👍',
    }
  if (tier === 'good_performer')
    return {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      label: 'Good Performer',
      icon: '👍',
    }
  if (tier === 'average_performer')
    return {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      label: 'Average',
      icon: '⚖️',
    }
  return {
    bg: 'bg-red-100',
    text: 'text-red-800',
    label: 'Needs Work',
    icon: '⚠️',
  }
}

export const getEngagementBadge = (quality: string) => {
  if (quality === 'high_engagement')
    return {
      bg: 'bg-emerald-100',
      text: 'text-emerald-800',
      label: 'High Engagement',
      icon: '🔥',
    }
  if (quality === 'medium_engagement')
    return {
      bg: 'bg-cyan-100',
      text: 'text-cyan-800',
      label: 'Medium Engagement',
      icon: '📈',
    }
  if (quality === 'low_engagement')
    return {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      label: 'Average',
      icon: '⚖️',
    }
  return {
    bg: 'bg-red-100',
    text: 'text-red-800',
    label: 'Needs Work',
    icon: '⚠️',
  }
}

// Helper function to get flag emoji
export const getFlagEmoji = (countryCode: string) => {
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(char.charCodeAt(0) + 127397))
}

// Helper function to get engagement level color
export const getEngagementColor = (rate: number) => {
  if (rate >= 5)
    return {
      bg: 'bg-green-100',
      text: 'text-green-800',
      label: 'High',
      icon: '🔥',
    }
  if (rate >= 3)
    return {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      label: 'Medium',
      icon: '📈',
    }
  if (rate >= 1)
    return {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      label: 'Low',
      icon: '⚡',
    }
  return {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    label: 'Very Low',
    icon: '😴',
  }
}

// Helper function to get choropleth color based on total visits
export const getChoroplethColor = (countryCode?: string, data?: any) => {
  if (!countryCode || !data) return '#F5F5F5' // No data - light gray
  const countryData = data?.geographic_data?.countries?.find((c: any) => c.country === countryCode)
  if (!countryData) return '#F5F5F5' // No data - light gray

  const visits = countryData.total_visits
  const maxVisits = Math.max(...data.geographic_data.countries.map((c: any) => c.total_visits))
  const intensity = visits / maxVisits

  // console.log(`Color for ${countryCode}:`, { visits, maxVisits, intensity });

  // Blue color scale based on visit volume
  if (intensity >= 0.8) return '#0D47A1' // Very high - dark blue
  if (intensity >= 0.6) return '#1976D2' // High - medium blue
  if (intensity >= 0.4) return '#42A5F5' // Medium - light blue
  if (intensity >= 0.2) return '#90CAF9' // Low - very light blue
  return '#E3F2FD' // Very low - pale blue
}

// Helper function to format channel breakdown
export const formatChannelBreakdown = (breakdown: any) => {
  if (!breakdown) return null
  return channels.filter((channel: Channel) => breakdown[channel.key] > 0)
}

export const getColorClasses = (color: keyof typeof COLOR_CLASSES) =>
  COLOR_CLASSES[color] || COLOR_CLASSES.blue

export const getSourceIcon = (sourceCategory: SourceCategory) => {
  if(!sourceCategory) return '📊'
  const icons = {
    direct: '🔗',
    social: '📱',
    search: '🔍',
    email: '📧',
    referral: '🌐',
    paid: '💰',
    organic: '🌱',
  }
  return icons[sourceCategory] || '📊'
}

// Get interaction for traffic sourcess breakdown with icons
export const getInteractionBreakdownForTrafficSources = (breakdown: InteractionBreakdown) => {
  if (!breakdown) return []

  const channels = [
    { key: 'link_interactions', name: 'Link Clicks', icon: Link, color: 'text-blue-600' },
    { key: 'qr_interactions', name: 'QR Scans', icon: QrCode, color: 'text-green-600' },
    { key: 'nfc_interactions', name: 'NFC Taps', icon: Zap, color: 'text-orange-600' },
    { key: 'wifi_interactions', name: 'WiFi Access', icon: Wifi, color: 'text-purple-600' },
  ]

  return channels.filter(
    (channel) =>
      breakdown[channel.key as keyof InteractionBreakdown] &&
      breakdown[channel.key as keyof InteractionBreakdown] > 0
  )
}

// Helper function to get quality tier styling
export const getQualityTierStyle = (qualityTier: string) => {
  switch (qualityTier) {
    case 'excellent':
      return { bg: 'bg-green-100', text: 'text-green-800', label: 'Excellent', icon: '🏆' }
    case 'good':
      return { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Good', icon: '👍' }
    case 'average':
      return { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Average', icon: '⚖️' }
    default:
      return { bg: 'bg-red-100', text: 'text-red-800', label: 'Needs Work', icon: '⚠️' }
  }
}

// Helper function to get source diversity styling
export const getSourceDiversityStyle = (diversity: string) => {
  switch (diversity) {
    case 'high_diversity':
      return { bg: 'bg-green-100', text: 'text-green-800', label: 'High Diversity', icon: '🌟' }
    case 'medium_diversity':
      return { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Medium Diversity', icon: '📈' }
    case 'low_diversity':
      return { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Low Diversity', icon: '⚡' }
    default:
      return { bg: 'bg-red-100', text: 'text-red-800', label: 'Very Limited', icon: '😴' }
  }
}

// Get performance tier styling
export const getPerformanceTierStyle = (tier: string) => {
  switch (tier) {
    case 'top_performer':
      return { bg: 'bg-green-100', text: 'text-green-800', label: 'Top', icon: '🏆' }
    case 'good_performer':
      return { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Good', icon: '👍' }
    case 'average_performer':
      return { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Average', icon: '⚖️' }
    case 'underperformer':
      return { bg: 'bg-red-100', text: 'text-red-800', label: 'Needs Work', icon: '⚠️' }
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Unknown', icon: '❓' }
  }
}

// Get trend direction styling
export const getTrendStyling = (trend: string) => {
  switch (trend) {
    case 'strong_growth':
      return {
        color: 'text-green-600',
        bg: 'bg-green-50',
        border: 'border-green-200',
        icon: '📈',
      }
    case 'moderate_growth':
      return { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', icon: '📊' }
    case 'stable':
      return {
        color: 'text-yellow-600',
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        icon: '⏸️',
      }
    case 'declining':
      return { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: '📉' }
    default:
      return { color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', icon: '❓' }
  }
}

// Get momentum styling
export const getMomentumStyling = (momentum: string) => {
  switch (momentum) {
    case 'emerging':
      return { color: 'text-purple-600', bg: 'bg-purple-100' }
    case 'accelerating':
      return { color: 'text-green-600', bg: 'bg-green-100' }
    case 'growing':
      return { color: 'text-blue-600', bg: 'bg-blue-100' }
    case 'stable':
      return { color: 'text-yellow-600', bg: 'bg-yellow-100' }
    case 'declining':
      return { color: 'text-red-600', bg: 'bg-red-100' }
    default:
      return { color: 'text-gray-600', bg: 'bg-gray-100' }
  }
}

export const getWeeklyAggregatedData = (
  dailyData?: DailyTrend[],
  allowExtraAdvancedAnalytic?: boolean
) => {
  const weeklyData: DailyTrend[] = []
  const weeks: Record<string, DailyTrend> = {}

  dailyData?.forEach((day) => {
    const date = new Date(day.date)
    const weekStart = new Date(date)
    weekStart.setDate(date.getDate() - date.getDay())
    const weekKey = weekStart.toISOString().split('T')[0]

    if (!weeks[weekKey]) {
      weeks[weekKey] = {
        date: weekKey,
        total_visits: 0,
        unique_users: 0,
        days_count: 0,
        visits_3day_avg: 0,
        countries_reached: 0,
        channels_active: 0,
      }
    }

    weeks[weekKey].total_visits += day.total_visits
    weeks[weekKey].unique_users += day.unique_users
    weeks[weekKey].days_count! += 1

    if (allowExtraAdvancedAnalytic && day.visits_3day_avg != null) {
      weeks[weekKey].visits_3day_avg! += day.visits_3day_avg
    }
    if (allowExtraAdvancedAnalytic && day.countries_reached != null) {
      weeks[weekKey].countries_reached = Math.max(
        weeks[weekKey].countries_reached ?? 0,
        day.countries_reached ?? 0
      )
    }
    if (allowExtraAdvancedAnalytic && day.channels_active != null) {
      weeks[weekKey].channels_active = Math.max(
        weeks[weekKey].channels_active ?? 0,
        day.channels_active ?? 0
      )
    }
  })

  Object.keys(weeks).forEach((weekKey) => {
    const week = weeks[weekKey]
    if (allowExtraAdvancedAnalytic && week.visits_3day_avg && week.days_count) {
      week.visits_3day_avg = Math.round((week.visits_3day_avg / week.days_count) * 10) / 10
    }
    weeklyData.push(week)
  })

  return weeklyData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

export const generateKeyInsightHeader = (trend_direction: string) => {
  return trend_direction === 'strong_growth'
    ? 'Strong Growth Trajectory'
    : trend_direction === 'moderate_growth'
    ? 'Moderate Growth Pattern'
    : trend_direction === 'stable'
    ? 'Traffic Stability'
    : 'Declining Trend Alert'
}

export const generateKeyInsightDescription = (trend_direction: string) => {
  return trend_direction === 'strong_growth'
    ? 'Your traffic is experiencing significant upward momentum'
    : trend_direction === 'moderate_growth'
    ? 'Steady growth with room for acceleration'
    : trend_direction === 'stable'
    ? 'Traffic levels are consistent and predictable'
    : 'Traffic is declining and needs immediate attention'
}

export const getVolatilityConsistencyInsightHeader = (growth_consistency: string) => {
  return growth_consistency === 'high_volatility'
    ? 'High Volatility Alert'
    : growth_consistency === 'moderate_volatility'
    ? 'Moderate Volatility'
    : 'High Volatility'
}

export const getVolatilityConsistencyInsightDescription = (growth_consistency: string) => {
  return growth_consistency === 'high_volatility'
    ? 'Very stable growth patterns'
    : growth_consistency === 'moderate_volatility'
    ? 'Some fluctuation but manageable'
    : 'Highly variable daily performance'
}

// Generate insights based on actual data patterns
export const getCustomerJourneyInsight = (
  single_touchpoint: number,
  total_users_analyzed: number
) => {
  const singleTouchPercent = Math.round((single_touchpoint / total_users_analyzed) * 100)
  if (singleTouchPercent >= 80) {
    return {
      type: 'immediate',
      message: 'Most customers engage immediately',
      implication: 'Focus on strong first impressions and clear value propositions',
    }
  } else if (singleTouchPercent >= 60) {
    return {
      type: 'quick',
      message: 'Customers decide relatively quickly',
      implication: 'Simple messaging with clear next steps works best',
    }
  } else {
    return {
      type: 'considered',
      message: 'Customers take time to evaluate',
      implication: 'Multi-touch nurturing campaigns may be beneficial',
    }
  }
}

// Helper functions
export const getPlatformIcon = (platform?: string) => {
  if (!platform) return <Activity className="w-4 h-4" />
  switch (platform.toLowerCase()) {
    case 'mobile':
      return <Smartphone className="w-4 h-4" />
    case 'desktop':
      return <Monitor className="w-4 h-4" />
    default:
      return <Activity className="w-4 h-4" />
  }
}

export const getEngagementAdvantageColor = (advantage: string) => {
  switch (advantage) {
    case 'high':
      return 'text-green-600 bg-green-100 border-green-200'
    case 'medium':
      return 'text-yellow-600 bg-yellow-100 border-yellow-200'
    case 'standard':
      return 'text-blue-600 bg-blue-100 border-blue-200'
    default:
      return 'text-slate-600 bg-slate-100 border-slate-200'
  }
}

export const getPlatformColor = (platform: string, index?: number) => {
  switch (platform.toLowerCase()) {
    case 'mobile':
      return '#3b82f6'
    case 'desktop':
      return '#10b981'
    default:
      return '#6b7280'
  }
}

export const getFrequencyColor = (segment: string) => {
  switch (segment) {
    case 'frequent':
      return 'text-green-600 bg-green-100'
    case 'regular':
      return 'text-blue-600 bg-blue-100'
    case 'occasional':
      return 'text-yellow-600 bg-yellow-100'
    case 'one_time':
      return 'text-gray-600 bg-gray-100'
    default:
      return 'text-gray-600 bg-gray-100'
  }
}

export const getConsistencyColor = (segment: string) => {
  switch (segment) {
    case 'highly_consistent':
      return 'text-green-600 bg-green-50 border-green-200'
    case 'moderately_consistent':
      return 'text-blue-600 bg-blue-50 border-blue-200'
    case 'sporadic':
      return 'text-orange-600 bg-orange-50 border-orange-200'
    case 'single_day':
      return 'text-gray-600 bg-slate-50 border-slate-200'
    default:
      return 'text-gray-600 bg-slate-50 border-slate-200'
  }
}

export const getActivityPatternIcon = (pattern: string) => {
  switch (pattern) {
    case 'morning_peak':
      return <Sun className="w-4 h-4" />
    case 'business_hours':
      return <Clock className="w-4 h-4" />
    case 'evening_peak':
      return <Moon className="w-4 h-4" />
    case 'late_night':
      return <Moon className="w-4 h-4" />
    default:
      return <Activity className="w-4 h-4" />
  }
}

export const getActivitySpreadColor = (spread: string) => {
  switch (spread) {
    case 'all_day':
      return 'text-green-600 bg-green-100 border-green-200'
    case 'extended_hours':
      return 'text-blue-600 bg-blue-100 border-blue-200'
    case 'moderate_hours':
      return 'text-yellow-600 bg-yellow-100 border-yellow-200'
    case 'limited_hours':
      return 'text-red-600 bg-red-100 border-red-200'
    default:
      return 'text-gray-600 bg-gray-100 border-gray-200'
  }
}

export const getWeeklyConsistencyColor = (consistency: string) => {
  switch (consistency) {
    case 'all_week':
      return 'text-green-600 bg-green-100 border-green-200'
    case 'most_days':
      return 'text-blue-600 bg-blue-100 border-blue-200'
    case 'some_days':
      return 'text-yellow-600 bg-yellow-100 border-yellow-200'
    case 'few_days':
      return 'text-red-600 bg-red-100 border-red-200'
    default:
      return 'text-gray-600 bg-gray-100 border-gray-200'
  }
}

export const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes.toFixed(1)}m`
  if (minutes < 1440) return `${(minutes / 60).toFixed(1)}h`
  return `${(minutes / 1440).toFixed(1)}d`
}

export const getComplexityColor = (complexity: string) => {
  switch (complexity) {
    case 'single_touchpoint':
      return 'text-blue-600 bg-blue-100'
    case 'two_touchpoint':
      return 'text-green-600 bg-green-100'
    case 'multi_touchpoint':
      return 'text-purple-600 bg-purple-100'
    default:
      return 'text-gray-600 bg-gray-100'
  }
}

export const getFlowStrengthColor = (strength: string) => {
  switch (strength) {
    case 'strong':
      return 'text-green-600 bg-green-100 border-green-200'
    case 'moderate':
      return 'text-yellow-600 bg-yellow-100 border-yellow-200'
    case 'weak':
      return 'text-red-600 bg-red-100 border-red-200'
    default:
      return 'text-gray-600 bg-gray-100 border-gray-200'
  }
}

export const getInteractionTypeIcon = (type: string) => {
  switch (type) {
    case 'LINK':
      return <Activity className="w-4 h-4" />
    case 'QR':
      return <BarChart3 className="w-4 h-4" />
    case 'NFC':
      return <Zap className="w-4 h-4" />
    case 'WIFI':
      return <Navigation className="w-4 h-4" />
    default:
      return <Activity className="w-4 h-4" />
  }
}
