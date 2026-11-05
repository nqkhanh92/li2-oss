import { CollectionOrgPermission, CollectionRole } from '@/shared/types/collection.types'
import { t } from 'i18next'

/**
 * Organization-level permission options for collections
 */
export const COLLECTION_ORG_PERMISSIONS = [
  {
    value: CollectionOrgPermission.CAN_EDIT,
    label: 'collection:permissions.can_edit.label',
    description: 'collection:permissions.can_edit.description',
    icon: '✏️',
  },
  {
    value: CollectionOrgPermission.CAN_VIEW,
    label: 'collection:permissions.can_view.label',
    description: 'collection:permissions.can_view.description',
    icon: '👁️',
  },
  {
    value: CollectionOrgPermission.NO_ACCESS,
    label: 'collection:permissions.no_access.label',
    description: 'collection:permissions.no_access.description',
    icon: '🔒',
  },
] as const

/**
 * Collection member role options
 */
export const COLLECTION_MEMBER_ROLES = [
  {
    value: CollectionRole.OWNER,
    label: 'collection:roles.owner.label',
    description: 'collection:roles.owner.description',
    icon: '👑',
  },
  {
    value: CollectionRole.EDITOR,
    label: 'collection:roles.editor.label',
    description: 'collection:roles.editor.description',
    icon: '✏️',
  },
  {
    value: CollectionRole.VIEWER,
    label: 'collection:roles.viewer.label',
    description: 'collection:roles.viewer.description',
    icon: '👁️',
  },
  {
    value: CollectionRole.NO_ACCESS,
    label: 'collection:roles.no_access.label',
    description: 'collection:roles.no_access.description',
    icon: '🚫',
  },
] as const

/**
 * Default colors for collections
 */
export const COLLECTION_COLORS = [
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#EF4444', // Red
  '#F59E0B', // Amber
  '#10B981', // Green
  '#14B8A6', // Teal
  '#6366F1', // Indigo
  '#F97316', // Orange
  '#06B6D4', // Cyan
] as const

/**
 * Collection sort options
 */
export const COLLECTION_SORT_OPTIONS = [
  { value: 'name', label: 'common:form.fields.name' },
  { value: 'created_at', label: 'common:timestamps.created_at' },
  { value: 'updated_at', label: 'common:timestamps.updated_at' },
] as const

/**
 * Default query parameters
 */
export const DEFAULT_COLLECTION_PARAMS = {
  page: 1,
  limit: 20,
  sort_by: 'created_at' as const,
  sort_order: 'desc' as const,
}

/**
 * Get permission label by value
 */
export const getOrgPermissionLabel = (permission: CollectionOrgPermission): string => {
  const perm = COLLECTION_ORG_PERMISSIONS.find((p) => p.value === permission)
  return perm ? t(perm.label) : permission
}

/**
 * Get permission description by value
 */
export const getOrgPermissionDescription = (permission: CollectionOrgPermission): string => {
  const perm = COLLECTION_ORG_PERMISSIONS.find((p) => p.value === permission)
  return perm ? t(perm.description) : permission
}

/**
 * Get role label by value
 */
export const getRoleLabel = (role: CollectionRole): string => {
  const r = COLLECTION_MEMBER_ROLES.find((mr) => mr.value === role)
  return r ? t(r.label) : role
}

/**
 * Get permission badge color
 */
export const getPermissionBadgeColor = (permission: CollectionOrgPermission): string => {
  switch (permission) {
    case CollectionOrgPermission.CAN_EDIT:
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
    case CollectionOrgPermission.CAN_VIEW:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
    case CollectionOrgPermission.NO_ACCESS:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

/**
 * Get role badge color
 */
export const getRoleBadgeColor = (role: CollectionRole): string => {
  switch (role) {
    case CollectionRole.OWNER:
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
    case CollectionRole.EDITOR:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
    case CollectionRole.VIEWER:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    case CollectionRole.NO_ACCESS:
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}
