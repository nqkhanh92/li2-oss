'use client'

import { useMemo } from 'react'
import { Filter, CheckCheck, BellOff, SearchX } from 'lucide-react'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { useFilters } from '@/shared/hooks/use-filters'
import { Button } from '@/shared/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { useNotifications } from '@/features/notifications/hooks'
import { useNotificationContext } from '@/shared/providers/notification-provider'
import { NotificationItemPage } from '@/features/notifications/components/notification-item-page'
import { useTranslation } from 'react-i18next'

interface NotificationsPageProps {
  orgId: string
}

export function NotificationsPage({ orgId }: NotificationsPageProps) {
  const { t } = useTranslation('notification')
  const { pagination, setPagination, filters, setFilter, removeFilter } = useFilters({
    pagination: {
      pageIndex: 0,
      pageSize: 10,
    },
    filters: {},
  })

  const { pageIndex, pageSize } = pagination

  const limit = pageSize
  const offset = pageIndex * pageSize

  // Extract filter values (useFilters already converts types correctly)
  const categoryFilter = filters.category as string | undefined
  const priorityFilter = filters.priority as string | undefined
  const readFilter = filters.read as boolean | undefined

  // Memoize the filter object to prevent unnecessary re-fetches
  // Only include offset if it's not 0 to share cache with bell dropdown
  const apiFilters = useMemo(() => {
    const filters: any = {
      limit,
      organizationId: orgId,
    }
    
    if (offset > 0) {
      filters.offset = offset
    }
    
    if (readFilter !== undefined) {
      filters.read = readFilter
    }
    
    return filters
  }, [limit, offset, orgId, readFilter])

  const {
    data: notificationsData,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useNotifications(apiFilters, true)

  const { markAsRead, deleteNotification, markAllAsRead, unreadCount } = useNotificationContext()

  // Client-side filtering for category and priority (since API doesn't support these yet)
  const filteredNotifications = useMemo(() => {
    let filtered = notificationsData?.data ?? []

    if (categoryFilter) {
      filtered = filtered.filter((n) => n.category === categoryFilter)
    }

    if (priorityFilter) {
      filtered = filtered.filter((n) => n.priority === priorityFilter)
    }

    return filtered
  }, [notificationsData?.data, categoryFilter, priorityFilter])

  const notifications = filteredNotifications
  const totalCount = notificationsData?.count ?? 0
  const hasMore = notificationsData?.hasMore ?? false

  const currentFrom = useMemo(() => (totalCount === 0 ? 0 : offset + 1), [offset, totalCount])
  const currentTo = useMemo(() => Math.min(offset + limit, totalCount), [offset, limit, totalCount])

  const activeFiltersCount = [categoryFilter, priorityFilter, readFilter].filter(
    (f) => f !== undefined
  ).length

  return (
    <div className="flex flex-col gap-6">
      {/* Header with stats */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">{t('all_notifications')}</h2>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>
              {t('showing', { from: currentFrom, to: currentTo, total: totalCount })}
            </span>
            {unreadCount > 0 && (
              <>
                <span>•</span>
                <span className="font-medium text-blue-600">{unreadCount} {t('unread')}</span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllAsRead()}
              className="h-9"
            >
              <CheckCheck className="mr-2 h-4 w-4" />
              {t('mark_all_as_read')}
            </Button>
          )}
          
          {/* Page size selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t('show')}</span>
            <select
              value={pageSize}
              onChange={(e) =>
                setPagination({
                  pageIndex: 0,
                  pageSize: parseInt(e.target.value),
                })
              }
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{t('filters')}</span>
        </div>

        {/* Category filter */}
        <Select
          value={categoryFilter || 'all'}
          onValueChange={(value) => {
            if (value === 'all') {
              removeFilter('category')
            } else {
              setFilter('category', value)
            }
          }}
        >
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder={t('category')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('all_categories')}</SelectItem>
            <SelectItem value="touchpoint">{t('categories.touchpoint')}</SelectItem>
            <SelectItem value="billing">{t('categories.billing')}</SelectItem>
            <SelectItem value="system">{t('categories.system')}</SelectItem>
            <SelectItem value="security">{t('categories.security')}</SelectItem>
          </SelectContent>
        </Select>

        {/* Priority filter */}
        <Select
          value={priorityFilter || 'all'}
          onValueChange={(value) => {
            if (value === 'all') {
              removeFilter('priority')
            } else {
              setFilter('priority', value)
            }
          }}
        >
          <SelectTrigger className="w-[130px] h-9">
            <SelectValue placeholder={t('priority')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('all_priorities')}</SelectItem>
            <SelectItem value="urgent">{t('priorities.urgent')}</SelectItem>
            <SelectItem value="high">{t('priorities.high')}</SelectItem>
            <SelectItem value="medium">{t('priorities.medium')}</SelectItem>
            <SelectItem value="low">{t('priorities.low')}</SelectItem>
          </SelectContent>
        </Select>

        {/* Read/Unread filter */}
        <Select
          value={readFilter === undefined ? 'all' : readFilter ? 'read' : 'unread'}
          onValueChange={(value) => {
            if (value === 'all') {
              removeFilter('read')
            } else {
              setFilter('read', value === 'read')
            }
          }}
        >
          <SelectTrigger className="w-[120px] h-9">
            <SelectValue placeholder={t('status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('all')}</SelectItem>
            <SelectItem value="unread">{t('unread_filter')}</SelectItem>
            <SelectItem value="read">{t('read')}</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear filters button */}
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              removeFilter('category')
              removeFilter('priority')
              removeFilter('read')
            }}
            className="h-9"
          >
            {t('clear_filters', { count: activeFiltersCount })}
          </Button>
        )}
      </div>

      {/* Notifications list */}
      <div className="divide-y rounded-lg border bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          Array.from({ length: pageSize }).map((_, i) => (
            <div key={i} className="flex items-start gap-4 p-5">
              <Skeleton className="mt-1 h-10 w-10 flex-shrink-0 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-7 w-7 rounded-md" />
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
                <div className="flex items-center gap-2 pt-1">
                  <Skeleton className="h-5 w-16 rounded-md" />
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </div>
          ))
        ) : isError ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
              <BellOff className="h-6 w-6 text-destructive" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">{t('failed_to_load')}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              {t('retry')}
            </Button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              {activeFiltersCount > 0
                ? <SearchX className="h-6 w-6 text-muted-foreground" />
                : <BellOff className="h-6 w-6 text-muted-foreground" />
              }
            </div>
            <div className="space-y-1">
              <p className="font-medium">
                {activeFiltersCount > 0 ? t('no_match_filters') : t('no_notifications')}
              </p>
              {activeFiltersCount > 0 && (
                <p className="text-sm text-muted-foreground">{t('try_clear_filters')}</p>
              )}
            </div>
            {activeFiltersCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  removeFilter('category')
                  removeFilter('priority')
                  removeFilter('read')
                }}
              >
                {t('clear_filters', { count: activeFiltersCount })}
              </Button>
            )}
          </div>
        ) : (
          notifications.map((notification) => (
            <NotificationItemPage
              key={notification.id}
              notification={notification}
              onMarkAsRead={markAsRead}
              onDelete={deleteNotification}
            />
          ))
        )}
      </div>

      {/* Pagination controls */}
      <div className="flex items-center justify-between border-t pt-4">
        <p className="text-sm text-muted-foreground">
          {t('page_of', { page: pageIndex + 1, total: Math.ceil(totalCount / pageSize) })}
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pageIndex === 0}
            onClick={() =>
              setPagination({
                ...pagination,
                pageIndex: Math.max(0, pageIndex - 1),
              })
            }
          >
            {t('previous')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!hasMore}
            onClick={() =>
              setPagination({
                ...pagination,
                pageIndex: pageIndex + 1,
              })
            }
          >
            {t('next')}
          </Button>
        </div>
      </div>
    </div>
  )
}
