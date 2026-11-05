'use client'

import { axiosApiInstance } from '@/shared/lib/axios'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AutoEvent } from '../types/auto-event.types'

export const useAddHostname = (org_id: string, silent = false) => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (hostname: string) => {
      return await axiosApiInstance.post(`/organizations/${org_id}/analytics-settings/hostnames`, {
        hostname,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'analytics-settings'],
      })
    },
    ...(silent ? { onSettled: () => {} } : {}),
  })
}

export const useRemoveHostname = (org_id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (hostname: string) => {
      return await axiosApiInstance.delete(
        `/organizations/${org_id}/analytics-settings/hostnames/${encodeURIComponent(hostname)}`
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'analytics-settings'],
      })
    },
  })
}

export const useRegenerateKey = (org_id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      return await axiosApiInstance.post(
        `/organizations/${org_id}/analytics-settings/regenerate-key`
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'analytics-settings'],
      })
    },
  })
}

export const useUpdateAutoEvents = (org_id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (autoEvents: AutoEvent[]) => {
      return await axiosApiInstance.put(`/organizations/${org_id}/analytics-settings/auto-events`, {
        auto_events: autoEvents,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'analytics-settings'],
      })
    },
  })
}

export const useUpdateDataCollectionRules = (org_id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (rules: { mode: 'exclude' | 'include'; exclude_paths: string[]; include_paths: string[] }) => {
      return await axiosApiInstance.put(
        `/organizations/${org_id}/analytics-settings/data-collection-rules`,
        {
          data_collection_rules: rules,
        }
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'analytics-settings'],
      })
    },
  })
}

export const useToggleDebugMode = (org_id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ enabled, site_url }: { enabled: boolean; site_url?: string }) => {
      return await axiosApiInstance.put(
        `/organizations/${org_id}/analytics-settings/debug-mode`,
        {
          debug_mode_enabled: enabled,
          site_url,
        }
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'analytics-settings'],
      })
    },
    onSettled: () => {}
  })
}

export const useClearDebugLogs = (org_id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      return await axiosApiInstance.delete(
        `/organizations/${org_id}/analytics-settings/debug-logs`
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'debug-logs'],
      })
    },
  })
}

export const useUpdateFeatures = (org_id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (features: Record<string, boolean>) => {
      return await axiosApiInstance.put(
        `/organizations/${org_id}/analytics-settings/features`,
        { features }
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'analytics-settings'],
      })
    },
  })
}

export const useUpdateOutboundDomains = (org_id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (outbound_domains: string[]) => {
      return await axiosApiInstance.put(
        `/organizations/${org_id}/analytics-settings/outbound-domains`,
        { outbound_domains }
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'analytics-settings'],
      })
    },
  })
}

export const useUpdateTracking = (org_id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (tracking: {
      cookie_path: string
      cookie_domain: string | null
      session_timeout: number
      cookie_expires_in_days: number
    }) => {
      return await axiosApiInstance.put(
        `/organizations/${org_id}/analytics-settings/tracking`,
        { tracking }
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'analytics-settings'],
      })
    },
  })
}

export const useUpdateOnboardingSettings = (org_id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      features: Record<string, boolean>
      outbound_domains: string[]
      tracking: {
        cookie_path: string
        cookie_domain: string | null
        session_timeout: number
        cookie_expires_in_days: number
      }
    }) => {
      return await axiosApiInstance.patch(
        `/organizations/${org_id}/analytics-settings`,
        payload
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'analytics-settings'],
      })
    },
  })
}

export const useSaveCustomScripts = (org_id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (custom_scripts: { id: string; name: string; description: string; script: string; site_url: string }[]) => {
      return await axiosApiInstance.put(
        `/organizations/${org_id}/analytics-settings/conversion-scripts`,
        { custom_scripts }
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'analytics-settings'],
      })
    },
  })
}
