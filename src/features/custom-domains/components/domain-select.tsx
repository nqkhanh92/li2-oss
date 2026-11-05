import { useParams } from 'next/navigation'
import { useGetAvailableDomains } from '../hooks/queries'
import { SingleCommandSelect } from '@/shared/components/customize/single-command-select'
import { useMemo, useEffect, useCallback } from 'react'
import { Crown } from 'lucide-react'
import { useOrganizationStore } from '@/shared/stores/organization-store'

interface DomainSelectProps {
  /** Optional value for controlled component */
  value?: string
  /** Optional onChange handler for controlled component */
  onChange?: (value: string) => void
  /** Whether the select is disabled */
  disabled?: boolean
  /** Custom className for styling */
  className?: string
  /** Custom className for the label */
  classNameLabel?: string
  /** Placeholder text */
  placeholder?: string
  /** Command search placeholder text */
  commandPlaceholder?: string
  /** Optional external domains data (if not provided, will fetch from org_id) */

  // domains?: Array<{ id: string; name: string | null }>
  /** Optional external loading state */
  // isLoading?: boolean
  /** Optional org_id (if not provided, will use from useParams) */
  orgId?: string
  enableCustomDomain?: boolean
}

export const DomainSelect = ({
  value: externalValue,
  onChange,
  disabled = false,
  className,
  classNameLabel,
  placeholder,
  commandPlaceholder,
  // domains: externalDomains,
  // isLoading: externalIsLoading,
  orgId: externalOrgId,
  enableCustomDomain,
}: DomainSelectProps) => {
  const params = useParams<{ org_id: string }>()
  const organization = useOrganizationStore().organization
  const org_id = externalOrgId || params?.org_id

  const needToFallbackForLegacyDomain = disabled && !externalValue
  const legacyShortLinkDomain =
    process.env.NEXT_PUBLIC_SHORT_LINK_URL?.replace('https://', '') || ''

  // Only fetch if external domains are not provided
  const { data: availableDomainsData, isLoading: fetchIsLoading } = useGetAvailableDomains(org_id, {
    enabled: !needToFallbackForLegacyDomain,
  })

  // Use external domains if provided, otherwise use fetched data
  const domainsData = availableDomainsData
  const isLoading = fetchIsLoading

  // Get default domains once and memoize to avoid calling getDefaultDomains() multiple times
  // const defaultDomainsFromEnv = useMemo(() => getDefaultDomains(), [])

  const availableDomains = useMemo(() => {
    if (!domainsData || domainsData.length === 0)
      return [
        {
          value: legacyShortLinkDomain,
          label: legacyShortLinkDomain,
          group: 'Default domains',
        },
      ]

    // Use memoized default domains
    // const defaultDomainIds = new Set(defaultDomainsFromEnv.map(d => d.id))

    // Separate based on whether ID is in default domains
    const defaultDomains = domainsData.filter((domain) => domain.is_default)
    const customDomains = domainsData.filter((domain) => !domain.is_default)

    const defaultDomainOptions = defaultDomains.map((domain) => ({
      value: domain.id,
      label: domain.name || '',
      group: 'Default domains',
    }))

    // If custom domain is disabled, don't include custom domains
    // Instead, show a premium feature badge option
    if (!enableCustomDomain) {
      const premiumBadgeOption = [
        {
          value: 'premium-feature',
          label: (
            <div className="flex items-center gap-2 text-purple-600">
              <Crown className="w-4 h-4" />
              <span>Custom domains (Premium)</span>
            </div>
          ),
          group: 'Your domains',
          disabled: true,
        },
      ]

      return [...defaultDomainOptions, ...premiumBadgeOption]
    }

    const customDomainOptions = customDomains.map((domain) => ({
      value: domain.id,
      label: domain.name || '',
      group: 'Your domains',
    }))

    return [...defaultDomainOptions, ...customDomainOptions]
  }, [domainsData, enableCustomDomain, legacyShortLinkDomain])

  /**
   * Determines the default domain ID to use based on organization settings and feature flags.
   * Priority order:
   * 1. If no org default is set: use the default_selected domain or first default domain
   * 2. If custom domains disabled: ensure we only use default domains (fallback if org default is custom)
   * 3. If custom domains enabled: use org's default_domain_id (custom or default)
   *
   * @returns {string | null} The domain ID to use, or null if no data available
   */
  const getDefaultDomainId = useCallback(() => {
    if (!availableDomainsData || !organization) return null
    const defaultDomains = availableDomainsData.filter((domain) => domain.is_default)

    // Case 1: Organization has no default domain set
    // Use the system's default_selected domain, or fallback to first default domain
    if (!organization.default_domain_id) {
      return defaultDomains?.find((domain) => domain.default_selected)?.id || defaultDomains[0]?.id
    }

    // Case 2: Custom domains are disabled (e.g., free plan)
    // Only allow default domains - if org's default is custom, fallback to a default domain
    if (!enableCustomDomain) {
      const orgDefaultInDefaults = defaultDomains?.find(
        (domain) => domain.id === organization.default_domain_id
      )
      // If org's default is a default domain, use it; otherwise fallback to first default
      return orgDefaultInDefaults?.id || defaultDomains[0]?.id
    }

    // Case 3: Custom domains enabled
    // Use the organization's default domain (could be custom or default)
    // Fallback to first default domain if the org's default doesn't exist in available domains
    const orgDefault = availableDomainsData?.find(
      (domain) => domain.id === organization.default_domain_id
    )
    return orgDefault?.id || defaultDomains[0]?.id
  }, [availableDomainsData, organization, enableCustomDomain])

  // Use the first default domain as the default value (only if no external value provided)
  const defaultValue = useMemo(() => {
    if (needToFallbackForLegacyDomain) return legacyShortLinkDomain
    if (!domainsData || domainsData.length === 0) return undefined

    // If custom domain is disabled and the external value is a custom domain,
    // reset to the organization's default domain
    if (!enableCustomDomain && externalValue !== undefined) {
      const selectedDomain = domainsData.find((d) => d.id === externalValue)
      if (selectedDomain && !selectedDomain.is_default) {
        return getDefaultDomainId() || legacyShortLinkDomain
      }
    }

    if (externalValue !== undefined) return externalValue

    // Use organization's default domain based on settings
    const orgDefaultId = getDefaultDomainId()
    if (orgDefaultId) return orgDefaultId

    // Final fallback
    return availableDomains[0]?.value
  }, [
    domainsData,
    availableDomains,
    externalValue,
    enableCustomDomain,
    needToFallbackForLegacyDomain,
    legacyShortLinkDomain,
    getDefaultDomainId,
  ])

  // Sync default value with form when it's first computed
  // This ensures the form has the default domain_id even if the user doesn't interact with the field
  useEffect(() => {
    // Only set if there's no external value (meaning form hasn't set it yet)
    // and we have a computed default value
    if (defaultValue !== undefined && onChange) {
      onChange(defaultValue)
    }
  }, [defaultValue, onChange])

  return (
    <SingleCommandSelect
      className={
        className ||
        'outline-none border-none disabled:bg-neutral-500 disabled:text-foreground disabled:opacity-50'
      }
      classNameLabel={classNameLabel}
      value={defaultValue}
      onChange={onChange || (() => {})}
      disabled={disabled || isLoading}
      options={availableDomains}
      groups={['Default domains', 'Your domains']}
      placeholder={placeholder || ''}
      commandPlaceholder={commandPlaceholder}
      disableSelectedItem
    />
  )
}
