import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { axiosApiInstance } from '@/shared/lib/axios'
import { APIResponse } from '@/shared/types'
import {
  NotificationListResponse,
  UnreadCountResponse,
  NotificationFilters,
} from '@/features/notifications/types'

export const NOTIFICATION_KEYS = {
  all: ['notifications'] as const,
  lists: () => [...NOTIFICATION_KEYS.all, 'list'] as const,
  list: (filters: NotificationFilters) => [...NOTIFICATION_KEYS.lists(), filters] as const,
  unreadCount: () => [...NOTIFICATION_KEYS.all, 'unread-count'] as const,
}

/**
 * Hook to fetch notifications with filters
 */
export function useNotifications(filters: NotificationFilters = {}, enabled = true) {
  return useQuery({
    queryKey: NOTIFICATION_KEYS.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams()

      if (filters.read !== undefined) params.append('read', String(filters.read))
      if (filters.type) params.append('type', filters.type)
      if (filters.limit) params.append('limit', String(filters.limit))
      if (filters.offset) params.append('offset', String(filters.offset))
      // if (filters.organizationId) params.append('organizationId', filters.organizationId)

      const { data } = await axiosApiInstance.get<APIResponse<NotificationListResponse>>(
        `/notifications?${params.toString()}`
      )
      return data.data
    },
    staleTime: 60000, // 60 seconds
    refetchOnWindowFocus: false, // Disable refetch on window focus to reduce unnecessary calls
    enabled,
  })
}

/**
 * Hook to fetch notifications with infinite scroll
 */
export function useInfiniteNotifications(filters: Omit<NotificationFilters, 'offset'> = {}) {
  const limit = filters.limit || 20

  return useInfiniteQuery({
    queryKey: NOTIFICATION_KEYS.list(filters),
    queryFn: async ({ pageParam = 0 }) => {
      const params = new URLSearchParams()

      if (filters.read !== undefined) params.append('read', String(filters.read))
      if (filters.type) params.append('type', filters.type)
      params.append('limit', String(limit))
      params.append('offset', String(pageParam))
      if (filters.organizationId) params.append('organizationId', filters.organizationId)

      const { data } = await axiosApiInstance.get<APIResponse<NotificationListResponse>>(
        `/notifications?${params.toString()}`
      )
      return data.data
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined
      return allPages.length * limit
    },
    initialPageParam: 0,
    staleTime: 30000,
  })
}

/**
 * Hook to fetch unread notification count
 */
export function useUnreadCount(organizationId?: string) {
  return useQuery({
    queryKey: [...NOTIFICATION_KEYS.unreadCount(), organizationId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (organizationId) params.append('organizationId', organizationId)

      const { data } = await axiosApiInstance.get<APIResponse<UnreadCountResponse>>(
        `/notifications/unread-count?${params.toString()}`
      )
      return data.data
    },
    refetchOnWindowFocus: true,
  })
}

export type { NotificationFilters } from '@/features/notifications/types'
