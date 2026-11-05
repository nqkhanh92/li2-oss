'use client'

import React from 'react'
import { X, Check, AlertCircle, Info, AlertTriangle, Bell } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { cn } from '@/shared/lib/utils'
import { INotification } from '@/core/types/notification.type'
import { useNotification } from '@/shared/hooks/use-notification'
import dayjs from '@/shared/lib/dayjs'
import { useTranslation } from 'react-i18next'

export interface NotificationItemPageProps {
  notification: INotification
  onMarkAsRead?: (id: string) => void
  onDelete?: (id: string) => void
}

const priorityConfig = {
  low: { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: Info },
  medium: { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Bell },
  high: { color: 'bg-orange-100 text-orange-700 border-orange-200', icon: AlertTriangle },
  urgent: { color: 'bg-red-100 text-red-700 border-red-200', icon: AlertCircle },
}

const categoryConfig: Record<string, { color: string; labelKey: string }> = {
  touchpoint: { color: 'bg-purple-50 text-purple-700 ring-purple-600/20', labelKey: 'categories.touchpoint' },
  billing: { color: 'bg-green-50 text-green-700 ring-green-600/20', labelKey: 'categories.billing' },
  system: { color: 'bg-blue-50 text-blue-700 ring-blue-600/20', labelKey: 'categories.system' },
  security: { color: 'bg-red-50 text-red-700 ring-red-600/20', labelKey: 'categories.security' },
}

export function NotificationItemPage({
  notification,
  onMarkAsRead,
  onDelete,
}: NotificationItemPageProps) {
  const { t } = useTranslation('notification')
  const { title, message, timeAgo, action } = useNotification(notification)
  const priorityInfo = priorityConfig[notification.priority] ?? priorityConfig.low
  const categoryInfo = categoryConfig[notification.category] ?? { color: 'bg-gray-50 text-gray-700 ring-gray-600/20', labelKey: `categories.${notification.category}` }
  const PriorityIcon = priorityInfo.icon

  return (
    <div
      className={cn(
        'group relative p-5 transition-colors hover:bg-muted/50 cursor-pointer',
        !notification.read_at && 'bg-muted/30'
      )}
      onClick={() => action()}
    >
      <div className="flex items-start gap-4">
        {/* Priority Icon */}
        <div
          className={cn(
            'mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border',
            priorityInfo.color
          )}
        >
          <PriorityIcon className="h-5 w-5" />
        </div>

        {/* Content */}
        <div className="flex-1 space-y-2 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-semibold text-base">{title}</h4>
                {!notification.read_at && (
                  <Badge variant="secondary" className="text-xs">
                    {t('new')}
                  </Badge>
                )}
              </div>
            </div>
            {/* Actions - Always visible */}
            <div className="flex items-center gap-1 flex-shrink-0">
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

          <p className="text-muted-foreground text-sm leading-relaxed">{message}</p>

          {/* Metadata row */}
          <div className="flex items-center gap-3 flex-wrap text-xs">
            {/* Category badge */}
            <span
              className={cn(
                'inline-flex items-center rounded-md px-2 py-1 font-medium ring-1 ring-inset',
                categoryInfo.color
              )}
            >
              {t(categoryInfo.labelKey)}
            </span>

            {/* Priority badge */}
            <span className="text-muted-foreground capitalize">{t('priority_label', { priority: t(`priorities.${notification.priority}`) })}</span>

            {/* Scope */}
            <span className="text-muted-foreground capitalize">• {notification.scope}</span>

            {/* Time */}
            <span className="text-muted-foreground">• {timeAgo}</span>

            {/* Full date on hover */}
            <span className="text-muted-foreground hidden sm:inline">
              • {dayjs(notification.created_at).format('MMM D, YYYY h:mm A')}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
