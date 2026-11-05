import { BaseService } from './base.service'
import { collectionRepo, CollectionRepository } from '../repositories/collection.repository'
import { collectionMemberRepo } from '../repositories/collection-member.repository'
import { touchPointRepo } from '../repositories/touch-point.repository'
import { touchPointService } from './touch-point.service'
import { collectionPermissionService } from './collection-permission.service'
import { orgAuditLogService } from './org-audit-log.service'
import {
  CreateCollectionDTO,
  UpdateCollectionDTO,
  GetCollectionsQueryParams,
  CollectionOrgPermission,
  CollectionRole,
} from '@/shared/types/collection.types'
import { ensureOrgPlan } from '@/shared/lib/plan/plans'
import { PLAN_LIMIT_KEYS } from '@/shared/types/plan-permission'
import { ensurePolicy, getPermissionScopeOrThrow } from '@/shared/lib/permission/permissions'
import { ROLE_PERMISSION_KEYS, RolePermissionScope } from '@/shared/types/role-permission'
import { nonScopePolicies } from '@/shared/lib/permission/policy'
import { BadRequestError, ForbiddenError, NotFoundError } from '@/infrastructure/response/errors/domain.errors'
import { getObjectDiff } from '@/shared/lib/utils'

export class CollectionService extends BaseService<CollectionRepository> {
  constructor(repo: CollectionRepository) {
    super(repo)
  }

  /**
   * Get all collections in an organization with permission filtering
   */
  async getAllCollections(
    orgId: string,
    userId: string,
    queryParams?: GetCollectionsQueryParams
  ) {
    // Check if user can view collections
    await ensurePolicy(orgId, nonScopePolicies.view_collections)

    // Get accessible collection IDs based on permissions
    const accessibleIds = await collectionPermissionService.getAccessibleCollectionIds(
      orgId,
      userId
    )

    if (accessibleIds.length === 0) {
      return { data: [], count: 0 }
    }

    // Build query modifier
    const modifier = (q: any) => {
      // Filter by accessible IDs
      q = q.in('id', accessibleIds)

      // Apply search filter
      if (queryParams?.search) {
        q = q.or(`name.ilike.%${queryParams.search}%,description.ilike.%${queryParams.search}%`)
      }

      // Apply org_permission filter
      if (queryParams?.org_permission) {
        q = q.eq('org_permission', queryParams.org_permission)
      }

      // Apply sorting
      const sortBy = queryParams?.sort_by || 'created_at'
      const sortOrder = queryParams?.sort_order || 'desc'
      q = q.order(sortBy, { ascending: sortOrder === 'asc' })

      // Apply pagination
      if (queryParams?.page && queryParams?.limit) {
        const from = (queryParams.page - 1) * queryParams.limit
        const to = from + queryParams.limit - 1
        q = q.range(from, to)
      }

      return q
    }

    return this.repo.findAllByOrganizationWithStats(orgId, modifier)
  }

  /**
   * Get a single collection by ID
   */
  async getCollectionById(orgId: string, collectionId: string, userId: string) {
    // Check access permissions
    await collectionPermissionService.ensureCanView(orgId, collectionId, userId)

    const collection = await this.repo.findByIdWithStats(orgId, collectionId)

    if (!collection) {
      throw new NotFoundError('Collection not found', { key: 'collection:errors.collection_not_found' })
    }

    return collection
  }

  /**
   * Create a new collection
   */
  async createCollection(orgId: string, data: CreateCollectionDTO, userId: string) {
    // 1. Check if user has permission to create collections
    await ensurePolicy(orgId, nonScopePolicies.add_collection)

    // 2. Check plan limits
    await ensureOrgPlan(orgId, PLAN_LIMIT_KEYS.MAX_COLLECTIONS_PER_ORG, {
      errorMessage: 'Your organization has reached the maximum number of collections allowed by your plan',
    })

    // 3. Check if collection name already exists
    const nameExists = await this.repo.existsByName(orgId, data.name)
    if (nameExists) {
      throw new BadRequestError('A collection with this name already exists in your organization', { key: 'collection:errors.name_already_exists' })
    }

    // 4. Create the collection
    const collection = await this.repo.createCollection({
      ...data,
      organization_id: orgId,
      user_id: userId,
      org_permission: data.org_permission || CollectionOrgPermission.CAN_EDIT,
    })

    // 5. Automatically add creator as owner in collection_members
    await collectionMemberRepo.addMember({
      collection_id: collection.id,
      user_id: userId,
      role: CollectionRole.OWNER,
      added_by: userId,
    })

    // 6. Log audit event (async, non-blocking)
    orgAuditLogService.logEvent({
      organization_id: orgId,
      user_id: userId,
      module: 'collection',
      action: 'create',
      target_id: collection.id,
      target_name: collection.name,
      target_table: 'collections',
      target_extra: collection,
      changes: getObjectDiff({}, collection),
      metadata: {
        org_permission: collection.org_permission,
      },
    })

    return collection
  }

  /**
   * Update a collection
   */
  async updateCollection(
    orgId: string,
    collectionId: string,
    data: UpdateCollectionDTO,
    userId: string
  ) {
    // 1. Check if user can edit this collection
    await collectionPermissionService.ensureCanEdit(orgId, collectionId, userId)

    // 2. Get old collection data for audit log
    const oldCollection = await this.repo.getCollectionById(orgId, collectionId)
    if (!oldCollection) {
      throw new NotFoundError('Collection not found', { key: 'collection:errors.collection_not_found' })
    }

    // 3. If changing name, check if new name already exists
    if (data.name) {
      const nameExists = await this.repo.existsByName(orgId, data.name, collectionId)
      if (nameExists) {
        throw new BadRequestError('A collection with this name already exists in your organization', { key: 'collection:errors.name_already_exists' })
      }
    }

    // 4. Update the collection
    const updated = await this.repo.updateCollection(orgId, collectionId, data)

    // 5. Log audit event (async, non-blocking)
    orgAuditLogService.generateChangesAndLogEvent(
      {
        organization_id: orgId,
        user_id: userId,
        module: 'collection',
        action: 'update',
        target_id: collectionId,
        target_name: updated.name,
        target_table: 'collections',
        target_extra: updated,
        metadata: {},
      },
      oldCollection,
      updated,
      {
        changeKeys: ['name', 'description', 'color', 'org_permission'],
      }
    )

    return updated
  }

  /**
   * Delete a collection (soft delete)
   */
  async deleteCollection(orgId: string, collectionId: string, userId: string) {
    // 1. Check if user can delete this collection
    await collectionPermissionService.ensureCanDelete(orgId, collectionId, userId)

    // 2. Get collection data for audit log
    const collection = await this.repo.getCollectionById(orgId, collectionId)
    if (!collection) {
      throw new NotFoundError('Collection not found', { key: 'collection:errors.collection_not_found' })
    }

    // 3. Get touch-points in this collection
    const { data: touchPoints, count: touchPointCount } = await touchPointRepo.findAllByCollection(
      orgId,
      collectionId
    )

    // 4. Remove all touch-points from collection (set collection_id to null)
    const tpIds = touchPoints?.map((tp: any) => tp.id) || []
    if (touchPointCount && touchPointCount > 0 && tpIds.length > 0) {
      await touchPointRepo.bulkUpdateCollection(tpIds, null)
    }

    // 5. Soft delete the collection
    await this.repo.softDelete(orgId, collectionId)

    // 6. Log audit event (async, non-blocking)
    orgAuditLogService.logEvent({
      organization_id: orgId,
      user_id: userId,
      module: 'collection',
      action: 'delete',
      target_id: collectionId,
      target_name: collection.name,
      target_table: 'collections',
      target_extra: collection,
      changes: null,
      metadata: {
        soft_delete: true,
        touchpoints_removed: touchPointCount || 0,
        touchpoint_ids: tpIds,
      },
    })

    return { success: true, message: 'Collection deleted successfully' }
  }

  /**
   * Add touch-points to a collection
   * Supports partial success: TPs that can be moved will be moved, blocked TPs are returned in response
   */
  async addTouchPointsToCollection(
    orgId: string,
    collectionId: string,
    touchPointIds: string[],
    userId: string
  ) {
    // 1. Check if user can add touch-points to this collection
    // Note: This is different from editing collection metadata
    // Users with org_permission=CAN_EDIT can add touch-points without being members
    await collectionPermissionService.ensureCanAddTouchPointsToCollection(orgId, collectionId, userId)

    // 2. Verify collection exists
    const collection = await this.repo.getCollectionById(orgId, collectionId)
    if (!collection) {
      throw new NotFoundError('Collection not found', { key: 'collection:errors.collection_not_found' })
    }

    // 3. Get user's permissions in the target collection
    const collectionPerms = await collectionPermissionService.getCollectionPermissions(
      orgId,
      collectionId,
      userId
    )

    // 4. Check SOURCE collection permissions for each touch-point being moved
    // This prevents users from "stealing" TPs from collections they don't have edit access to
    const canMoveIds: string[] = []
    const blocked: { id: string; reason: string }[] = []

    // Get user's EDIT_TOUCH_POINT scope once (for ownership checks)
    let editScope: RolePermissionScope | null = null
    try {
      editScope = await getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.EDIT_TOUCH_POINT)
    } catch {
      // User doesn't have EDIT_TOUCH_POINT permission at all
      editScope = null
    }

    for (const tpId of touchPointIds) {
      const tp = await touchPointRepo.getTouchPointById(orgId, tpId)

      // Block flagged links from being moved
      if (tp.safety_status === 'flagged') {
        blocked.push({ id: tpId, reason: 'safety_flagged' })
        continue
      }

      // Check if TP is being moved FROM another collection (not uncategorized, not same collection)
      if (tp.collection_id && tp.collection_id !== collectionId) {
        const sourcePerms = await collectionPermissionService.getCollectionPermissions(
          orgId,
          tp.collection_id,
          userId
        )

        // Check if user can move this TP from its source collection
        let canMoveFromSource = true

        if (!sourcePerms.canEditContent) {
          // User cannot edit content in source collection - check if they can move their OWN touch-points
          if (editScope === RolePermissionScope.OWN && tp.user_id !== userId) {
            canMoveFromSource = false
            blocked.push({ id: tpId, reason: 'no_permission_in_source_collection' })
          } else if (!editScope) {
            canMoveFromSource = false
            blocked.push({ id: tpId, reason: 'no_edit_permission' })
          }
        } else if (sourcePerms.source !== 'collection_member') {
          // User can edit content but is not a collection member (e.g., via org_permission=CAN_EDIT)
          // Still need to check ownership based on org-level EDIT_TOUCH_POINT scope
          if (editScope === RolePermissionScope.OWN && tp.user_id !== userId) {
            canMoveFromSource = false
            blocked.push({ id: tpId, reason: 'not_owner' })
          } else if (!editScope) {
            canMoveFromSource = false
            blocked.push({ id: tpId, reason: 'no_edit_permission' })
          }
        }
        // If user is a collection member with canEditContent in source, they can move any TP

        if (canMoveFromSource) {
          canMoveIds.push(tpId)
        }
      } else {
        // TP is uncategorized or already in target collection - no source check needed
        canMoveIds.push(tpId)
      }
    }

    // If no TPs can be moved, throw error with details
    if (canMoveIds.length === 0) {
      throw new ForbiddenError('You do not have permission to move any of the selected touch-points', {
        key: 'collection:errors.cannot_move_touchpoints',
      })
    }

    // 5. Check TARGET collection permissions for TPs that passed source check
    // canEditContent is true for: collection members with EDITOR/OWNER role, or org_permission=CAN_EDIT
    // canEditContent is false for: org_permission=CAN_VIEW (view-only access)
    const finalMoveIds: string[] = []

    if (!collectionPerms.canEditContent) {
      // User cannot edit content in target collection - check if they can add their OWN touch-points
      if (editScope === RolePermissionScope.OWN) {
        for (const tpId of canMoveIds) {
          const tp = await touchPointRepo.getTouchPointById(orgId, tpId)
          if (tp.user_id !== userId) {
            blocked.push({ id: tpId, reason: 'not_owner_for_target' })
          } else {
            finalMoveIds.push(tpId)
          }
        }
      } else if (editScope) {
        // User has ALL scope - can move all TPs that passed source check
        finalMoveIds.push(...canMoveIds)
      } else {
        // No EDIT_TOUCH_POINT permission - block all
        for (const tpId of canMoveIds) {
          blocked.push({ id: tpId, reason: 'no_edit_permission' })
        }
      }
    } else if (collectionPerms.source !== 'collection_member') {
      // User can edit content but is not a collection member (e.g., via org_permission=CAN_EDIT)
      // Check ownership based on org-level EDIT_TOUCH_POINT scope
      if (editScope === RolePermissionScope.OWN) {
        for (const tpId of canMoveIds) {
          const tp = await touchPointRepo.getTouchPointById(orgId, tpId)
          if (tp.user_id !== userId) {
            blocked.push({ id: tpId, reason: 'not_owner_for_target' })
          } else {
            finalMoveIds.push(tpId)
          }
        }
      } else if (editScope) {
        // User has ALL scope - can move all TPs
        finalMoveIds.push(...canMoveIds)
      } else {
        // No EDIT_TOUCH_POINT permission - block all
        for (const tpId of canMoveIds) {
          blocked.push({ id: tpId, reason: 'no_edit_permission' })
        }
      }
    } else {
      // User is a collection member with canEditContent - can add any touch-point
      finalMoveIds.push(...canMoveIds)
    }

    // If no TPs can be moved after target check, throw error
    if (finalMoveIds.length === 0) {
      throw new ForbiddenError('You do not have permission to move any of the selected touch-points', {
        key: 'collection:errors.cannot_move_touchpoints',
      })
    }

    // 6. Update touch-points to assign them to this collection
    const updated = await touchPointRepo.bulkUpdateCollection(finalMoveIds, collectionId)

    // 7. Log audit event (async, non-blocking)
    orgAuditLogService.logEvent({
      organization_id: orgId,
      user_id: userId,
      module: 'collection',
      action: 'add_touchpoints',
      target_id: collectionId,
      target_name: collection.name,
      target_table: 'collections',
      target_extra: null,
      changes: null,
      metadata: {
        touchpoint_ids: finalMoveIds,
        count: finalMoveIds.length,
        blocked_count: blocked.length,
      },
    })

    return {
      success: true,
      count: updated.length,
      touch_points: updated,
      blocked: blocked.length > 0 ? blocked : undefined,
    }
  }

  /**
   * Remove touch-points from a collection
   */
  async removeTouchPointsFromCollection(
    orgId: string,
    collectionId: string,
    touchPointIds: string[],
    userId: string
  ) {
    // 1. Check if user can remove touch-points from this collection
    // Note: This is different from editing collection metadata
    // Users with org_permission=CAN_EDIT can remove touch-points without being members
    await collectionPermissionService.ensureCanAddTouchPointsToCollection(orgId, collectionId, userId)

    // 2. Get collection data for audit log
    const collection = await this.repo.getCollectionById(orgId, collectionId)
    if (!collection) {
      throw new NotFoundError('Collection not found', { key: 'collection:errors.collection_not_found' })
    }

    // 3. Check if user has permission to remove these touch-points
    // Get user's permissions in this collection
    const collectionPerms = await collectionPermissionService.getCollectionPermissions(
      orgId,
      collectionId,
      userId
    )

    // 3. Batch-fetch all touch points once for permission + safety checks
    const tps = await touchPointRepo.findByIds(touchPointIds) as Array<{ id: string; user_id: string; safety_status: string | null }>
    const tpMap = new Map(tps.map((tp) => [tp.id, tp]))

    // 3.1. Block removal of flagged (frozen) touch-points
    for (const tp of tps) {
      if (tp.safety_status === 'flagged') {
        throw new ForbiddenError(
          'This link is frozen due to a safety violation and cannot be removed from this space.',
          { key: 'common:safety.flagged_frozen_notice' }
        )
      }
    }

    // 3.2. Check ownership if user doesn't have full edit access
    const needsOwnershipCheck =
      !collectionPerms.canEditContent || collectionPerms.source !== 'collection_member'

    if (needsOwnershipCheck) {
      const scope = await getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.EDIT_TOUCH_POINT)

      if (scope === RolePermissionScope.OWN) {
        for (const tpId of touchPointIds) {
          const tp = tpMap.get(tpId)
          if (tp && tp.user_id !== userId) {
            throw new ForbiddenError(
              'You can only remove your own touch-points from this collection',
              { key: 'collection:errors.can_only_remove_own_touchpoints' }
            )
          }
        }
      }
    }

    // 4. Remove touch-points from collection (set collection_id to null)
    const updated = await touchPointRepo.bulkUpdateCollection(touchPointIds, null)

    // 5. Log audit event (async, non-blocking)
    orgAuditLogService.logEvent({
      organization_id: orgId,
      user_id: userId,
      module: 'collection',
      action: 'remove_touchpoints',
      target_id: collectionId,
      target_name: collection.name,
      target_table: 'collections',
      target_extra: null,
      changes: null,
      metadata: {
        touchpoint_ids: touchPointIds,
        count: touchPointIds.length,
      },
    })

    return { success: true, count: updated.length }
  }

  /**
   * Get all touch-points in a collection
   */
  async getCollectionTouchPoints(
    orgId: string,
    collectionId: string,
    userId: string,
    queryParams?: any
  ) {
    // 1. Check if user can view this collection
    await collectionPermissionService.ensureCanView(orgId, collectionId, userId)

    // 2. Get touch-points with modifier for additional filtering
    const modifier = (q: any) => {
      if (queryParams?.search) {
        q = q.or(`name.ilike.%${queryParams.search}%,short_code.ilike.%${queryParams.search}%`)
      }

      if (queryParams?.sort_by) {
        const sortOrder = queryParams.sort_order || 'desc'
        q = q.order(queryParams.sort_by, { ascending: sortOrder === 'asc' })
      }

      return q
    }

    return touchPointRepo.findAllByCollection(orgId, collectionId, modifier)
  }

  /**
   * Move touch-point to a different collection
   */
  async moveTouchPointToCollection(
    orgId: string,
    touchPointId: string,
    targetCollectionId: string | null,
    userId: string
  ) {
    const touchPoint = await touchPointRepo.getTouchPointById(orgId, touchPointId)

    // 1. Check if user can move the touch-point from its current location
    if (touchPoint.collection_id) {
      // Touch-point is in a collection - check collection permissions
      const collectionPerms = await collectionPermissionService.getCollectionPermissions(
        orgId,
        touchPoint.collection_id,
        userId
      )

      // Check if user can edit content (touch-points) in this collection
      // canEditContent is true for: collection members with EDITOR/OWNER role, or org_permission=CAN_EDIT
      // canEditContent is false for: org_permission=CAN_VIEW (view-only access)
      // console.log('Collection perms for moving touch-point:', collectionPerms)
      // return;
      if (!collectionPerms.canEditContent) {
        // User cannot edit content in this collection - check if they can move their OWN touch-points
        const scope = await getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.EDIT_TOUCH_POINT)
        if (scope === RolePermissionScope.OWN && touchPoint.user_id !== userId) {
          throw new ForbiddenError('You can only move your own touch-points', { key: 'collection:errors.can_only_move_own_touchpoints' })
        }
        // Even if user owns the TP, they still need EDIT_TOUCH_POINT permission (which was checked above)
      } else if (collectionPerms.source !== 'collection_member') {
        // User can edit content but is not a collection member (e.g., via org_permission=CAN_EDIT)
        // Check ownership based on org-level EDIT_TOUCH_POINT scope
        const scope = await getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.EDIT_TOUCH_POINT)
        if (scope === RolePermissionScope.OWN && touchPoint.user_id !== userId) {
          throw new ForbiddenError('You can only move your own touch-points', { key: 'collection:errors.can_only_move_own_touchpoints' })
        }
      }
      // If user is a collection member with canEditContent, they can move any touch-point (no ownership check)
    } else {
      // Uncategorized touch-point: check org-level permission
      const scope = await getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.EDIT_TOUCH_POINT)
      if (scope === RolePermissionScope.OWN && touchPoint.user_id !== userId) {
        throw new ForbiddenError('You can only move your own touch-points', { key: 'collection:errors.can_only_move_own_touchpoints' })
      }
    }

    // 2. If moving to a collection, check if user can add touch-points to target collection
    if (targetCollectionId) {
      await collectionPermissionService.ensureCanAddTouchPointsToCollection(orgId, targetCollectionId, userId)
    }

    // 3. Move the touch-point
    const updated = await touchPointRepo.updateCollection(touchPointId, targetCollectionId)

    return updated
  }

  /**
   * Get statistics for a collection
   */
  async getCollectionStats(orgId: string, collectionId: string, userId: string) {
    await collectionPermissionService.ensureCanView(orgId, collectionId, userId)

    const collection = await this.repo.findByIdWithStats(orgId, collectionId)
    const members = await collectionMemberRepo.findAllByCollection(collectionId)

    return {
      id: collection.id,
      name: collection.name,
      touch_points_count: collection.touch_points_count,
      members_count: collection.members_count,
      org_permission: collection.org_permission,
      created_at: collection.created_at,
      members: members.map((m: any) => ({
        user_id: m.user_id,
        role: m.role,
        profile: m.profile,
      })),
    }
  }
}

// Singleton instance
export const collectionService = globalThis._collectionService ?? new CollectionService(collectionRepo)

if (process.env.NODE_ENV !== 'production') {
  globalThis._collectionService = collectionService
}
