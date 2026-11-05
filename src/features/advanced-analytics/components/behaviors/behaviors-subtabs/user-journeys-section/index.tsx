import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import Header from './header'
import JourneyComplexityDistribution from './journey-complexity-distribution'
import EntryExitPoint from './entry-exit-point'
import TouchpointTransitions from './touchpoint-transitions'
import Recommendations from './recommendations'
import CtaUpgrade from './cta-upgrade'

const UserJourneysSection = () => {
  const { allowExtraAdvancedAnalytic: isPremium } = useAdvancedAnalyticsProvider()

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <Header />
      {/* Journey Complexity Distribution */}
      <JourneyComplexityDistribution />
      {/* Entry & Exit Point Analysis */}
      <EntryExitPoint />
      {/* Premium: Touchpoint Transitions */}
      {isPremium && <TouchpointTransitions />}
      {/* Premium: Recommendations */}
      {isPremium && <Recommendations />}
      {/* Free Tier Upgrade Prompt */}
      {!isPremium && <CtaUpgrade />}
    </div>
  )
}

export default UserJourneysSection
