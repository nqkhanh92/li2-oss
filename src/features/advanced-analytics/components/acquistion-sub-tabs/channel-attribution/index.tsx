import { useAdvancedAnalyticsProvider } from '@/shared/providers/advanced-analytics-provider'
import CustomerJourney from '@/features/advanced-analytics/components/acquistion-sub-tabs/channel-attribution/customer-journey'
import AttributionComparison from '@/features/advanced-analytics/components/acquistion-sub-tabs/channel-attribution/attribution-comparison'
import ChannelDiversity from '@/features/advanced-analytics/components/acquistion-sub-tabs/channel-attribution/channel-diversity'
import ReliabilityDataQuality from '@/features/advanced-analytics/components/acquistion-sub-tabs/channel-attribution/reliability-data-quality'
import CustomerJourneyPath from '@/features/advanced-analytics/components/acquistion-sub-tabs/channel-attribution/customer-jouney-path'
import TouchpointPerformingCombination from '@/features/advanced-analytics/components/acquistion-sub-tabs/channel-attribution/touchpoint-performing-combination'
import AIPoweredOptimizationInsights from '@/features/advanced-analytics/components/acquistion-sub-tabs/channel-attribution/aI-powered-optimization-insights'
import CTAUpgrade from '@/features/advanced-analytics/components/acquistion-sub-tabs/channel-attribution/cta-upgrade'

export const ChannelAttributionSubTab = ({}) => {
  const { allowExtraAdvancedAnalytic } = useAdvancedAnalyticsProvider()

  return (
    <div className="space-y-6">
      {/* Customer Journey Analysis */}
      <CustomerJourney />
      {/* Attribution Comparison -- First Touch vs Last Touch Performance*/}
      <AttributionComparison />
      {/* Channel Diversity Analysis */}
      <ChannelDiversity />
      {/* Reliability & Data Quality */}
      <ReliabilityDataQuality />
      {/* Customer Journey Paths */}
      <CustomerJourneyPath />
      {/* Touchpoint + Channel Combinations -- Best Performing Combinations*/}
      <TouchpointPerformingCombination />
      {/* AI-Powered Optimization Insights */}
      {allowExtraAdvancedAnalytic && <AIPoweredOptimizationInsights />}
      {/* Premium Upgrade */}
      {!allowExtraAdvancedAnalytic && <CTAUpgrade />}
    </div>
  )
}
