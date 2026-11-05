import { useMutation, useQueryClient } from '@tanstack/react-query'
import { axiosApiInstance } from '@/shared/lib/axios'
import { APIResponse } from '@/shared/types'
import { NOTIFICATION_KEYS } from './queries'
import { INotification } from '@/core/types/notification.type'

/**
 * Hook to mark a notification as read
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axiosApiInstance.patch<APIResponse<INotification>>(
        `/notifications/${id}/read`
      )
      return data.data
    },
    onMutate: async (id: string) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: NOTIFICATION_KEYS.lists() })

      // Snapshot previous value
      const previousData = queryClient.getQueriesData({ queryKey: NOTIFICATION_KEYS.lists() })

      // Optimistically update
      queryClient.setQueriesData({ queryKey: NOTIFICATION_KEYS.lists() }, (old: any) => {
        if (!old?.data) return old

        return {
          ...old,
          data: old.data.map((notification: INotification) =>
            notification.id === id
              ? { ...notification, read_at: new Date().toISOString() }
              : notification
          ),
        }
      })

      // Update unread count
      queryClient.setQueriesData({ queryKey: NOTIFICATION_KEYS.unreadCount() }, (old: any) => {
        if (!old?.count) return old
        return {
          ...old,
          count: Math.max(0, old.count - 1),
        }
      })

      return { previousData }
    },
    onError: (err, id, context) => {
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.lists() })
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.unreadCount() })
    },
  })
}

/**
 * Hook to mark all notifications as read
 */
export function useMarkAllAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (organizationId?: string) => {
      const params = new URLSearchParams()
      if (organizationId) params.append('organizationId', organizationId)

      const { data } = await axiosApiInstance.patch<APIResponse<Notification[]>>(
        `/notifications/read-all?${params.toString()}`
      )
      return data.data
    },
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: NOTIFICATION_KEYS.lists() })

      // Snapshot previous value
      const previousData = queryClient.getQueriesData({ queryKey: NOTIFICATION_KEYS.lists() })

      // Optimistically update all notifications to read
      queryClient.setQueriesData({ queryKey: NOTIFICATION_KEYS.lists() }, (old: any) => {
        if (!old?.data) return old

        return {
          ...old,
          data: old.data.map((notification: Notification) => ({
            ...notification,
            read_at: new Date().toISOString(),
          })),
        }
      })

      // Optimistically set unread count to 0
      queryClient.setQueriesData({ queryKey: NOTIFICATION_KEYS.unreadCount() }, (old: any) => ({
        ...old,
        count: 0,
      }))

      return { previousData }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.lists() })
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.unreadCount() })
    },
  })
}

/**
 * Hook to delete a notification
 */
export function useDeleteNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axiosApiInstance.delete<APIResponse<void>>(`/notifications/${id}`)
      return data.data
    },
    onMutate: async (id: string) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: NOTIFICATION_KEYS.lists() })

      // Snapshot previous value
      const previousData = queryClient.getQueriesData({ queryKey: NOTIFICATION_KEYS.lists() })

      // Optimistically remove from list
      queryClient.setQueriesData({ queryKey: NOTIFICATION_KEYS.lists() }, (old: any) => {
        if (!old?.data) return old

        const wasUnread = old.data.find((n: INotification) => n.id === id && !n.read_at)

        // Update unread count if the deleted notification was unread
        if (wasUnread) {
          queryClient.setQueriesData({ queryKey: NOTIFICATION_KEYS.unreadCount() }, (old: any) => {
            if (!old?.count) return old
            return {
              ...old,
              count: Math.max(0, old.count - 1),
            }
          })
        }

        return {
          ...old,
          data: old.data.filter((notification: INotification) => notification.id !== id),
          count: Math.max(0, (old.count || 0) - 1),
        }
      })

      return { previousData }
    },
    onError: (err, id, context) => {
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.lists() })
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.unreadCount() })
    },
  })
}
