import 'server-only'
import { redis } from '@/infrastructure/cache/redis'
import { notificationRepository } from '@/core/repositories/notification.repository'
import { TablesInsert } from '@/shared/types/database.types'
import {
  NotificationType,
  NotificationDataForType,
  INotification,
  INotificationCreate,
  NotificationScope,
} from '../types/notification.type'
import { NotificationFactory } from '../helpers/notificationFactory'
import { logger } from '@/infrastructure/logging/logger'
import { collectionMemberService } from './collection-member.service'
import { memberService } from './member.service'
import { enqueueTask } from '@/infrastructure/queue/asynq-client'
import { QUEUE_NAMES, TASK_NOTIFICATION_CREATE } from '@/infrastructure/queue/constants'

const log = logger.child({
  service: 'notification-service',
})
// Types for service
export type NotificationPayload = {
  payload: INotificationCreate
  context: {
    scope: NotificationScope
    userIds?: string[]
    organizationIds?: string[]
    spaceIds?: string[]
  }
}

export interface NotificationFilters {
  userId: string
  read?: boolean
  type?: string
  limit?: number
  offset?: number
  organizationId?: string
}

export class NotificationService {
  private readonly NOTIFICATION_CHANNEL = 'notifications'
  private repo = notificationRepository

  /**
   * Publish a notification event to Redis
   * @param channel - The Redis channel to publish to (default: 'notifications')
   * @param payload - The notification payload
   * @returns Number of subscribers that received the message
   */
  async publish(channel: string, payload: NotificationPayload): Promise<number> {
    try {
      const message = JSON.stringify({
        ...payload,
      })

      // const subscriberCount = await redis.publish(channel, message)
      // log.info(`[Notification Sending]: subscriber`)
      enqueueTask(TASK_NOTIFICATION_CREATE, payload, {
        queue: QUEUE_NAMES.NOTIFICATIONS,
        maxRetry: 3,
        timeout: 30,
      }).catch((error) => {
        // This catch is extra safety - enqueueTask already catches errors
        log.error({ error, payload }, 'Critical: Failed to enqueue notification task')
      })
      // if (subscriberCount === 0) {
      //   log.warn({ channel, message }, 'No subscribers for notification')
      //   await this.saveToDb(payload)
      //   // await redis.lpush(`${channel}:queue`, message)
      // }

      return 1
    } catch (error) {
      console.error('Failed to publish notification:', error)
      throw error
    }
  }

  async saveToDb(payload: NotificationPayload) {
    if (payload.context.scope === 'global') {
      await this.repo.create(payload.payload)
    } else {
      let userIds: string[] = []
      if (payload.context.scope === 'individual') {
        userIds.concat(payload.context.userIds || [])
      }
      if (payload.context.scope === 'org-space') {
        for (const orgId of payload.context.organizationIds || []) {
          const members = await collectionMemberService.systemGetCollectionMembers(orgId)
          userIds.concat(members.map((m) => m.user_id))
        }
      }
      if (payload.context.scope === 'organization') {
        for (const orgId of payload.context.organizationIds || []) {
          const members = await memberService.systemGetByOrgId(orgId)
          userIds.concat(members.map((m) => m.user_id))
        }
      }

      const notifications = userIds.map((userId) => ({
        ...payload.payload,
        user_id: userId,
      }))
      await this.repo.bulkCreate(notifications)
    }
    // return this.repo.create(payload.payload)
  }

  /**
   * Publish a notification to the default channel
   * @param payload - The notification payload
   * @returns Number of subscribers that received the message
   */
  async publishNotification(payload: NotificationPayload): Promise<number> {
    return this.publish(this.NOTIFICATION_CHANNEL, payload)
  }

  /**
   * Create a type-safe notification using the factory and publish it
   * @param type - Notification type
   * @param data - Type-safe data for the notification
   * @param userId - User ID to send notification to
   * @param organizationId - Optional organization ID
   * @returns Created notification
   */
  async createTypedNotification<T extends NotificationType>(
    type: T,
    data: NotificationDataForType<T>
  ) {
    // Use factory to create type-safe notification
    const { data: notificationData, context } = NotificationFactory.createNotification(type, data)

    const payload: NotificationPayload = {
      payload: notificationData,
      context,
    }
    await this.publish(this.NOTIFICATION_CHANNEL, payload)

    return payload
  }

  /**
   * Get notifications for a user
   */
  async getNotifications(filters: NotificationFilters) {
    return await this.repo.getByUserId(filters)
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string, organizationId?: string) {
    return await this.repo.getUnreadCount(userId, organizationId)
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(id: string, userId: string) {
    return await this.repo.markAsRead(id, userId)
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string, organizationId?: string) {
    return await this.repo.markAllAsRead(userId, organizationId)
  }

  /**
   * Delete a notification
   */
  async deleteNotification(id: string, userId: string) {
    return await this.repo.deleteById(id, userId)
  }

  /**
   * Get notification by ID
   */
  async getById(id: string, userId: string) {
    return await this.repo.getById(id, userId)
  }
}

export const notificationService =
  process.env.NODE_ENV !== 'production'
    ? new NotificationService()
    : globalThis._notificationService ??
      (globalThis._notificationService = new NotificationService())
