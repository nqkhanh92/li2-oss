import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import Header from './header'
import OperationSystemAnalysis from './operating-system'
import UsagePattern from './usage-pattern'
import PremiumInsights from './premium-insight'
import CtaUpgrade from './cta-upgrad'
import PlatformDistribution from './platform-distribution'

const DeviceAnalytic = () => {
  const { allowExtraAdvancedAnalytic: isPremium } = useAdvancedAnalyticsProvider()
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <Header />
      {/* Platform Distribution */}
      <PlatformDistribution />
      {/* Operating Systems Analysis */}
      <OperationSystemAnalysis />
      {/* Premium: Usage Patterns */}
      {isPremium && <UsagePattern />}
      {/* Premium Insights */}
      {isPremium && <PremiumInsights />}
      {/* Free Tier Upgrade Prompt */}
      {!isPremium && <CtaUpgrade />}
    </div>
  )
}

export default DeviceAnalytic
