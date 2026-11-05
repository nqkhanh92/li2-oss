'use client'
import { axiosApiInstance } from '@/shared/lib/axios'
import { PaginationResponse, SearchFilterPagination } from '@/shared/types'
import { useQuery } from '@tanstack/react-query'
import { CustomDomain as BaseCustomDomain } from '@/app/api/organizations/[org_id]/custom-domains/route'
import type { Domain } from '@/core/types/domain.type'
import { TouchPoint } from '@/app/api/organizations/[org_id]/touch-points/route'
import { DropdownData } from '@/app/api/organizations/[org_id]/dropdowns/[module]/route'

// Extended CustomDomain type that includes is_default for frontend use
export type CustomDomain = BaseCustomDomain & {
  is_default?: boolean
}

export const useGetCustomDomains = (org_id: string, params?: SearchFilterPagination) => {
  return useQuery<PaginationResponse<CustomDomain>>({
    queryKey: ['organizations', org_id, 'custom-domains', params],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<PaginationResponse<CustomDomain>>(
        `/organizations/${org_id}/custom-domains`,
        { params }
      )
      return data
    },
    refetchInterval: (query) => {
      const domains = query.state.data?.data ?? []
      const hasPending = domains.some((d) => !d.is_verified && (d.is_failed ?? 0) < 8)
      return hasPending ? 30_000 : false
    },
  })
}

export const useShowCustomDomain = (org_id: string, domain_id: string | null) => {
  return useQuery<CustomDomain>({
    queryKey: ['organizations', org_id, 'custom-domains', domain_id],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<CustomDomain>(
        `/organizations/${org_id}/custom-domains/${domain_id}`
      )
      return data
    },
    enabled: !!domain_id,
  })
}
export const useGetCustomDomainDropdown = (org_id: string) => {
  return useQuery({
    queryKey: ['organizations', org_id, 'custom-domains', 'dropdowns'],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<DropdownData<'domains'>>(
        `/organizations/${org_id}/dropdowns/domains`
      )
      return data
    },
    refetchOnWindowFocus: false,
  })
}

export const useGetTouchPointByCustomDomain = (
  org_id: string,
  domain_id: string,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: ['organizations', org_id, 'custom-domains', domain_id, 'touch-points'],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<{
        data: TouchPoint[]
        default_domain: string | null
      }>(`/organizations/${org_id}/custom-domains/${domain_id}/touch-points`)
      return data
    },
    enabled: !!domain_id && (options?.enabled ?? true),
  })
}

/**
 * Hook to get all available domains for an organization
 * Includes both default domains (system-wide from database) and organization's custom domains
 * Default domains are marked with is_default: true and are available to all organizations
 */
export const useGetAvailableDomains = (org_id: string, options?: { enabled?: boolean }) => {
  const { data: allDomains, isLoading } = useGetCustomDomainDropdown(org_id)

  // If disabled, return empty data and not loading
  if (options?.enabled === false) {
    return {
      data: undefined,
      isLoading: false,
    }
  }

  return {
    data: allDomains,
    isLoading,
  }
}

/**
 * Hook to get only default domains (system-wide domains available to all organizations)
 * Fetches from the dropdowns API and filters for domains with is_default: true
 */
export const useGetDefaultDomains = (org_id: string) => {
  const { data: allDomains, isLoading } = useGetCustomDomainDropdown(org_id)

  // Filter only default domains
  const defaultDomains = allDomains?.filter((domain) => domain.is_default === true) || []

  return {
    data: defaultDomains,
    isLoading,
  }
}

/**
 * Returns the effective default domain for the org (org's custom default, or system default).
 * Used to show the correct domain in link previews.
 */
export const useGetOrgDefaultDomain = (org_id: string) => {
  return useQuery<Domain | null>({
    queryKey: ['organizations', org_id, 'custom-domains', 'default'],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<{ data: Domain | null }>(
        `/organizations/${org_id}/custom-domains/default`
      )
      return data.data
    },
    staleTime: 5 * 60 * 1000, // 5 min — domain rarely changes mid-session
  })
}
