import { BaseService } from './base.service'
import {
  collectionMemberRepo,
  CollectionMemberRepository,
} from '../repositories/collection-member.repository'
import { collectionRepo } from '../repositories/collection.repository'
import { memberRepo } from '../repositories/member.repository'
import { collectionPermissionService } from './collection-permission.service'
import { orgAuditLogService } from './org-audit-log.service'
import {
  AddCollectionMemberDTO,
  AddCollectionMemberInput,
  CollectionRole,
  UpdateCollectionMemberDTO,
} from '@/shared/types/collection.types'
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '@/infrastructure/response/errors/domain.errors'
import { getObjectDiff } from '@/shared/lib/utils'
import { notificationService } from './notification.service'
import { NotificationType } from '../types/notification.type'
import { requestContext } from '@/shared/types/request'

export class CollectionMemberService extends BaseService<CollectionMemberRepository> {
  constructor(repo: CollectionMemberRepository) {
    super(repo)
  }

  /**
   * Get all members of a collection
   */
  async getCollectionMembers(orgId: string, collectionId: string, userId: string) {
    // Check if user can view the collection
    await collectionPermissionService.ensureCanView(orgId, collectionId, userId)

    const members = await this.repo.findAllByCollection(collectionId)

    return members
  }

  async systemGetCollectionMembers(collectionId: string) {
    const members = await this.repo.findAllByCollection(collectionId)
    return members
  }
  /**
   * Add a member to a collection
   */
  async addMember(
    orgId: string,
    collectionId: string,
    data: AddCollectionMemberInput,
    currentUserId: string
  ) {
    // 1. Check if current user can manage members
    await collectionPermissionService.ensureCanManageMembers(orgId, collectionId, currentUserId)

    // 2. Verify the collection exists
    const collection = await collectionRepo.getCollectionById(orgId, collectionId)
    if (!collection) {
      throw new NotFoundError('Collection not found', {
        key: 'collection:errors.collection_not_found',
      })
    }

    // 3. Verify the user to add is a member of the organization
    await collectionPermissionService.ensureOrgMember(orgId, data.user_id)

    // 4. Check if user is already a member
    const isAlreadyMember = await this.repo.isMember(collectionId, data.user_id)
    if (isAlreadyMember) {
      throw new BadRequestError('User is already a member of this collection', {
        key: 'collection:errors.user_already_member',
      })
    }

    // 5. Add the member
    const member = await this.repo.addMember({
      collection_id: collectionId,
      user_id: data.user_id,
      role: data.role,
      added_by: currentUserId,
    })

    // 6. Fetch and return member with profile data
    const members = await this.repo.findAllByCollection(collectionId)
    const newMember = members.find((m) => m.user_id === data.user_id)

    // 7. Log audit event (async, non-blocking)
    orgAuditLogService.logEvent({
      organization_id: orgId,
      user_id: currentUserId,
      module: 'collection_member',
      action: 'add',
      target_id: data.user_id,
      target_name: newMember?.profile?.name || data.user_id,
      target_table: 'collection_members',
      target_extra: newMember,
      changes: getObjectDiff({}, newMember || {}),
      metadata: {
        collection_id: collectionId,
        collection_name: collection.name,
        role: data.role,
        added_by: currentUserId,
      },
    })

    const currentUserEmail = requestContext.getStore()?.email!
    notificationService.createTypedNotification(NotificationType.USER_ADDED_TO_COLLECTION, {
      addedBy: currentUserEmail,
      userId: data.user_id,
      collectionId,
      collectionName: collection.name,
      organizationId: orgId,
    })

    return newMember
  }

  /**
   * Update a member's role
   */
  async updateMemberRole(
    orgId: string,
    collectionId: string,
    memberId: string,
    data: UpdateCollectionMemberDTO,
    currentUserId: string
  ) {
    // 1. Check if current user can manage members
    await collectionPermissionService.ensureCanManageMembers(orgId, collectionId, currentUserId)

    // 2. Get collection data
    const collection = await collectionRepo.getCollectionById(orgId, collectionId)
    if (!collection) {
      throw new NotFoundError('Collection not found', {
        key: 'collection:errors.collection_not_found',
      })
    }

    // 3. Get old member data for audit log
    const oldMemberRole = await this.repo.findMemberRole(collectionId, memberId)
    const members = await this.repo.findAllByCollection(collectionId)
    const oldMember = members.find((m) => m.user_id === memberId)

    if (!oldMember) {
      throw new NotFoundError('Member not found in this collection', {
        key: 'collection:errors.member_not_found',
      })
    }

    // 4. Prevent removing the last owner
    if (data.role !== CollectionRole.OWNER) {
      const owners = await this.repo.findOwners(collectionId)
      if (owners.length === 1 && owners[0].user_id === memberId) {
        throw new BadRequestError(
          'Cannot change role of the last owner. Add another owner first.',
          { key: 'collection:errors.cannot_change_last_owner_role' }
        )
      }
    }

    // 5. Prevent users from changing their own role
    if (memberId === currentUserId) {
      throw new BadRequestError('You cannot change your own role', {
        key: 'collection:errors.cannot_change_own_role',
      })
    }

    // 6. Update the role
    const updated = await this.repo.updateMemberRole(collectionId, memberId, data.role)

    // 7. Get updated member data
    const updatedMembers = await this.repo.findAllByCollection(collectionId)
    const updatedMember = updatedMembers.find((m) => m.user_id === memberId)

    // 8. Log audit event (async, non-blocking)
    orgAuditLogService.generateChangesAndLogEvent(
      {
        organization_id: orgId,
        user_id: currentUserId,
        module: 'collection_member',
        action: 'update_role',
        target_id: memberId,
        target_name: updatedMember?.profile?.name || memberId,
        target_table: 'collection_members',
        target_extra: updatedMember,
        metadata: {
          collection_id: collectionId,
          collection_name: collection.name,
          old_role: oldMemberRole,
          new_role: data.role,
        },
      },
      oldMember || {},
      updatedMember || {},
      {
        changeKeys: ['role'],
      }
    )

    return updated
  }

  /**
   * Remove a member from a collection
   */
  async removeMember(orgId: string, collectionId: string, memberId: string, currentUserId: string) {
    // 1. Check if current user can manage members
    await collectionPermissionService.ensureCanManageMembers(orgId, collectionId, currentUserId)

    // 2. Get collection data
    const collection = await collectionRepo.getCollectionById(orgId, collectionId)
    if (!collection) {
      throw new NotFoundError('Collection not found', {
        key: 'collection:errors.collection_not_found',
      })
    }

    // 3. Verify the member exists
    const existingMember = await this.repo.isMember(collectionId, memberId)
    if (!existingMember) {
      throw new NotFoundError('Member not found in this collection', {
        key: 'collection:errors.member_not_found',
      })
    }

    // 4. Get member data before removal for audit log
    const memberRole = await this.repo.findMemberRole(collectionId, memberId)
    const members = await this.repo.findAllByCollection(collectionId)
    const memberToRemove = members.find((m) => m.user_id === memberId)

    // 5. Prevent removing the last owner
    if (memberRole === CollectionRole.OWNER) {
      const owners = await this.repo.findOwners(collectionId)
      if (owners.length === 1) {
        throw new BadRequestError('Cannot remove the last owner from the collection', {
          key: 'collection:errors.cannot_remove_last_owner',
        })
      }
    }

    // 6. Prevent users from removing themselves (they should use a "leave collection" endpoint instead)
    if (memberId === currentUserId) {
      throw new BadRequestError(
        'You cannot remove yourself. Use the leave collection endpoint instead.',
        { key: 'collection:errors.cannot_remove_self' }
      )
    }

    // 7. Remove the member
    await this.repo.removeMember(collectionId, memberId)

    // 8. Log audit event (async, non-blocking)
    orgAuditLogService.logEvent({
      organization_id: orgId,
      user_id: currentUserId,
      module: 'collection_member',
      action: 'remove',
      target_id: memberId,
      target_name: memberToRemove?.profile?.name || memberId,
      target_table: 'collection_members',
      target_extra: memberToRemove,
      changes: null,
      metadata: {
        collection_id: collectionId,
        collection_name: collection.name,
        role: memberRole,
        removed_by: currentUserId,
      },
    })
    const currentUserEmail = requestContext.getStore()?.email!
    notificationService.createTypedNotification(NotificationType.USER_REMOVED_FROM_COLLECTION, {
      removedBy: currentUserEmail,
      userId: memberId,
      collectionName: collection.name,
      organizationId: orgId,
    })

    return { success: true, message: 'Member removed successfully' }
  }

  /**
   * Allow a user to leave a collection
   */
  async leaveCollection(orgId: string, collectionId: string, userId: string) {
    // 1. Verify user is a member
    const isMember = await this.repo.isMember(collectionId, userId)
    if (!isMember) {
      throw new BadRequestError('You are not a member of this collection', {
        key: 'collection:errors.not_a_member',
      })
    }

    // 2. Check if user is the collection creator
    const collection = await collectionRepo.getCollectionById(orgId, collectionId)
    if (collection?.user_id === userId) {
      throw new BadRequestError('Collection creator cannot leave. Delete the collection instead.', {
        key: 'collection:errors.creator_cannot_leave',
      })
    }

    // 3. Prevent last owner from leaving
    const memberRole = await this.repo.findMemberRole(collectionId, userId)
    if (memberRole === CollectionRole.OWNER) {
      const owners = await this.repo.findOwners(collectionId)
      if (owners.length === 1) {
        throw new BadRequestError('You are the last owner. Transfer ownership before leaving.', {
          key: 'collection:errors.last_owner_cannot_leave',
        })
      }
    }

    // 4. Remove the member
    await this.repo.removeMember(collectionId, userId)

    return { success: true, message: 'Successfully left the collection' }
  }

  /**
   * Bulk add members to a collection
   */
  async bulkAddMembers(
    orgId: string,
    collectionId: string,
    members: AddCollectionMemberInput[],
    currentUserId: string
  ) {
    // 1. Check if current user can manage members
    await collectionPermissionService.ensureCanManageMembers(orgId, collectionId, currentUserId)

    // 2. Verify the collection exists
    const collection = await collectionRepo.getCollectionById(orgId, collectionId)
    if (!collection) {
      throw new NotFoundError('Collection not found', {
        key: 'collection:errors.collection_not_found',
      })
    }

    // 3. Verify all users are org members
    for (const member of members) {
      await collectionPermissionService.ensureOrgMember(orgId, member.user_id)
    }

    // 4. Filter out users who are already members
    const existingMembers = await this.repo.findAllByCollection(collectionId)
    const existingUserIds = new Set(existingMembers.map((m) => m.user_id))
    const newMembers = members.filter((m) => !existingUserIds.has(m.user_id))

    if (newMembers.length === 0) {
      return { success: true, added: 0, message: 'All users are already members' }
    }

    // 5. Add all new members
    await this.repo.bulkAddMembers(
      newMembers.map((m) => ({
        collection_id: collectionId,
        user_id: m.user_id,
        role: m.role,
        added_by: currentUserId,
      }))
    )

    // 6. Log audit event
    const memberIds = newMembers.map((m) => m.user_id)
    const rolesMap = Object.fromEntries(newMembers.map((m) => [m.user_id, m.role]))

    // Log audit event (async, non-blocking)
    orgAuditLogService.logEvent({
      organization_id: orgId,
      user_id: currentUserId,
      module: 'collection_member',
      action: 'bulk_add',
      target_id: collectionId,
      target_name: collection.name,
      target_table: 'collection_members',
      target_extra: null,
      changes: null,
      metadata: {
        collection_id: collectionId,
        collection_name: collection.name,
        members_added: newMembers.length,
        member_ids: memberIds,
        roles: rolesMap,
        bulk_operation: true,
      },
    })

    return { success: true, added: newMembers.length }
  }

  /**
   * Get member's role in a collection
   */
  async getMemberRole(collectionId: string, userId: string) {
    const role = await this.repo.findMemberRole(collectionId, userId)
    return role
  }

  /**
   * Check if user has specific role(s) in collection
   */
  async hasMemberWithRole(
    collectionId: string,
    userId: string,
    roles: CollectionRole[]
  ): Promise<boolean> {
    return this.repo.hasMemberWithRole(collectionId, userId, roles)
  }

  /**
   * Transfer ownership to another member
   */
  async transferOwnership(
    orgId: string,
    collectionId: string,
    newOwnerId: string,
    currentUserId: string
  ) {
    // 1. Verify current user is the collection creator or an owner
    const collection = await collectionRepo.getCollectionById(orgId, collectionId)
    if (!collection) {
      throw new NotFoundError('Collection not found', {
        key: 'collection:errors.collection_not_found',
      })
    }

    const currentUserRole = await this.repo.findMemberRole(collectionId, currentUserId)
    const isCreator = collection.user_id === currentUserId
    const isOwner = currentUserRole === CollectionRole.OWNER

    if (!isCreator && !isOwner) {
      throw new ForbiddenError('Only owners can transfer ownership', {
        key: 'collection:errors.only_owners_can_transfer',
      })
    }

    // 2. Verify new owner is a member
    const newOwnerIsMember = await this.repo.isMember(collectionId, newOwnerId)
    if (!newOwnerIsMember) {
      throw new BadRequestError('New owner must be a member of the collection first', {
        key: 'collection:errors.new_owner_must_be_member',
      })
    }

    // 3. Update new owner's role to OWNER
    await this.repo.updateMemberRole(collectionId, newOwnerId, CollectionRole.OWNER)

    // 4. If current user is not the creator, demote them to EDITOR
    if (!isCreator) {
      await this.repo.updateMemberRole(collectionId, currentUserId, CollectionRole.EDITOR)
    }

    return { success: true, message: 'Ownership transferred successfully' }
  }
}

// Singleton instance
export const collectionMemberService =
  globalThis._collectionMemberService ?? new CollectionMemberService(collectionMemberRepo)

if (process.env.NODE_ENV !== 'production') {
  globalThis._collectionMemberService = collectionMemberService
}
