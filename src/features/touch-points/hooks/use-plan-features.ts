import { useCallback, useMemo } from 'react'
import { useOrganizationStoreProvider } from '@/shared/providers/organization-store-provider'
import { ADVANCED_FEATURE_KEYS, OrgAdvancedFeatureKey } from '@/shared/types/plan-permission'
import { AllTouchPointVariants } from '@/features/touch-points/types'
import { disabledFeatures } from '@/shared/constants/disabled-features'

/**
 * Hook to check plan-based feature availability
 */
export const usePlanFeatures = () => {
  const { orgPlan } = useOrganizationStoreProvider()

  const maxTpsPerMonth = useMemo(() => orgPlan?.max_tps_per_month || 0, [orgPlan])

  const enableMetaTags = useMemo(() => {
    return orgPlan?.allow_custom_meta_tags || false
  }, [orgPlan])

  const enableUTM = useMemo(() => {
    return orgPlan?.allow_custom_utm_tags || false
  }, [orgPlan])

  const enableCustomDomain = useMemo(() => {
    return orgPlan && orgPlan.max_domains_per_org > 0
  }, [orgPlan])

  const isTpTypeEnabled = useCallback(
    (tpType: AllTouchPointVariants) => {
      return orgPlan && orgPlan.allowed_tp_types.includes(tpType)
    },
    [orgPlan]
  )

  // const enablePassword = useMemo(() => {
  //   return orgPlan && orgPlan.allow_password || false
  // }, [orgPlan])

  const enableParcelvoy = useMemo(() => {
    return orgPlan && orgPlan.max_integrations_per_org > 0
  }, [orgPlan])

  const maxTagsPerTouchPoint = useMemo(() => {
    return orgPlan?.max_tags_per_tp || 3
  }, [orgPlan])

  const enablePassword = useMemo(() => {
    return (
      orgPlan &&
      orgPlan.advanced_features_allowed &&
      orgPlan.advanced_features_allowed.includes(ADVANCED_FEATURE_KEYS.LINK_PASSWORD)
    )
  }, [orgPlan])

  const enableE2EE = useMemo(() => {
    return (
      orgPlan &&
      orgPlan.advanced_features_allowed &&
      orgPlan.advanced_features_allowed.includes(ADVANCED_FEATURE_KEYS.E2EE_ENCRYPTION)
    )
  }, [orgPlan])

  const enableImport = useMemo(() => {
    return (
      orgPlan &&
      orgPlan.advanced_features_allowed &&
      orgPlan.advanced_features_allowed.includes(ADVANCED_FEATURE_KEYS.IMPORT_TOUCHPOINTS)
    )
  }, [orgPlan])

  const enableExport = useMemo(() => {
    return (
      orgPlan &&
      orgPlan.advanced_features_allowed &&
      orgPlan.advanced_features_allowed.includes(ADVANCED_FEATURE_KEYS.EXPORT_TOUCHPOINTS)
    )
  }, [orgPlan])

  const enableAuditLogs = useMemo(() => {
    return (
      orgPlan &&
      orgPlan.advanced_features_allowed &&
      orgPlan.advanced_features_allowed.includes(ADVANCED_FEATURE_KEYS.AUDIT_LOGS)
    )
  }, [orgPlan])

  const enableConversionTracking = useMemo(() => {
    return (
      orgPlan &&
      orgPlan.advanced_features_allowed &&
      orgPlan.advanced_features_allowed.includes(ADVANCED_FEATURE_KEYS.CONVERSION_TRACKING)
    )
  }, [orgPlan])

  const enableEventRules = useMemo(() => {
    return (
      orgPlan && orgPlan.advanced_features_allowed.includes(ADVANCED_FEATURE_KEYS.EVENT_TAGGING)
    )
  }, [orgPlan])

  const enableSpaces = useMemo(() => {
    return orgPlan && orgPlan.max_collections_per_org > 0
  }, [orgPlan])

  const enableFunnels = useMemo(() => {
    return (
      orgPlan &&
      orgPlan.advanced_features_allowed &&
      orgPlan.advanced_features_allowed.includes(ADVANCED_FEATURE_KEYS.FUNNEL_ANALYTICS)
    )
  }, [orgPlan])

  const enableHeatmaps = useMemo(() => {
    return (
      orgPlan &&
      orgPlan.advanced_features_allowed &&
      orgPlan.advanced_features_allowed.includes(ADVANCED_FEATURE_KEYS.HEATMAP_ANALYTICS)
    )
  }, [orgPlan])

  // Cờ tắt thắng gói. Trước đây mục này chỉ gate theo gói, nên bật
  // NEXT_PUBLIC_DISABLE_DEEP_LINK_ANALYTICS chỉ ẩn được mục sidebar
  // (`menu-list.tsx`), còn menu hành động trong danh sách short link, trang chi
  // tiết và các thẻ custom-domain vẫn hiện với org có gói Pro — bấm vào thì ra
  // đúng cái trang vừa ẩn. Chặn tại đây để mọi nơi đọc cờ cùng một lần.
  const enableDeepLinkAttribution = useMemo(() => {
    if (disabledFeatures.DEEP_LINK_ANALYTICS) return false
    return (
      (orgPlan &&
        orgPlan.advanced_features_allowed &&
        orgPlan.advanced_features_allowed.includes(ADVANCED_FEATURE_KEYS.DEEP_LINK_ATTRIBUTION)) ||
      false
    )
  }, [orgPlan])

  const checkAdvancedFeature = useCallback(
    (featureKey: OrgAdvancedFeatureKey) => {
      return (
        orgPlan &&
        orgPlan.advanced_features_allowed &&
        orgPlan.advanced_features_allowed.includes(featureKey)
      )
    },
    [orgPlan]
  )

  return {
    orgPlan,
    maxTpsPerMonth,
    enableMetaTags,
    enableUTM,
    enableCustomDomain,
    enablePassword,
    enableParcelvoy,
    maxTagsPerTouchPoint,
    enableE2EE,
    enableImport,
    enableExport,
    enableAuditLogs,
    enableConversionTracking,
    enableSpaces,
    enableDeepLinkAttribution,
    checkAdvancedFeature,
    isTpTypeEnabled,
  }
}
