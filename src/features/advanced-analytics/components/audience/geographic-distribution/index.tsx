import { HeaderSection } from '@/features/advanced-analytics/components/header-section'
import { Users } from 'lucide-react'
import React from 'react'
import { useTranslation } from 'react-i18next'

const KeyMetricCard = React.lazy(() => import('./key-metric-card'))
const CountriesPerformance = React.lazy(() => import('./countries-performance'))
const GeoInsight = React.lazy(() => import('./insight'))
const GeographicDistribution = () => {
  const { t } = useTranslation('advanced_analytics')
  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header Section */}
      <HeaderSection
        title={t('geographic.index.title')}
        description={t('geographic.index.subtitle_free')}
        premiumDescription={t('geographic.index.subtitle_premium')}
        icon={<Users className="w-7 h-7 text-indigo-600 mr-3" />}
      />
      {/* Key Metrics Cards */}
      <KeyMetricCard />
      {/* Countries Section */}
      <CountriesPerformance />
      {/* Insights Section */}
      <GeoInsight />
    </div>
  )
}

export default GeographicDistribution
