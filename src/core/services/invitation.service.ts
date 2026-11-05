import { BaseService } from './base.service'
import { invitationRepo, InvitationRepository } from '../repositories/invitation.repository'
import { ensureAnyPolicy, ensureOrgMember, ensurePolicy } from '@/shared/lib/permission/permissions'
import { nonScopePolicies, policies } from '@/shared/lib/permission/policy'
import { PLAN_LIMIT_KEYS } from '@/shared/types/plan-permission'
import { ensureOrgPlan } from '@/shared/lib/plan/plans'
import { requestContext } from '@/shared/types/request'
import { memberService } from './member.service'
import { BadRequestError, NotFoundError } from '@/infrastructure/response/errors/domain.errors'
import { organizationService } from './organization.service'
import { getRequestOrigin } from '@/shared/lib/server-utils'
import { serverDayjs } from '@/shared/utils/server/get-server-dayjs'
import { redis } from '@/infrastructure/cache/redis'
import { Invitation, InvitationStatus } from '../types/invitation.type'
import dayjs from 'dayjs'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { initServerI18n } from '@/shared/lib/i18n/i18n-server'
import { profileService } from './profile.service'
import { notificationService } from './notification.service'
import { NotificationType } from '../types/notification.type'
import { orgAuditLogService } from './org-audit-log.service'

export class InvitationService extends BaseService<InvitationRepository> {
  constructor(repo: InvitationRepository) {
    super(repo)
  }

  /**
   * Get all invitations for an organization
   * Requires either view_members or manage_members permission
   * @param orgId - Organization ID
   * @returns Array of pending invitations
   */
  async getByOrgId(orgId: string) {
    await ensureAnyPolicy(orgId, [nonScopePolicies.view_members, nonScopePolicies.manage_members])

    const invitations = await this.repo.getByOrgId(orgId)
    return invitations
  }

  /**
   * Find an invitation by its unique token
   * Public method - no permission check required
   * @param token - Unique invitation token
   * @returns Invitation with organization and inviter details, or null if not found
   */
  async findByToken(token: string) {
    const invitation = await this.repo.findByToken(token)
    return invitation
  }

  /**
   * Update the role assigned to an invitation
   * Requires manage_members permission
   * @param orgId - Organization ID
   * @param id - Invitation ID
   * @param role_id - New role ID to assign
   */
  async updateInvitationRole(orgId: string, id: string, role_id: string) {
    await ensurePolicy(orgId, nonScopePolicies.manage_members)

    const old = await this.repo.findById(id)
    if (!old) throw new NotFoundError('Invitation not found')

    const updated = await this.repo.updateOne(id, orgId, { role_id })

    orgAuditLogService.generateChangesAndLogEvent(
      {
        organization_id: updated.org_id,
        action: 'update',
        module: 'invitation',
        target_id: updated.id,
        target_name: updated.email,
        target_table: 'org_invitations',
      },
      { role_id: old.role_id },
      { role_id: updated.role_id }
    )
  }

  /**
   * Accept an invitation and add the user as an organization member
   * Validates invitation status, expiration, and adds user to organization
   * Deletes the invitation after successful acceptance
   * @param token - Unique invitation token
   * @throws BadRequestError if invitation not found, already accepted, or expired
   */
  async acceptInvitation(token: string) {
    const invitation = await this.findByToken(token)
    if (!invitation) {
      throw new BadRequestError('Invitation not found')
    }
    if (invitation.status !== InvitationStatus.INVITED) {
      throw new BadRequestError('Invalid invitation')
    }
    if (invitation.expired_at < new Date().toISOString()) {
      throw new BadRequestError('Invitation expired')
    }

    const userId = requestContext.getStore()!.userId!

    await memberService.addOrgMember(
      invitation.org_id.id,
      userId,
      invitation.role_id,
      invitation.invite_by.id
    )

    await this.repo.deleteOne(invitation.id, invitation.org_id.id)
  }

  /**
   * Resend an invitation by extending its expiration date and sending a new email
   * Requires manage_members permission
   * Rate limited to once per 60 seconds per invitation
   * @param orgId - Organization ID
   * @param id - Invitation ID
   * @param days - Number of days to extend the invitation validity
   * @throws BadRequestError if invitation not found or rate limit exceeded
   */
  async updateInvitationExpiredAt(orgId: string, id: string, days: number) {
    await ensurePolicy(orgId, nonScopePolicies.manage_members)
    const invitation = await this.repo.findById(id)
    if (!invitation) {
      throw new BadRequestError('Invitation not found')
    }

    // Check if invitation was resent within the last 60 seconds (rate limiting)
    if (invitation.resent_at) {
      const now = dayjs()
      const resentAt = dayjs(invitation.resent_at)
      const secondsSinceResent = now.diff(resentAt, 'second')

      if (secondsSinceResent < 60) {
        const remainingSeconds = 60 - secondsSinceResent
        throw new BadRequestError(
          `Please wait ${remainingSeconds} seconds before resending the invitation.`,
          {
            key: 'common:messages.error.invitation_resend_rate_limit',
            params: {
              remainingSeconds,
            },
          }
        )
      }
    }

    const updated = await this.repo.updateOne(id, orgId, {
      expired_at: dayjs().add(days, 'day').toISOString(),
      resent_at: dayjs().toISOString(),
    })
    this.sendInvitationNotification(invitation)

    orgAuditLogService.generateChangesAndLogEvent(
      {
        organization_id: orgId,
        action: 'update',
        module: 'invitation',
        target_id: invitation.id,
        target_name: invitation.email,
        target_table: 'org_invitations',
      },
      invitation,
      updated
    )
  }

  /**
   * Send a new invitation to join an organization
   * Requires manage_members permission
   * Validates plan limits and checks for existing members
   * Creates invitation with 7-day expiration and sends email
   * @param orgId - Organization ID
   * @param email - Email address to invite
   * @param role_id - Role ID to assign to the invited user
   * @throws BadRequestError if role_id missing, user already a member, or plan limit reached
   */
  async sendInvitation(orgId: string, email: string, role_id: string) {
    if (!role_id) throw new BadRequestError('Role id is required')

    await ensurePolicy(orgId, nonScopePolicies.manage_members)
    await ensureOrgPlan(orgId, PLAN_LIMIT_KEYS.MAX_MEMBERS_PER_ORG)

    const existingMember = await memberService.findByEmail(email, orgId)
    if (existingMember) {
      throw new BadRequestError('User is already a member', {
        key: 'common.messages.error.user_already_member',
      })
    }

    const user = requestContext.getStore()!

    const invitationData = {
      email,
      org_id: orgId,
      expired_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      invite_by: user.userId!,
      role_id,
      token: crypto.randomUUID(),
    }
    const invitation = await this.repo.createOrUpdate(invitationData)

    orgAuditLogService.generateChangesAndLogEvent(
      {
        organization_id: orgId,
        action: 'create',
        module: 'invitation',
        target_id: invitation.id,
        target_name: invitation.email,
        target_table: 'org_invitations',
      },
      {},
      invitation
    )

    await this.sendInvitationNotification(invitation)
  }

  /**
   * Send invitation email via Redis queue
   * Private method - queues email for async processing
   * @param invitation - Invitation record to send email for
   * @throws BadRequestError if organization not found
   */
  private async sendInvitationNotification(invitation: Invitation) {
    const organization = await organizationService.getOrgById(invitation.org_id)
    if (!organization) {
      throw new BadRequestError('Organization not found')
    }

    const inviteBy = requestContext.getStore()!.email!
    const existingUser = await profileService.getProfileByEmail(invitation.email)
    if (existingUser) {
      await notificationService.createTypedNotification(NotificationType.INVITATION_RECEIVED, {
        orgId: invitation.org_id,
        orgName: organization.name,
        inviteBy: invitation.invite_by,
        inviteAt: invitation.created_at,
        inviteToken: invitation.token,
        userId: existingUser.id,
      })
    }

    const url = await getRequestOrigin()
    const mailValue = {
      Sender: inviteBy, // sender_email
      Recipient: invitation.email, // recipient_email
      OrgName: organization.name, // organization_name
      InvitationUrl: `${url}/invitation/` + invitation.token,
      ExpiresAt: serverDayjs(invitation.expired_at).format('DD MMM YYYY HH:mm:ss'),
    }

    const i18nServer = await initServerI18n()
    const emailKey =
      i18nServer.i18nInstance.language === 'vi'
        ? 'org:members:invitation_vi'
        : 'org:members:invitation'

    await redis.rpush(
      'email:send',
      JSON.stringify({
        key: emailKey,
        to: invitation.email,
        value: mailValue,
        subject_value: [inviteBy],
      })
    )
  }

  /**
   * Delete multiple invitations in bulk
   * Requires manage_members permission
   * @param orgId - Organization ID
   * @param ids - Array of invitation IDs to delete
   */
  async deleteInvitations(orgId: string, ids: string[]) {
    await ensurePolicy(orgId, nonScopePolicies.manage_members)
    const deleted = await this.repo.deleteMany(ids, orgId)
    for (const invitation of deleted) {
      orgAuditLogService.generateChangesAndLogEvent(
        {
          organization_id: orgId,
          action: 'delete',
          module: 'invitation',
          target_id: invitation.id,
          target_name: invitation.email,
          target_table: 'org_invitations',
        },
        invitation,
        {}
      )
    }
  }

  /**
   * Delete a single invitation
   * Requires manage_members permission
   * @param orgId - Organization ID
   * @param id - Invitation ID to delete
   */
  async deleteInvitation(orgId: string, id: string) {
    await ensurePolicy(orgId, nonScopePolicies.manage_members)
    const deleted = await this.repo.deleteOne(id, orgId)

    orgAuditLogService.generateChangesAndLogEvent(
      {
        organization_id: orgId,
        action: 'delete',
        module: 'invitation',
        target_id: deleted.id,
        target_name: deleted.email,
        target_table: 'org_invitations',
      },
      deleted,
      {}
    )
  }
}

export const invitationService =
  process.env.NODE_ENV !== 'production'
    ? new InvitationService(invitationRepo)
    : globalThis._invitationService ??
      (globalThis._invitationService = new InvitationService(invitationRepo))
