'use client'

import React, { createContext, useContext, useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useSSENotifications } from '@/features/notifications/hooks/use-sse-notifications'
import {
  useNotifications,
  useUnreadCount,
  NOTIFICATION_KEYS,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
} from '@/features/notifications/hooks'
import { SSENotificationPayload } from '@/features/notifications/types'
import { parseNotification, useNotification } from '../hooks/use-notification'
import { INotification } from '@/core/types/notification.type'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { BellDotIcon, ViewIcon } from 'lucide-react'
export interface NotificationContextValue {
  isNotificationsOpen: boolean
  unreadCount: number
  isConnected: boolean
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (id: string) => Promise<void>
  setIsNotificationsOpen: (open: boolean) => void
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined)

export interface NotificationProviderProps {
  children: React.ReactNode
  organizationId?: string
  enabled?: boolean
  showToasts?: boolean
}

export function NotificationProvider({
  children,
  organizationId,
  enabled = true,
  showToasts = true,
}: NotificationProviderProps) {
  const queryClient = useQueryClient()
  const { t } = useTranslation(['common', 'notification'])
  const router = useRouter()

  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false)

  // Fetch unread count
  const { data: unreadData } = useUnreadCount(organizationId)

  // Mutations
  const markAsReadMutation = useMarkAsRead()
  const markAllAsReadMutation = useMarkAllAsRead()
  const deleteNotificationMutation = useDeleteNotification()

  // Handle incoming SSE messages
  const handleSSEMessage = useCallback(
    (payload: SSENotificationPayload) => {
      // Show toast notification if enabled
      if (showToasts) {
        const { title, action, message } = parseNotification(payload as INotification, t, router)
        toast(title || 'New Notification', {
          description: message,
          action: {
            label: <BellDotIcon />,
            onClick: () => {
              if (payload.organization_id) {
                router.push(`/org/${payload.organization_id}/notifications`)
              }
            },
          },
        })
      }

      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.lists() })
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.unreadCount() })
    },
    [queryClient, showToasts, t, router]
  )

  // Connect to SSE
  const { isConnected } = useSSENotifications({
    enabled,
    onMessage: handleSSEMessage,
    // onError: (error) => {
    //   console.error('SSE connection error:', error)
    // },
    // onConnect: () => {
    //   console.log('SSE connected')
    // },
    // onDisconnect: () => {
    //   console.log('SSE disconnected')
    // },
  })

  // Wrapper functions for mutations
  const markAsRead = useCallback(
    async (id: string) => {
      await markAsReadMutation.mutateAsync(id)
    },
    [markAsReadMutation]
  )

  const markAllAsRead = useCallback(async () => {
    await markAllAsReadMutation.mutateAsync(organizationId)
  }, [markAllAsReadMutation, organizationId])

  const deleteNotification = useCallback(
    async (id: string) => {
      await deleteNotificationMutation.mutateAsync(id)
    },
    [deleteNotificationMutation]
  )

  const value: NotificationContextValue = {
    unreadCount: unreadData?.count || 0,
    isConnected,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    setIsNotificationsOpen,
    isNotificationsOpen,
  }

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

/**
 * Hook to access notification context
 */
export function useNotificationContext() {
  const context = useContext(NotificationContext)

  if (context === undefined) {
    throw new Error('useNotificationContext must be used within a NotificationProvider')
  }

  return context
}
