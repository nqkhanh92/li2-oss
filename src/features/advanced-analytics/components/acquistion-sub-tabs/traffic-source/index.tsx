import React from 'react'
import KeyMetricsCard from './key-metrics-card'
import TrafficSourceAnalytic from './traffic-source-analyitic'
import QualityDistributionOverview from './quality-distribution-overview'
import AcquisitionInsight from './acquisition-insight'
type TrafficSourcesSubTabProps = {}

const TrafficSourcesSubTab = ({}: TrafficSourcesSubTabProps) => {
  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <KeyMetricsCard />
      {/* Traffic Sources Analysis */}
      <TrafficSourceAnalytic />
      {/* Premium: Quality Distribution Overview */}
      <QualityDistributionOverview />
      {/* Insights Section */}
      <AcquisitionInsight />
    </div>
  )
}

export default TrafficSourcesSubTab
