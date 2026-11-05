import { DashboardMemberRepository, dashboardMemberRepo } from '../repositories/dashboard-member.repository'
import { DashboardRepository, dashboardRepo } from '../repositories/dashboard.repository'
import { ensureOrgMember } from '@/shared/lib/permission/permissions'
import { ForbiddenError } from '@/infrastructure/response/errors/domain.errors'
import type { DashboardRole } from '@/ee/features/dashboards/types'

export type DashboardRoleSource = 'owner' | 'member' | 'everyone'

export interface DashboardPermissionResult {
  role: DashboardRole
  source: DashboardRoleSource
  canView: boolean
  canEdit: boolean
  canManage: boolean
}

export class DashboardPermissionService {
  constructor(
    private dashboardRepository: DashboardRepository,
    private memberRepository: DashboardMemberRepository,
  ) {}

  /**
   * Resolve the effective role for a user on a dashboard.
   *
   * Priority chain:
   * 1. Owner (dashboards.created_by === userId)
   * 2. Explicit member (dashboard_members row) — ONLY in restricted mode
   * 3. Everyone mode (access_mode === 'everyone' + org member)
   * 4. Denied
   */
  async resolveRole(orgId: string, dashboardId: string, userId: string): Promise<DashboardPermissionResult> {
    await ensureOrgMember(orgId)

    const dashboard = await this.dashboardRepository.findById(orgId, dashboardId)
    if (!dashboard) {
      throw new ForbiddenError('Dashboard not found', {
        key: 'dashboards:errors.not_found',
      })
    }

    // 1. Owner check
    if (dashboard.created_by === userId) {
      return this.permissionsForRole('owner', 'owner')
    }

    // 2. Explicit member check — ONLY in restricted mode.
    //    In 'only_me' mode, stale member rows must NOT grant access.
    //    In 'everyone' mode, member rows are "no longer relevant" — everyone gets default_role.
    if (dashboard.access_mode === 'restricted') {
      const memberRole = await this.memberRepository.findMemberRole(dashboardId, userId)
      if (memberRole) {
        return this.permissionsForRole(memberRole, 'member')
      }
    }

    // 3. Everyone mode — all org members get default_role
    if (dashboard.access_mode === 'everyone') {
      const everyoneRole = dashboard.default_role as 'viewer' | 'editor'
      return this.permissionsForRole(everyoneRole, 'everyone')
    }

    // 4. No access
    throw new ForbiddenError('You do not have access to this dashboard', {
      key: 'dashboards:errors.no_access',
    })
  }

  /** Throws if user does not have at least viewer access */
  async ensureViewer(orgId: string, dashboardId: string, userId: string): Promise<DashboardPermissionResult> {
    return this.resolveRole(orgId, dashboardId, userId)
  }

  /** Throws if user is not editor or owner */
  async ensureEditor(orgId: string, dashboardId: string, userId: string): Promise<DashboardPermissionResult> {
    const result = await this.resolveRole(orgId, dashboardId, userId)
    if (!result.canEdit) {
      throw new ForbiddenError('You do not have permission to edit this dashboard', {
        key: 'dashboards:errors.cannot_edit',
      })
    }
    return result
  }

  /** Throws if user is not the owner */
  async ensureOwner(orgId: string, dashboardId: string, userId: string): Promise<DashboardPermissionResult> {
    const result = await this.resolveRole(orgId, dashboardId, userId)
    if (!result.canManage) {
      throw new ForbiddenError('Only the dashboard owner can perform this action', {
        key: 'dashboards:errors.owner_only',
      })
    }
    return result
  }

  private permissionsForRole(role: DashboardRole, source: DashboardRoleSource): DashboardPermissionResult {
    switch (role) {
      case 'owner':
        return { role, source, canView: true, canEdit: true, canManage: true }
      case 'editor':
        return { role, source, canView: true, canEdit: true, canManage: false }
      case 'viewer':
        return { role, source, canView: true, canEdit: false, canManage: false }
    }
  }
}

export const dashboardPermissionService =
  process.env.NODE_ENV !== 'production'
    ? new DashboardPermissionService(dashboardRepo, dashboardMemberRepo)
    : (globalThis._dashboardPermissionService ??
      (globalThis._dashboardPermissionService = new DashboardPermissionService(dashboardRepo, dashboardMemberRepo)))
