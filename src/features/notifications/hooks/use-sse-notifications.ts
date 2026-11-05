'use client'

import { useEffect, useRef, useState } from 'react'
import { SSENotificationPayload } from '@/features/notifications/types'
import { useProfileProvider } from '../../../shared/providers/auth-provider'
import { useOrganizationStore } from '../../../shared/stores/organization-store'

export interface UseSSENotificationsOptions {
  enabled?: boolean
  onMessage?: (payload: SSENotificationPayload) => void
}

export interface UseSSENotificationsReturn {
  isConnected: boolean
  lastMessage: SSENotificationPayload | null
}

export function useSSENotifications(
  options: UseSSENotificationsOptions = {}
): UseSSENotificationsReturn {
  const { enabled = true, onMessage } = options
  const { profile } = useProfileProvider()
  const { organization } = useOrganizationStore()

  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<SSENotificationPayload | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Wait for profile and organization
    if (!enabled || !profile?.id || !organization?.id) return

    const connect = () => {
      const endpoint = `${process.env.NEXT_PUBLIC_SSE_ENDPOINT}/user/${profile.id}/org/${organization.id}`
      const eventSource = new EventSource(endpoint)

      eventSource.onopen = () => setIsConnected(true)

      eventSource.onmessage = (event) => {
        try {
          const payload: SSENotificationPayload = JSON.parse(event.data)
          if (payload && payload.type) {
            setLastMessage(payload)
            onMessage?.(payload)
          }
        } catch (err) {
          console.error('Failed to parse SSE message:', err)
        }
      }

      eventSource.onerror = () => {
        setIsConnected(false)
        eventSource.close()
        // Simple 5-second reconnect
        reconnectTimeoutRef.current = setTimeout(connect, 5000)
      }

      eventSourceRef.current = eventSource
    }

    connect()

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
      setIsConnected(false)
    }
  }, [enabled, profile?.id, organization?.id, onMessage])

  return { isConnected, lastMessage }
}
