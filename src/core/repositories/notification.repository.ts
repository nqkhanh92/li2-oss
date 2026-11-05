import { NotificationFilters } from '../services/notification.service'
import { BaseRepository } from './base.repository'
import { TablesInsert, TablesUpdate } from '@/shared/types/database.types'

export class NotificationRepository extends BaseRepository<'notifications'> {
  constructor() {
    super('notifications')
  }

  /**
   * Get notifications for a user with filters and pagination
   */
  async getByUserId(filters: NotificationFilters) {
    const { userId, read, type, limit = 50, offset = 0, organizationId } = filters

    let query = this.query()
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (read !== undefined) {
      if (read) {
        query = query.not('read_at', 'is', null)
      } else {
        query = query.is('read_at', null)
      }
    }

    if (type) {
      query = query.eq('type', type)
    }

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    const { data, error, count } = await query

    if (error) throw error

    return {
      data: data || [],
      count: count || 0,
      hasMore: count ? offset + limit < count : false,
    }
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string, organizationId?: string) {
    let query = this.query()
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('read_at', null)

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    const { count, error } = await query

    if (error) throw error

    return count || 0
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(id: string, userId: string) {
    const { data, error } = await this.query()
      .update({
        read_at: new Date().toISOString(),
      } as TablesUpdate<'notifications'>)
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .single()

    if (error) throw error

    return data
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string, organizationId?: string) {
    let query = this.query()
      .update({
        read_at: new Date().toISOString(),
      } as TablesUpdate<'notifications'>)
      .eq('user_id', userId)
      .is('read_at', null)

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    const { data, error } = await query.select('*')

    if (error) throw error

    return data || []
  }

  /**
   * Delete a notification
   */
  async deleteById(id: string, userId: string) {
    const { error } = await this.query().delete().eq('id', id).eq('user_id', userId)

    if (error) throw error
  }

  /**
   * Create a notification
   */
  async createNotification(data: TablesInsert<'notifications'>) {
    return await this.create(data)
  }

  /**
   * Get notification by ID
   */
  async getById(id: string, userId: string) {
    const { data, error } = await this.query()
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (error) throw error

    return data
  }

  /**
   * Delete old read notifications (cleanup)
   */
  async deleteOldReadNotifications(userId: string, daysOld: number = 30) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    const { count, error } = await this.query()
      .delete({ count: 'exact' })
      .eq('user_id', userId)
      .eq('read', true)
      .lt('created_at', cutoffDate.toISOString())

    if (error) throw error

    return count || 0
  }
}

export const notificationRepository =
  process.env.NODE_ENV !== 'production'
    ? new NotificationRepository()
    : globalThis._notificationRepo ?? (globalThis._notificationRepo = new NotificationRepository())
