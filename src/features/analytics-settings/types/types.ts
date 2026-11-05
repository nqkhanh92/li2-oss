export type ProductType = 'link_attribution' | 'behavior_activity'
export type DomainSetupMethod = 'default_domain' | 'claim_subdomain' | 'custom_domain'

export interface LinkAttributionOnboardingState {
  domain_setup_completed: boolean
  domain_setup_method: DomainSetupMethod | null
  domain_id: string | null
  first_touch_point_completed: boolean
  touch_point_id: string | null
  conversion_setup_completed: boolean
}

export interface OnboardingState {
  product_type: ProductType | null
  link_attribution: LinkAttributionOnboardingState | null
}

export const DEFAULT_LINK_ATTRIBUTION_STATE: LinkAttributionOnboardingState = {
  domain_setup_completed: false,
  domain_setup_method: null,
  domain_id: null,
  first_touch_point_completed: false,
  touch_point_id: null,
  conversion_setup_completed: false,
}

export function parseOnboardingState(raw: unknown): OnboardingState {
  if (!raw || typeof raw !== 'object') {
    return { product_type: null, link_attribution: null }
  }
  const obj = raw as Record<string, unknown>
  return {
    product_type: (obj.product_type as ProductType) ?? null,
    link_attribution: obj.link_attribution
      ? (obj.link_attribution as LinkAttributionOnboardingState)
      : null,
  }
}
