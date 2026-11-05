'use client'

import React from 'react'
import { X, Check } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import { INotification } from '@/core/types/notification.type'
import dayjs from '@/shared/lib/dayjs'
import { useNotification } from '@/shared/hooks/use-notification'
import { useTranslation } from 'react-i18next'

export interface NotificationItemProps {
  notification: INotification
  onMarkAsRead?: (id: string) => void
  onDelete?: (id: string) => void
  compact?: boolean
}

export function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
  compact = false,
}: NotificationItemProps) {
  const { t } = useTranslation('notification')
  const { title, message, timeAgo, action } = useNotification(notification)

  return (
    <div
      className={cn(
        'group relative border-b p-4 transition-colors hover:bg-muted/50 cursor-pointer',
        !notification.read_at && 'bg-muted/30',
        compact && 'p-3'
      )}
      onClick={() => action()}
    >
      <div className="flex items-start gap-3">
        {/* Unread indicator */}
        <div
          className={cn(
            'mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500',
            notification.read_at && 'opacity-0'
          )}
        />

        {/* Content */}
        <div className="flex-1 space-y-1">
          <div className="flex items-starts justify-between gap-2">
            <h4 className={cn('font-medium', compact && 'text-sm')}>{title}</h4>
            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 mt-[-8px]">
              {!notification.read_at && onMarkAsRead && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation()
                    onMarkAsRead(notification.id)
                  }}
                  title={t('mark_as_read')}
                >
                  <Check className="h-4 w-4" />
                </Button>
              )}

              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(notification.id)
                  }}
                  title={t('delete')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <p className={cn('text-muted-foreground', compact ? 'text-xs' : 'text-sm')}>{message}</p>

          {/* Notification type badge */}
          <div className="flex items-center gap-2 justify-between">
            {/* <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
              {notification.type}
            </span> */}
            <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
