'use client'

import React from 'react'
import { ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { ScrollArea } from '@/shared/components/ui/scroll-area'
import { useNotificationContext } from '@/shared/providers/notification-provider'
import { useNotifications } from '@/features/notifications/hooks'
import { NotificationItem } from './notification-item'
import { cn } from '@/shared/lib/utils'
import { useParams, useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'

export interface NotificationListProps {
  maxItems: number
  compact?: boolean
  className?: string
  organizationId?: string
}

export function NotificationList({
  maxItems,
  compact = false,
  className,
  organizationId,
}: NotificationListProps) {
  const { t } = useTranslation('notification')
  const { markAsRead, deleteNotification } = useNotificationContext()
  const { org_id }: { org_id: string } = useParams()
  const router = useRouter()

  // Fetch notifications when component mounts
  const { data: notificationsData, isLoading } = useNotifications(
    {
      limit: maxItems,
      organizationId,
    },
    true // Always enabled when this component is rendered
  )

  const notifications = notificationsData?.data || []

  const displayedNotifications = notifications.slice(0, maxItems)

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="font-semibold">{t('title')}</h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs"
          onClick={() => router.push(`/org/${org_id}/notifications`)}
        >
          {t('view_all_link')}
          <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Notification list */}
          {displayedNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <p className="text-sm text-muted-foreground">{t('no_notifications')}</p>
            </div>
          ) : (
            <ScrollArea className={cn(compact ? 'h-96' : 'h-[500px]')}>
              <div className="divide-y">
                {displayedNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={markAsRead}
                    onDelete={deleteNotification}
                    compact={compact}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </>
      )}

    </div>
  )
}
