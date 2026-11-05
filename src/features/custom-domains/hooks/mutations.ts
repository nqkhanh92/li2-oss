import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CustomDomain } from '@/app/api/organizations/[org_id]/custom-domains/[domain_id]/route'
import { axiosApiInstance } from '@/shared/lib/axios'
import { claimSubdomainSchema, updateCustomDomainSchema } from '@/shared/schemas/custom-domains'
import { z } from 'zod'
import { createCustomDomainSchema } from '@/shared/schemas/custom-domains'
import { useRouter } from 'next/navigation'
import { APIResponse } from '@/shared/types'

export const useCreateCustomDomain = (org_id: string) => {
  const queryClient = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: async (data: z.infer<typeof createCustomDomainSchema>) => {
      return await axiosApiInstance.post<APIResponse<CustomDomain>>(
        `/organizations/${org_id}/custom-domains`,
        data
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'custom-domains'],
      })
      router.refresh()
    },
  })
}

export const useUpdateCustomDomain = (org_id: string, domain_id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: z.infer<typeof updateCustomDomainSchema>) => {
      return await axiosApiInstance.patch(
        `/organizations/${org_id}/custom-domains/${domain_id}`,
        data
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'custom-domains'],
      })
    },
  })
}
export const useVerifyCustomDomain = (org_id: string, domain_id: string | null) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      return await axiosApiInstance.post(
        `/organizations/${org_id}/custom-domains/${domain_id}/verify`
      )
    },
    // Silence global toast interceptors — verify-domain-step handles all messages manually
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'custom-domains'],
      })
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'custom-domains', domain_id],
      })
    },
    onError: () => {},
  })
}
export const useDeleteCustomDomain = (org_id: string) => {
  const queryClient = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: async (domain_id: string) => {
      return await axiosApiInstance.delete(`/organizations/${org_id}/custom-domains/${domain_id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'custom-domains'],
      })
      // Touch points using the deleted domain are reassigned to the default domain
      // by li2-backend on delete. Invalidate so the short link list reflects the
      // updated domain and forms don't try to resolve the now-deleted domain ID.
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'touch-points'],
      })
      router.refresh()
    },
  })
}

export const useSetDefaultDomain = (org_id: string) => {
  const queryClient = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: async (domain_id: string) => {
      return await axiosApiInstance.patch(`/organizations/${org_id}`, {
        default_domain_id: domain_id,
      })
    },
    onSuccess: () => {
      router.refresh()
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'custom-domains'],
      })
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'custom-domains', 'dropdowns'],
      })
    },
  })
}

export interface DeepLinkVerifyPlatformResult {
  ok: boolean
  error?: string
  url: string
}

export interface DeepLinkVerifyResult {
  ios: DeepLinkVerifyPlatformResult | null
  android: DeepLinkVerifyPlatformResult | null
}

/**
 * Verify that the AASA (`apple-app-site-association`) and `assetlinks.json` files
 * are being served correctly for a domain's deep link configuration. The check runs
 * server-side (in the li2-app API route) to avoid cross-origin CORS issues that
 * would break a client-side `fetch`.
 */
export const useVerifyDeepLink = (org_id: string, domain_id: string) => {
  return useMutation<DeepLinkVerifyResult>({
    mutationFn: async () => {
      const res = await axiosApiInstance.get<APIResponse<DeepLinkVerifyResult>>(
        `/organizations/${org_id}/custom-domains/${domain_id}/verify-deep-link`
      )
      return res.data.data as DeepLinkVerifyResult
    },
  })
}

export const useClaimSubdomain = (org_id: string) => {
  const queryClient = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: async (data: z.infer<typeof claimSubdomainSchema>) => {
      return await axiosApiInstance.post<APIResponse<CustomDomain>>(
        `/organizations/${org_id}/subdomains/claim`,
        data
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'custom-domains'],
      })
      router.refresh()
    },
  })
}
