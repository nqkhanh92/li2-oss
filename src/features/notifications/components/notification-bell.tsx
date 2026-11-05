'use client'

import React, { useEffect } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { Badge } from '@/shared/components/ui/badge'
import { useNotificationContext } from '@/shared/providers/notification-provider'
import { NotificationList } from './notification-list'
import { cn } from '@/shared/lib/utils'
import { useTranslation } from 'react-i18next'

export interface NotificationBellProps {
  className?: string
  showBadge?: boolean
  maxNotifications?: number
}

export function NotificationBell({
  className,
  showBadge = true,
  maxNotifications = 10,
}: NotificationBellProps) {
  const { t } = useTranslation('notification')
  const { unreadCount, isConnected, setIsNotificationsOpen, isNotificationsOpen, markAllAsRead } =
    useNotificationContext()

  useEffect(() => {
    if (isNotificationsOpen && unreadCount > 0) {
      markAllAsRead()
    }
  }, [isNotificationsOpen])

  return (
    <Popover open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('relative', className)}
          aria-label={`${t('title')}${unreadCount > 0 ? ` (${unreadCount} ${t('unread')})` : ''}`}
        >
          <Bell className="h-5 w-5" />
          {showBadge && unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-5 min-w-5 rounded-full px-1 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
          {isConnected && (
            <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-500" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <NotificationList maxItems={maxNotifications} compact />
      </PopoverContent>
    </Popover>
  )
}
