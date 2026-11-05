import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import Header from './components/header'
import WeeklyPattern from './components/weekly-pattern'
import WeeklyTrend from './components/weekly-trend'
import HourlyActivity from '../interaction-frequency-section/components/hourly-activity'
import TouchpointTemporalPattern from './components/touchpoint-temporal-pattern'
import Recommendations from '../interaction-frequency-section/components/recommendation'
import CtaUpgrade from './components/cta-upgrade'

const TemporalBehaviorSection = () => {
  const { allowExtraAdvancedAnalytic } = useAdvancedAnalyticsProvider()

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <Header />
      {/* Hourly Activity Pattern */}
      <HourlyActivity />
      {/* Weekly Patterns */}
      <WeeklyPattern />
      {/* Premium: Weekly Trends */}
      {allowExtraAdvancedAnalytic && <WeeklyTrend />}
      {/* Premium: Touchpoint Temporal Patterns */}
      {allowExtraAdvancedAnalytic && <TouchpointTemporalPattern />}
      {/* Premium: Recommendations */}
      {allowExtraAdvancedAnalytic && <Recommendations />}
      {/* Free Tier Upgrade Prompt */}
      {!allowExtraAdvancedAnalytic && <CtaUpgrade />}
    </div>
  )
}

export default TemporalBehaviorSection
