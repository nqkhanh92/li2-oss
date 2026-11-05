import { useMemo } from 'react'
import { useGetOverviewData } from '@/features/overview/hooks/queries'
import { usePlanFeatures } from '@/features/touch-points/hooks/use-plan-features'
import { ADVANCED_FEATURE_KEYS } from '@/shared/types/plan-permission'

export function useSmartDefaultTemplate(orgId: string | undefined): string {
  const { checkAdvancedFeature } = usePlanFeatures()
  const { data: overview } = useGetOverviewData(orgId)

  return useMemo(() => {
    if (overview?.conversions && checkAdvancedFeature(ADVANCED_FEATURE_KEYS.CONVERSION_TRACKING)) {
      return 'conversion-tracking'
    }

    // HEATMAP_ANALYTICS is the plan gate for all pageview-based features
    // (no separate WEBSITE_ANALYTICS key exists in the plan structure)
    if (overview?.website && checkAdvancedFeature(ADVANCED_FEATURE_KEYS.HEATMAP_ANALYTICS)) {
      return 'website-analytics'
    }

    return 'link-performance'
  }, [checkAdvancedFeature, overview])
}
