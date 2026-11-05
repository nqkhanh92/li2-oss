/**
 * Client-side notification types
 */

import { NotificationPayload } from '@/core/services/notification.service'
import { INotification } from '@/core/types/notification.type'

export interface NotificationListResponse {
  data: INotification[]
  count: number
  hasMore: boolean
}

export interface UnreadCountResponse {
  count: number
}

export type SSENotificationPayload = NotificationPayload['payload'] & {
  // Add additional SSE-specific properties here if needed
}

export interface NotificationFilters {
  read?: boolean
  type?: string
  limit?: number
  offset?: number
  organizationId?: string
}

export interface NotificationContextValue {
  unreadCount: number
  isConnected: boolean
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (id: string) => Promise<void>
  setIsNotificationsOpen: (open: boolean) => void
}
