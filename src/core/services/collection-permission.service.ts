import { collectionRepo } from '../repositories/collection.repository'
import { collectionMemberRepo } from '../repositories/collection-member.repository'
import {
  CollectionOrgPermission,
  CollectionPermissionResult,
  CollectionRole,
} from '@/shared/types/collection.types'
import { getPermissionScopeOrThrow } from '@/shared/lib/permission/permissions'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'
import { ForbiddenError } from '@/infrastructure/response/errors/domain.errors'
import { memberRepo } from '../repositories/member.repository'

/**
 * Collection Permission Service
 * Handles complex permission logic combining:
 * 1. Organization Owner role (highest priority - full access to all collections)
 * 2. Organization-level permissions (from user's org role)
 * 3. Collection-level permissions (org_permission field)
 * 4. Collection member permissions (collection_members table)
 *
 * Rule: Organization Owners bypass ALL restrictions
 */
export class CollectionPermissionService {
  /**
   * Check if user can access a collection and determine their effective permissions
   *
   * @returns CollectionPermissionResult with canView, canEdit, canDelete, canManageMembers
   */
  async getCollectionPermissions(
    orgId: string,
    collectionId: string,
    userId: string
  ): Promise<CollectionPermissionResult> {
    // 1. Get the collection
    const collection = await collectionRepo.findByIdWithStats(orgId, collectionId)

    if (!collection) {
      throw new ForbiddenError('Collection not found or access denied', { key: 'collection:errors.access_denied' })
    }

    // 2. HIGHEST PRIORITY: Check if user is Organization Owner
    // Organization Owners have full access to ALL collections, bypassing all restrictions
    const isOrgOwner = await memberRepo.isOrganizationOwner(orgId, userId)
    if (isOrgOwner) {      
      return {
        canView: true,
        canEdit: true,
        canEditContent: true,
        canDelete: true,
        canManageMembers: true,
        effectiveRole: CollectionRole.OWNER,
        source: 'org_role',
      }
    }

    // 3. Check if user is the collection creator (always has full access)
    if (collection.user_id === userId) {
      return {
        canView: true,
        canEdit: true,
        canEditContent: true,
        canDelete: true,
        canManageMembers: true,
        effectiveRole: CollectionRole.OWNER,
        source: 'collection_member',
      }
    }

    // 4. Check if user is a collection member (overrides org permissions)
    const memberRole = await collectionMemberRepo.findMemberRole(collectionId, userId)

    if (memberRole) {
      return this.getPermissionsFromCollectionRole(memberRole, 'collection_member')
    }

    // 5. Check if user is Manager/Admin with EDIT_COLLECTION: All (admin override)
    // This allows admins to access all collections, even those with org_permission=NO_ACCESS
    try {
      const editScope = await getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.EDIT_COLLECTION)

      if (editScope === 'all') {
        // Admin with ALL scope can access any collection
        let canDelete = false
        try {
          const deleteScope = await getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.DELETE_COLLECTION)
          canDelete = deleteScope === 'all'
        } catch {
          canDelete = false
        }

        let canManageMembers = false
        try {
          const manageMembersScope = await getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.MANAGE_COLLECTION_MEMBERS)
          canManageMembers = manageMembersScope === 'all' || (manageMembersScope === 'own' && collection.user_id === userId)
        } catch {
          canManageMembers = false
        }

        return {
          canView: true,
          canEdit: true,
          canEditContent: true,
          canDelete,
          canManageMembers,
          effectiveRole: CollectionRole.EDITOR,
          source: 'org_role',
        }
      }
    } catch {
      // User doesn't have EDIT_COLLECTION permission, continue to org_permission check
    }

    // 6. Check organization-level collection permission
    const orgPermission = collection.org_permission as CollectionOrgPermission

    if (orgPermission === CollectionOrgPermission.NO_ACCESS) {
      // Only collection members and admins (checked above) can access
      throw new ForbiddenError('You do not have access to this collection', { key: 'collection:errors.no_access_to_collection' })
    }

    // 7. User has org-level access - determine permissions based on org_permission
    if (orgPermission === CollectionOrgPermission.CAN_VIEW) {
      return {
        canView: true,
        canEdit: false,
        canEditContent: false,
        canDelete: false,
        canManageMembers: false,
        effectiveRole: CollectionRole.VIEWER,
        source: 'org_permission',
      }
    }

    // 8. org_permission is CAN_EDIT - check user's org role permissions
    try {
      // Check if user has EDIT_COLLECTION permission in org
      const editScope = await getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.EDIT_COLLECTION)      
      // If scope is OWN, user can only edit their own collections metadata
      // BUT they can still edit content (touch-points) if org_permission=CAN_EDIT
      if (editScope === 'own' && collection.user_id !== userId) {
        return {
          canView: true,
          canEdit: false,  // Cannot edit collection metadata
          canEditContent: orgPermission === CollectionOrgPermission.CAN_EDIT,  // Can edit content if CAN_EDIT
          canDelete: false,
          canManageMembers: false,
          effectiveRole: CollectionRole.VIEWER,
          source: 'org_role',
        }
      }

      // User can edit - check delete permission
      let canDelete = false
      try {
        const deleteScope = await getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.DELETE_COLLECTION)
        canDelete = deleteScope === 'all' || (deleteScope === 'own' && collection.user_id === userId)
      } catch {
        canDelete = false
      }

      // Check manage members permission
      let canManageMembers = false
      try {
        const manageMembersScope = await getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.MANAGE_COLLECTION_MEMBERS)
        canManageMembers = manageMembersScope === 'all' || (manageMembersScope === 'own' && collection.user_id === userId)
      } catch {
        canManageMembers = false
      }

      return {
        canView: true,
        canEdit: true,
        canEditContent: true,
        canDelete,
        canManageMembers,
        effectiveRole: CollectionRole.EDITOR,
        source: 'org_role',
      }
    } catch {
      // User doesn't have EDIT_COLLECTION permission (can't edit collection metadata)
      // But they can still edit CONTENT if org_permission = CAN_EDIT
      // (org_permission allows content collaboration even without collection management rights)
      const canEditContent = orgPermission === CollectionOrgPermission.CAN_EDIT
      return {
        canView: true,
        canEdit: false,
        canEditContent,
        canDelete: false,
        canManageMembers: false,
        effectiveRole: canEditContent ? CollectionRole.EDITOR : CollectionRole.VIEWER,
        source: 'org_permission',
      }
    }
  }

  /**
   * Ensure user can view collection (throws if not)
   */
  async ensureCanView(orgId: string, collectionId: string, userId: string): Promise<void> {
    const permissions = await this.getCollectionPermissions(orgId, collectionId, userId)
    if (!permissions.canView) {
      throw new ForbiddenError('You do not have permission to view this collection', { key: 'collection:errors.cannot_view_collection' })
    }
  }

  /**
   * Ensure user can edit collection (throws if not)
   */
  async ensureCanEdit(orgId: string, collectionId: string, userId: string): Promise<void> {
    const permissions = await this.getCollectionPermissions(orgId, collectionId, userId)
    if (!permissions.canEdit) {
      throw new ForbiddenError('You do not have permission to edit this collection', { key: 'collection:errors.cannot_edit_collection' })
    }
  }

  /**
   * Ensure user can delete collection (throws if not)
   */
  async ensureCanDelete(orgId: string, collectionId: string, userId: string): Promise<void> {
    const permissions = await this.getCollectionPermissions(orgId, collectionId, userId)
    if (!permissions.canDelete) {
      throw new ForbiddenError('You do not have permission to delete this collection', { key: 'collection:errors.cannot_delete_collection' })
    }
  }

  /**
   * Ensure user can manage collection members (throws if not)
   */
  async ensureCanManageMembers(orgId: string, collectionId: string, userId: string): Promise<void> {
    const permissions = await this.getCollectionPermissions(orgId, collectionId, userId)
    if (!permissions.canManageMembers) {
      throw new ForbiddenError('You do not have permission to manage collection members', { key: 'collection:errors.cannot_manage_members' })
    }
  }

  /**
   * Check if user can add/remove touch-points to/from a collection
   * This is different from editing the collection itself
   * - Collection members with EDITOR or OWNER role: YES
   * - Non-members: Only if org_permission=CAN_EDIT (allows collaboration)
   */
  async canAddTouchPointsToCollection(orgId: string, collectionId: string, userId: string): Promise<boolean> {
    try {
      const permissions = await this.getCollectionPermissions(orgId, collectionId, userId)      

      // by-pass everything for owner
      if (permissions.source === 'org_role' && permissions.effectiveRole === 'owner') {
        return true
      }

      // If user is a collection member with edit permission, they can add touch-points
      if (permissions.source === 'collection_member' && permissions.canEditContent) {
        return true
      }

      // If collection has org_permission=CAN_EDIT, org members can add touch-points
      // (but they cannot edit the collection metadata itself)
      if (permissions.source === 'org_permission' || permissions.source === 'org_role') {
        const collection = await collectionRepo.findByIdWithStats(orgId, collectionId)
        return collection?.org_permission === CollectionOrgPermission.CAN_EDIT
      }

      return false
    } catch {
      return false
    }
  }

  /**
   * Ensure user can add touch-points to collection (throws if not)
   */
  async ensureCanAddTouchPointsToCollection(orgId: string, collectionId: string, userId: string): Promise<void> {
    const canAdd = await this.canAddTouchPointsToCollection(orgId, collectionId, userId)
    if (!canAdd) {
      throw new ForbiddenError('You do not have permission to add touch-points to this collection', { key: 'collection:errors.cannot_add_touchpoints' })
    }
  }

  /**
   * Check if user is member of organization
   */
  async ensureOrgMember(orgId: string, userId: string): Promise<void> {
    const isMember = await memberRepo.isMemberOfOrg(orgId, userId)
    if (!isMember) {
      throw new ForbiddenError('User is not a member of this organization', { key: 'collection:errors.user_not_org_member' })
    }
  }

  /**
   * Convert collection role to permission result
   */
  private getPermissionsFromCollectionRole(
    role: CollectionRole,
    source: 'collection_member' | 'org_permission' | 'org_role'
  ): CollectionPermissionResult {
    switch (role) {
      case CollectionRole.OWNER:
        return {
          canView: true,
          canEdit: true,
          canEditContent: true,
          canDelete: true,
          canManageMembers: true,
          effectiveRole: CollectionRole.OWNER,
          source,
        }

      case CollectionRole.EDITOR:
        return {
          canView: true,
          canEdit: false,  // Editors can edit content (touch-points) but not collection metadata
          canEditContent: true,
          canDelete: false,
          canManageMembers: false,
          effectiveRole: CollectionRole.EDITOR,
          source,
        }

      case CollectionRole.VIEWER:
        return {
          canView: true,
          canEdit: false,
          canEditContent: false,
          canDelete: false,
          canManageMembers: false,
          effectiveRole: CollectionRole.VIEWER,
          source,
        }

      case CollectionRole.NO_ACCESS:
      default:
        return {
          canView: false,
          canEdit: false,
          canEditContent: false,
          canDelete: false,
          canManageMembers: false,
          effectiveRole: CollectionRole.NO_ACCESS,
          source,
        }
    }
  }

  /**
   * Get all collections user can access in an organization
   * Applies permission filtering at service layer
   * @param isOwner - Optional pre-computed owner status to avoid duplicate DB calls
   */
  async getAccessibleCollectionIds(orgId: string, userId: string, isOwner?: boolean): Promise<string[]> {
    // Get all collections in org
    const { data: allCollections } = await collectionRepo.findAllByOrganization(orgId)

    if (!allCollections || allCollections.length === 0) {
      return []
    }

    // Check if user is Organization Owner (can access ALL collections)
    const isOrgOwner = isOwner ?? await memberRepo.isOrganizationOwner(orgId, userId)
    if (isOrgOwner) {
      return allCollections.map((c: any) => c.id)
    }

    // Check if user is admin with ALL scope (can access all collections)
    let isAdminWithAllScope = false
    try {
      const editScope = await getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.EDIT_COLLECTION)
      isAdminWithAllScope = editScope === 'all'
    } catch {
      // User doesn't have EDIT_COLLECTION permission
      isAdminWithAllScope = false
    }

    // If user is admin with ALL scope, return all collection IDs
    if (isAdminWithAllScope) {
      return allCollections.map((c: any) => c.id)
    }

    // Check if user has VIEW_TOUCH_POINTS permission (identifies Editor vs Viewer)
    // Editors can access collections via org_permission, Viewers cannot
    let hasViewTouchPointsPermission = false
    try {
      await getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.VIEW_TOUCH_POINTS)
      hasViewTouchPointsPermission = true
    } catch {
      hasViewTouchPointsPermission = false
    }

    // Get collections where user is a member with their roles
    const memberCollections = await collectionMemberRepo.findCollectionsByUserId(userId, orgId)
    const memberCollectionMap = new Map(
      memberCollections.map((m: any) => [m.collection_id, m.role as CollectionRole])
    )

    // Filter collections based on access
    const accessibleIds: string[] = []

    for (const collection of allCollections) {
      // Creator always has access
      if (collection.user_id === userId) {
        accessibleIds.push(collection.id)
        continue
      }

      // Check if user is a collection member
      const memberRole = memberCollectionMap.get(collection.id)
      if (memberRole) {
        // Member with NO_ACCESS role is explicitly denied
        if (memberRole === CollectionRole.NO_ACCESS) {
          continue
        }
        // Any other membership role (viewer/editor/owner) grants access
        accessibleIds.push(collection.id)
        continue
      }

      // Not a member - check org_permission ONLY for users with VIEW_TOUCH_POINTS (Editors)
      // Viewers (without VIEW_TOUCH_POINTS) must be explicit members to access
      if (hasViewTouchPointsPermission) {
        const orgPermission = collection.org_permission as CollectionOrgPermission
        if (
          orgPermission === CollectionOrgPermission.CAN_EDIT ||
          orgPermission === CollectionOrgPermission.CAN_VIEW
        ) {
          accessibleIds.push(collection.id)
        }
      }
    }

    return accessibleIds
  }

  /**
   * Get all collections user can EDIT in an organization
   * Only returns collections where user has edit permission (Owner or Editor role)
   * Used for filtering touch-points that can be added to other collections
   */
  async getEditableCollectionIds(orgId: string, userId: string): Promise<string[]> {
    // Get all collections in org
    const { data: allCollections } = await collectionRepo.findAllByOrganization(orgId)

    if (!allCollections || allCollections.length === 0) {
      return []
    }

    // Check if user is Organization Owner (can edit ALL collections)
    const isOrgOwner = await memberRepo.isOrganizationOwner(orgId, userId)
    if (isOrgOwner) {
      return allCollections.map((c: any) => c.id)
    }

    // Check if user is admin with EDIT_COLLECTION: All scope (can edit all collections)
    let isAdminWithAllScope = false
    try {
      const editScope = await getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.EDIT_COLLECTION)
      isAdminWithAllScope = editScope === 'all'
    } catch {
      // User doesn't have EDIT_COLLECTION permission
      isAdminWithAllScope = false
    }

    // If user is admin with ALL scope, return all collection IDs
    if (isAdminWithAllScope) {
      return allCollections.map((c: any) => c.id)
    }

    // Get collections where user is a member with their roles
    const memberCollections = await collectionMemberRepo.findCollectionsByUserId(userId, orgId)
    const memberCollectionMap = new Map(
      memberCollections.map((m: any) => [m.collection_id, m.role as CollectionRole])
    )

    // Filter collections where user can edit
    const editableIds: string[] = []

    for (const collection of allCollections) {
      // Creator always has edit access (implicit owner)
      if (collection.user_id === userId) {
        editableIds.push(collection.id)
        continue
      }

      // Check if user is a collection member with edit permission
      const memberRole = memberCollectionMap.get(collection.id)
      if (memberRole === CollectionRole.OWNER || memberRole === CollectionRole.EDITOR) {
        editableIds.push(collection.id)
        continue
      }

      // If user is Viewer or NO_ACCESS as member, org_permission doesn't matter (member overrides)
      if (memberRole === CollectionRole.VIEWER || memberRole === CollectionRole.NO_ACCESS) {
        continue
      }

      // Not a member - check if org_permission=CAN_EDIT allows content editing
      const orgPermission = collection.org_permission as CollectionOrgPermission
      if (orgPermission === CollectionOrgPermission.CAN_EDIT) {
        // User can edit content (touch-points) in this collection
        editableIds.push(collection.id)
      }
    }

    return editableIds
  }
}

// Singleton instance
export const collectionPermissionService =
  globalThis._collectionPermissionService ?? new CollectionPermissionService()

if (process.env.NODE_ENV !== 'production') {
  globalThis._collectionPermissionService = collectionPermissionService
}
