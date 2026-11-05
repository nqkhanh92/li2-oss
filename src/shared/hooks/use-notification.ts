'use client'

import {
  INotification,
  NotificationDataForType,
  NotificationType,
} from '@/core/types/notification.type'
import { useTranslation } from 'react-i18next'
import dayjs from '@/shared/lib/dayjs'
import { useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { TFunction } from 'i18next'
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'

export function parseNotification(
  notification: INotification,
  t: TFunction,
  router: AppRouterInstance
) {
  // Pre-process notification data for i18n interpolation
  const interpolationData = { ...notification.data }

  // Translate threat types array into a localized string
  if (Array.isArray(interpolationData?.threatTypes)) {
    interpolationData.threats = interpolationData.threatTypes
      .map((tt: string) => t(`common:safety.threat_types.${tt}`, { defaultValue: tt }))
      .join(', ')
  }

  const title = t(`notification:types.${notification.type}.title`, {
    ...interpolationData,
    defaultValue: notification.title,
  })

  const message = t(`notification:types.${notification.type}.message`, {
    ...interpolationData,
    defaultValue: notification.message,
  })

  const timeAgo = dayjs(notification.created_at).fromNow()

  const action = () => {
    if (!notification.action) {
      return
    }

    switch (notification.action.type) {
      case 'redirect':
        const url = notification.action.url
        // Check if it's a full URL or just a path
        if (url.startsWith('http://') || url.startsWith('https://')) {
          // Full URL - could open in new tab or use window.location
          window.location.href = url
        } else {
          // Path only - use Next.js router
          router.push(url)
        }
        break
    }
  }
  return { title, message, action, timeAgo }
}

export function useNotification(notification: INotification) {
  const router = useRouter()

  const { t } = useTranslation(['common', 'notification'])

  const { action, title, message, timeAgo } = useMemo(() => {
    const parsed = parseNotification(notification, t, router)
    return parsed
  }, [notification, t, router])

  return {
    title,
    message,
    timeAgo,
    action,
  }
}
