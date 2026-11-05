import { BaseService } from './base.service'
import { memberRepo, MemberRepository } from '../repositories/member.repository'
import { ensureOrgPlan } from '@/shared/lib/plan/plans'
import { PLAN_LIMIT_KEYS } from '@/shared/types/plan-permission'
import { ensureOrgMember, ensurePolicy } from '@/shared/lib/permission/permissions'
import { nonScopePolicies } from '@/shared/lib/permission/policy'
import { redis } from '@/infrastructure/cache/redis'
import { orgAuditLogService } from './org-audit-log.service'
import { BadRequestError, UnauthorizedError } from '@/infrastructure/response/errors/domain.errors'
import { requestContext } from '@/shared/types/request'
import { organizationService } from './organization.service'
import { REDIS_KEYS } from '@/infrastructure/cache/redis/key'

export class MemberService extends BaseService<MemberRepository> {
  constructor(repo: MemberRepository) {
    super(repo)
  }

  /**
   * Find a member by email within an organization
   * @param email - User's email address
   * @param orgId - Organization ID
   * @returns Member record or null if not found
   */
  async findByEmail(email: string, orgId: string) {
    return this.repo.findByEmail(email, orgId)
  }

  async isOrgOwner(orgId: string, userId: string) {
    const key = REDIS_KEYS.USER.IS_ORG_OWNER(userId, orgId)

    const cached = await redis.get(key)
    if (cached) return cached === '1'

    const isOwner = await this.repo.isOrganizationOwner(orgId, userId)

    await redis.set(key, isOwner ? '1' : '0', 'EX', 60)

    return isOwner
  }

  /**
   * Get all members of an organization
   * Requires either manage_members or view_members permission
   * @param orgId - Organization ID
   * @returns Array of organization members with user and role details
   */
  async getByOrgId(orgId: string) {
    await ensureOrgMember(orgId)
    return this.repo.getByOrgId(orgId)
  }
  async systemGetByOrgId(orgId: string) {
    return this.repo.getByOrgId(orgId)
  }

  /**
   * Add a new member to an organization (internal system use only)
   * Called when a user accepts an invitation - permissions are checked at invitation level
   * Validates plan limits and invalidates permission cache
   * @param orgId - Organization ID
   * @param userId - User ID to add as member
   * @param roleId - Role ID to assign to the member
   * @param inviteBy - Optional user ID of who invited this member
   * @returns Created or updated member record
   */
  async addOrgMember(orgId: string, userId: string, roleId: string, inviteBy?: string) {
    await ensureOrgPlan(orgId, PLAN_LIMIT_KEYS.MAX_MEMBERS_PER_ORG)

    const member = await this.repo.createOrUpdate({
      org_id: orgId,
      user_id: userId,
      role_id: roleId,
      invite_by: inviteBy ?? null,
    })
    await redis.del(`user:${member.user_id}:permissions:org:${orgId}`)

    orgAuditLogService.generateChangesAndLogEvent(
      {
        organization_id: member.org_id,
        action: 'create',
        module: 'member',
        user_id: inviteBy,
        target_id: member.id,
        target_name: member.user_id,
        target_table: 'org_members',
      },
      {},
      member
    )

    return member
  }

  /**
   * Update a member's role within an organization
   * Requires manage_members permission
   * Invalidates the member's permission cache after update
   * @param id - Member record ID
   * @param orgId - Organization ID
   * @param roleId - New role ID to assign
   * @returns Updated member record
   */
  async updateMemberRole(id: string, orgId: string, roleId: string) {
    await ensurePolicy(orgId, nonScopePolicies.manage_members)

    const userId = requestContext.getStore()?.userId
    const old = await this.repo.findById(id)

    if (!old) {
      throw new BadRequestError('Member not found')
    }

    const org = await organizationService.getOrgById(orgId)

    //Cant change role of org owner
    if (!org || org.user_id === old.user_id) {
      throw new BadRequestError()
    }

    const member = await this.repo.updateById(id, orgId, { role_id: roleId })

    await redis.del(`user:${member.user_id}:permissions:org:${orgId}`)

    orgAuditLogService.generateChangesAndLogEvent(
      {
        organization_id: member.org_id,
        action: 'update',
        module: 'member',
        user_id: userId,
        target_id: member.id,
        target_name: member.user_id,
        target_table: 'org_members',
      },
      { role_id: old.role_id },
      { role_id: roleId }
    )

    return member
  }

  /**
   * Remove a member from an organization
   * Requires manage_members permission
   * Invalidates the member's permission cache after deletion
   * @param id - Member record ID
   * @param orgId - Organization ID
   * @returns Deleted member record
   */
  async deleteById(id: string, orgId: string) {
    const member = await this.repo.findById(id)
    if (!member) {
      throw new BadRequestError('Member not found')
    }

    const org = await organizationService.getOrgById(orgId)

    //Cant delete org owner
    if (!org || org.user_id === member.user_id) {
      throw new BadRequestError()
    }

    await ensurePolicy(orgId, nonScopePolicies.manage_members)
    const deletedMember = await this.repo.deleteById(id, orgId)
    await redis.del(`user:${deletedMember.user_id}:permissions:org:${orgId}`)
    const userId = requestContext.getStore()?.userId

    orgAuditLogService.generateChangesAndLogEvent(
      {
        organization_id: member.org_id,
        action: 'delete',
        module: 'member',
        user_id: userId,
        target_id: member.id,
        target_name: member.user_id,
        target_table: 'org_members',
      },
      member,
      {}
    )

    return member
  }

  async leaveOrganization(orgId: string) {
    const userId = requestContext.getStore()?.userId
    if (!userId) throw new UnauthorizedError()

    const org = await organizationService.getOrgById(orgId)
    if (!org || org.user_id === userId)
      throw new BadRequestError('Organization owner cannot leave the organization')

    const deleted = await this.repo.deleteByUserId(orgId, userId)
    await redis.del(`user:${userId}:permissions:org:${orgId}`)

    orgAuditLogService.generateChangesAndLogEvent(
      {
        organization_id: orgId,
        action: 'delete',
        module: 'member',
        user_id: userId,
        target_id: deleted.id,
        target_name: userId,
        target_table: 'org_members',
      },
      deleted,
      {}
    )

    return deleted
  }
}

export const memberService =
  process.env.NODE_ENV !== 'production'
    ? new MemberService(memberRepo)
    : (globalThis._memberService ?? (globalThis._memberService = new MemberService(memberRepo)))
