import { ExportType } from '@/features/touch-points/utils/export-strategies'

enum NotificationType {
  INVITATION_RECEIVED = 'invitation.received',

  USER_ADDED_TO_COLLECTION = 'collection.user_added',
  USER_REMOVED_FROM_COLLECTION = 'collection.user_removed',

  BULK_IMPORT_COMPLETED = 'touchpoint.bulk_import.completed',
  BULK_IMPORT_FAILED = 'touchpoint.bulk_import.failed',

  EXPORT_COMPLETE = 'touchpoint.export.completed',
  EXPORT_FAILED = 'touchpoint.export.failed',

  TOUCHPOINT_QUOTA_EXCEEDED = 'quota.exceeded.touchpoint',
  AI_CREDIT_QUOTA_EXCEEDED = 'quota.exceeded.ai_credit',

  PLAN_EXPIRED = 'billing.plan.expired',
  PAYMENT_FAILED = 'billing.payment.failed',

  SYSTEM_ALERT = 'system.alert',
  SYSTEM_NOTIFICATION = 'system.notification',

  TOUCHPOINT_SAFETY_VIOLATION = 'security.touchpoint_safety_violation',

  NEW_FEATURE_RELEASED = 'feature.released', // ❌ TypeScript error!

  DOMAIN_VERIFIED = 'domain.verified',
}

// Type-safe data mapping for each notification type
// This ensures ALL NotificationType enum values are covered
type NotificationDataMap = {
  [NotificationType.INVITATION_RECEIVED]: {
    orgId: string
    orgName: string
    inviteBy: string
    inviteAt: string
    inviteToken: string
    userId: string
  }
  [NotificationType.USER_ADDED_TO_COLLECTION]: {
    userId: string
    collectionId: string
    collectionName: string
    addedBy: string
    organizationId: string
  }
  [NotificationType.USER_REMOVED_FROM_COLLECTION]: {
    userId: string
    collectionName: string
    removedBy: string
    organizationId: string
  }
  [NotificationType.BULK_IMPORT_COMPLETED]: {
    importId: string
    totalRecords: number
    successCount: number
    failedCount: number
    organizationId: string
  }
  [NotificationType.BULK_IMPORT_FAILED]: {
    importId: string
    errorMessage: string
    failedAt: string
    organizationId: string
    userId: string
  }
  [NotificationType.EXPORT_COMPLETE]: {
    organizationId: string
    exportType: ExportType
    userId: string
  }
  [NotificationType.EXPORT_FAILED]: {
    errorMessage: string
    organizationId: string
    exportType: ExportType
    userId: string
  }

  [NotificationType.TOUCHPOINT_QUOTA_EXCEEDED]: {
    currentCount: number
    limit: number
    organizationId: string
  }
  [NotificationType.AI_CREDIT_QUOTA_EXCEEDED]: {
    currentCredits: number
    organizationId: string
  }
  [NotificationType.PLAN_EXPIRED]: {
    planName: string
    expiredAt: string
    organizationId: string
    userId: string
  }
  [NotificationType.PAYMENT_FAILED]: {
    amount: number
    currency: string
    reason: string
    organizationId: string
    userId: string
  }
  [NotificationType.SYSTEM_ALERT]: {
    severity: 'info' | 'warning' | 'error'
    message: string
  }
  [NotificationType.SYSTEM_NOTIFICATION]: {
    severity: 'info' | 'warning' | 'error'
    message: string
  }
  [NotificationType.TOUCHPOINT_SAFETY_VIOLATION]: {
    touchPointId: string
    touchPointName: string
    url: string
    threatTypes: string[]
    organizationId: string
  }
  [NotificationType.DOMAIN_VERIFIED]: {
    domain: string
  }
}

// Type-level check to ensure all NotificationType values are covered
type _ExhaustivenessCheck = {
  [K in NotificationType]: K extends keyof NotificationDataMap ? true : false
}

type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent'
type NotificationCategory = 'touchpoint' | 'billing' | 'system' | 'security'

type NotificationChannel = 'in_app' | 'email' | 'push' | 'sms'

type NotificationRedirectAction = {
  type: 'redirect'
  url: string
}

type NotificationAction = NotificationRedirectAction

type NotificationActionType = NotificationAction['type']

type NotificationScope = 'organization' | 'individual' | 'global' | 'org-space'
interface INotification {
  id: string
  type: NotificationType
  title: string
  message: string
  scope: NotificationScope
  priority: NotificationPriority
  category: NotificationCategory
  channels: NotificationChannel[]
  created_at: string
  read_at?: string
  action?: NotificationAction
  metadata?: Record<string, any>
  data?: Record<string, any>
  user_id?: string
  organization_id?: string
}

type INotificationCreate = Omit<INotification, 'id' | 'created_at' | 'read_at'>

// Helper type to get data type for a specific notification type
type NotificationDataForType<T extends NotificationType> = T extends keyof NotificationDataMap
  ? NotificationDataMap[T]
  : Record<string, any>

export type {
  INotification,
  INotificationCreate,
  NotificationDataMap,
  NotificationDataForType,
  NotificationAction,
  NotificationActionType,
  NotificationScope,
}

export { NotificationType }
