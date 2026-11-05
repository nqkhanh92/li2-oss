import {
  INotificationCreate,
  NotificationType,
  NotificationDataForType,
  NotificationScope,
} from '../types/notification.type'

export class NotificationFactory {
  /**
   * Create a type-safe notification
   * The data parameter will be type-checked based on the notification type
   */
  static createNotification<T extends NotificationType>(
    type: T,
    data: NotificationDataForType<T>
  ): {
    data: INotificationCreate
    context: {
      user_ids?: string[]
      organization_ids?: string[]
      space_ids?: string[]
      scope: NotificationScope
    }
  } {
    switch (type) {
      case NotificationType.INVITATION_RECEIVED: {
        const typedData = data as NotificationDataForType<
          typeof NotificationType.INVITATION_RECEIVED
        >
        return {
          data: {
            type,
            title: 'Invitation Received',
            message: `You have received an invitation to join ${typedData.orgName}.`,
            priority: 'high',
            scope: 'individual',
            category: 'system',
            channels: ['in_app', 'email'],
            data,
            action: {
              type: 'redirect',
              url: `/invitation/${typedData.inviteToken}`,
            },
          },
          context: {
            user_ids: [typedData.userId],
            scope: 'individual',
          },
        }
      }

      case NotificationType.AI_CREDIT_QUOTA_EXCEEDED: {
        const typedData = data as NotificationDataForType<
          typeof NotificationType.AI_CREDIT_QUOTA_EXCEEDED
        >
        return {
          data: {
            type,
            title: 'AI Credit Quota Exceeded',
            message: `Organization AI credits have been exceeded.`,
            priority: 'high',
            scope: 'organization',
            organization_id: typedData.organizationId,
            category: 'billing',
            channels: ['in_app', 'email'],
            data,
            action: {
              type: 'redirect',
              url: `/organizations/${typedData.organizationId}/settings#usage`,
            },
          },
          context: {
            organization_ids: [typedData.organizationId],
            scope: 'organization',
          },
        }
      }

      case NotificationType.TOUCHPOINT_QUOTA_EXCEEDED: {
        const typedData = data as NotificationDataForType<
          typeof NotificationType.TOUCHPOINT_QUOTA_EXCEEDED
        >
        return {
          data: {
            type,
            title: 'Touchpoint Quota Exceeded',
            message: `You have reached ${typedData.currentCount} of ${typedData.limit} touchpoints.`,
            priority: 'high',
            organization_id: typedData.organizationId,
            scope: 'organization',
            category: 'touchpoint',
            channels: ['in_app', 'email'],
            data,
            action: {
              type: 'redirect',
              url: `/organizations/${typedData.organizationId}/settings#touchpoint`,
            },
          },
          context: {
            organization_ids: [typedData.organizationId],
            scope: 'organization',
          },
        }
      }

      case NotificationType.BULK_IMPORT_COMPLETED: {
        const typedData = data as NotificationDataForType<
          typeof NotificationType.BULK_IMPORT_COMPLETED
        >
        return {
          data: {
            type,
            title: 'Bulk Import Completed',
            message: `Successfully imported ${typedData.successCount} of ${typedData.totalRecords} records.`,
            priority: 'medium',
            scope: 'organization',
            organization_id: typedData.organizationId,
            category: 'touchpoint',
            channels: ['in_app'],
            data,
          },
          context: {
            organization_ids: [typedData.organizationId],
            scope: 'organization',
          },
        }
      }

      case NotificationType.BULK_IMPORT_FAILED: {
        const typedData = data as NotificationDataForType<
          typeof NotificationType.BULK_IMPORT_FAILED
        >
        return {
          data: {
            type,
            title: 'Bulk Import Failed',
            message: `Import failed: ${typedData.errorMessage}`,
            priority: 'high',
            scope: 'individual',
            organization_id: typedData.organizationId,
            category: 'touchpoint',
            channels: ['in_app', 'email'],
            data,
          },
          context: {
            user_ids: [typedData.userId],
            scope: 'individual',
          },
        }
      }
      case NotificationType.EXPORT_COMPLETE: {
        const typedData = data as NotificationDataForType<typeof NotificationType.EXPORT_COMPLETE>
        return {
          data: {
            type,
            title: 'Export complete',
            message: `Export to ${typedData.exportType} completed!`,
            priority: 'medium',
            scope: 'individual',
            organization_id: typedData.organizationId,
            category: 'touchpoint',
            channels: ['in_app', 'email'],
            data,
          },
          context: {
            user_ids: [typedData.userId],
            scope: 'individual',
          },
        }
      }
      case NotificationType.EXPORT_FAILED: {
        const typedData = data as NotificationDataForType<typeof NotificationType.EXPORT_FAILED>
        return {
          data: {
            type,
            title: 'Export failed',
            message: `Export to ${typedData.exportType} failed, reason: ${typedData.errorMessage}`,
            priority: 'medium',
            scope: 'individual',
            organization_id: typedData.organizationId,
            category: 'touchpoint',
            channels: ['in_app', 'email'],
            data,
          },
          context: {
            user_ids: [typedData.userId],
            scope: 'individual',
          },
        }
      }

      case NotificationType.USER_ADDED_TO_COLLECTION: {
        const typedData = data as NotificationDataForType<
          typeof NotificationType.USER_ADDED_TO_COLLECTION
        >
        return {
          data: {
            type,
            title: 'Added to Collection',
            message: `You have been added to collection "${typedData.collectionName}".`,
            priority: 'low',
            scope: 'individual',
            organization_id: typedData.organizationId,
            category: 'system',
            channels: ['in_app'],
            data,
            action: {
              type: 'redirect',
              url: `/org/${typedData.organizationId}/spaces/${typedData.collectionId}`,
            },
          },
          context: {
            user_ids: [typedData.userId],
            scope: 'individual',
          },
        }
      }

      case NotificationType.USER_REMOVED_FROM_COLLECTION: {
        const typedData = data as NotificationDataForType<
          typeof NotificationType.USER_REMOVED_FROM_COLLECTION
        >
        return {
          data: {
            type,
            title: 'Removed from Collection',
            message: `You have been removed from collection "${typedData.collectionName}".`,
            priority: 'low',
            scope: 'individual',
            organization_id: typedData.organizationId,
            category: 'system',
            channels: ['in_app'],
            data,
          },
          context: {
            user_ids: [typedData.userId],
            scope: 'individual',
          },
        }
      }

      case NotificationType.PAYMENT_FAILED: {
        const typedData = data as NotificationDataForType<typeof NotificationType.PAYMENT_FAILED>
        return {
          data: {
            type,
            title: 'Payment Failed',
            message: `Payment of ${typedData.amount} ${typedData.currency} failed: ${typedData.reason}`,
            priority: 'urgent',
            scope: 'individual',
            category: 'billing',
            channels: ['in_app', 'email'],
            data,
          },
          context: {
            user_ids: [typedData.userId],
            scope: 'individual',
          },
        }
      }

      case NotificationType.PLAN_EXPIRED: {
        const typedData = data as NotificationDataForType<typeof NotificationType.PLAN_EXPIRED>
        return {
          data: {
            type,
            title: 'Plan Expired',
            message: `Your ${typedData.planName} plan has expired.`,
            priority: 'urgent',
            scope: 'individual',
            category: 'billing',
            channels: ['in_app', 'email'],
            data,
          },
          context: {
            user_ids: [typedData.userId],
            scope: 'individual',
          },
        }
      }

      case NotificationType.TOUCHPOINT_SAFETY_VIOLATION: {
        const typedData = data as NotificationDataForType<
          typeof NotificationType.TOUCHPOINT_SAFETY_VIOLATION
        >
        return {
          data: {
            type,
            title: 'Link Safety Alert',
            message: `Your link "${typedData.touchPointName}" has been flagged as unsafe (${typedData.threatTypes.join(', ')}). Advisory provided by Google. The link has been disabled.`,
            priority: 'urgent',
            scope: 'organization',
            organization_id: typedData.organizationId,
            category: 'security',
            channels: ['in_app', 'email'],
            data,
            action: {
              type: 'redirect',
              url: `/org/${typedData.organizationId}/links`,
            },
          },
          context: {
            organization_ids: [typedData.organizationId],
            scope: 'organization',
          },
        }
      }

      case NotificationType.SYSTEM_NOTIFICATION:
      case NotificationType.SYSTEM_ALERT: {
        const typedData = data as NotificationDataForType<typeof NotificationType.SYSTEM_ALERT>
        return {
          data: {
            type,
            title: 'System Alert',
            message: typedData.message,
            priority: typedData.severity === 'error' ? 'urgent' : 'medium',
            scope: 'global',
            category: 'system',
            channels: ['in_app'],
            data,
          },
          context: {
            scope: 'global',
          },
        }
      }

      default:
        // Fallback for any unmapped types
        return {
          data: {
            type,
            title: 'Notification',
            message: type,
            priority: 'low',
            scope: 'global',
            category: 'system',
            channels: ['in_app'],
            data,
          },
          context: {
            scope: 'global',
          },
        }
    }
  }
}
