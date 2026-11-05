import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import { LazyRender } from '@/shared/components/customize/lazy-render'
import { CTAUpgrade } from './cta-upgrade'
import Header from '@/features/advanced-analytics/components/acquistion-sub-tabs/growth-trends/header'
import SmartInsights from '@/features/advanced-analytics/components/acquistion-sub-tabs/growth-trends/smart-insights'
import KeyMetrics from '@/features/advanced-analytics/components/acquistion-sub-tabs/growth-trends/key-metrics'
import DailyGrowthTrend from '@/features/advanced-analytics/components/acquistion-sub-tabs/growth-trends/daily-growth-trend'
import ChannelGrowthAnalytic from '@/features/advanced-analytics/components/acquistion-sub-tabs/growth-trends/channel-growth-analytic'
import GrowthInsight from '@/features/advanced-analytics/components/acquistion-sub-tabs/growth-trends/growth-insight'
import QualityEvolution from '@/features/advanced-analytics/components/acquistion-sub-tabs/growth-trends/quality-evolution'
import GrowthOpportunities from '@/features/advanced-analytics/components/acquistion-sub-tabs/growth-trends/growth-opportunities'

const GrowthTrendsSubTab = ({}) => {
  const { allowExtraAdvancedAnalytic } = useAdvancedAnalyticsProvider()
  // NOTE: need further investigation on this.
  // const [showForecastDetails, setShowForecastDetails] = useState(false);

  return (
    <div className="space-y-6">
      {/* Overview Header */}
      <Header />
      {/* Smart Insights - Lead with Key Findings */}
      <SmartInsights />
      {/* Key Metrics */}
      <KeyMetrics />
      {/* Daily Growth Trend - Chart Visualization */}
      <DailyGrowthTrend />
      {/* Channel Growth Analysis - Bar Chart Visualization */}
      <ChannelGrowthAnalytic />
      {/* Growth Insights */}
      <GrowthInsight />
      {/* Premium: Quality Evolution Analysis */}
      <QualityEvolution />
      {/* Premium: Growth Opportunities & Portfolio Health */}
      <GrowthOpportunities />
      {/* Premium Upgrade */}
      {!allowExtraAdvancedAnalytic && <CTAUpgrade />}
    </div>
  )
}

export default GrowthTrendsSubTab
