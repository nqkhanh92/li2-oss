import React from 'react'
import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import Header from './components/header'
import HourlyActivity from './components/hourly-activity'
import DailyPattern from './components/daily-pattern'
import WeeklyActivityPattern from './components/weekly-activity-pattern'
import UserFrequencyDistribution from './components/user-frequency-distribution'
import Recommendations from './components/recommendation'
import CtaUpgrade from './components/cta-upgrade'

const InteractionFrequencySection = () => {
  const { allowExtraAdvancedAnalytic } = useAdvancedAnalyticsProvider()

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <Header />
      {/* Hourly Activity Pattern */}
      <HourlyActivity />
      {/* Daily Patterns Timeline */}
      <DailyPattern />
      {/* Day of Week Patterns */}
      <WeeklyActivityPattern />
      {/* Premium: User Frequency Distribution */}
      {allowExtraAdvancedAnalytic && <UserFrequencyDistribution />}
      {/* Premium: Recommendations */}
      {allowExtraAdvancedAnalytic && <Recommendations />}
      {/* Free Tier Upgrade Prompt */}
      {!allowExtraAdvancedAnalytic && <CtaUpgrade />}
    </div>
  )
}

export default InteractionFrequencySection
