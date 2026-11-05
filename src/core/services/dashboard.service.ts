import { BaseService } from './base.service'
import { DashboardRepository, dashboardRepo } from '../repositories/dashboard.repository'
import { dashboardMemberRepo } from '../repositories/dashboard-member.repository'
import { memberRepo } from '../repositories/member.repository'
import { dashboardPermissionService } from './dashboard-permission.service'
import { widgetDataService } from './widget-data.service'
import { ensureOrgMember } from '@/shared/lib/permission/permissions'
import { ensureOrgPlan } from '@/shared/lib/plan/plans'
import { ORG_PLAN_LIMIT_KEYS } from '@/shared/types/plan-permission'
import {
  AVAILABLE_DASHBOARD_TEMPLATES,
  WIDGET_TEMPLATES,
} from '@/ee/features/dashboards/constants/templates'
import { AVAILABLE_DATA_SOURCES } from '@/ee/features/dashboards/constants/data-source-config'
import { ForbiddenError } from '@/infrastructure/response/errors/domain.errors'
import { WIDGET_SIZE_MAP } from '@/ee/features/dashboards/types'
import type { WidgetConfig } from '@/ee/features/dashboards/types'
import type { CreateDashboardInput, UpdateDashboardInput, CreateWidgetInput, UpdateWidgetInput } from '@/shared/schemas/dashboards'
import type { UpdateAccessInput, AddMemberInput } from '@/shared/schemas/dashboard-members'

export class DashboardService extends BaseService<DashboardRepository> {
  constructor(repo: DashboardRepository) {
    super(repo)
  }

  async list(orgId: string, userId: string) {
    await ensureOrgMember(orgId)
    const [dashboards, pinnedIds] = await Promise.all([
      this.repo.findAccessible(orgId, userId),
      this.repo.getPinnedIds(userId),
    ])
    const pinnedSet = new Set(pinnedIds)
    const withPins = dashboards.map((d) => ({ ...d, is_pinned: pinnedSet.has(d.id) }))
    withPins.sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })
    return withPins
  }

  async getWithWidgets(orgId: string, dashboardId: string, userId: string) {
    const permission = await dashboardPermissionService.ensureViewer(orgId, dashboardId, userId)
    const dashboard = await this.repo.findByIdWithWidgets(orgId, dashboardId)
    return { ...dashboard, userRole: permission.role }
  }

  async create(orgId: string, userId: string, input: CreateDashboardInput) {
    await ensureOrgMember(orgId)
    await ensureOrgPlan(orgId, ORG_PLAN_LIMIT_KEYS.MAX_DASHBOARDS_PER_ORG)

    const dashboard = await this.repo.create({
      organization_id: orgId,
      created_by: userId,
      name: input.name,
      template_id: input.template_id ?? null,
    })

    if (input.template_id) {
      // packTemplateWidgets bypasses widgetConfigSchema, so the flag must be enforced here too
      const template = AVAILABLE_DASHBOARD_TEMPLATES.find((t) => t.id === input.template_id)
      if (template) {
        const widgetPayloads = this.packTemplateWidgets(dashboard.id, template.widget_ids)
        await this.repo.createWidgets(widgetPayloads)
      }
    }

    return this.repo.findByIdWithWidgets(orgId, dashboard.id)
  }

  async update(orgId: string, dashboardId: string, userId: string, input: UpdateDashboardInput) {
    await dashboardPermissionService.ensureEditor(orgId, dashboardId, userId)
    return this.repo.update(orgId, dashboardId, input)
  }

  async delete(orgId: string, dashboardId: string, userId: string) {
    await dashboardPermissionService.ensureOwner(orgId, dashboardId, userId)
    await this.repo.delete(orgId, dashboardId)
  }

  async duplicate(orgId: string, dashboardId: string, userId: string) {
    await dashboardPermissionService.ensureViewer(orgId, dashboardId, userId)
    const original = await this.repo.findByIdWithWidgets(orgId, dashboardId)

    await ensureOrgPlan(orgId, ORG_PLAN_LIMIT_KEYS.MAX_DASHBOARDS_PER_ORG)

    const copy = await this.repo.create({
      organization_id: orgId,
      created_by: userId,
      name: `${original.name} (copy)`,
      template_id: original.template_id,
    })

    await this.repo.createWidgets(
      original.dashboard_widgets.map((w) => ({
        dashboard_id: copy.id,
        name: w.name,
        widget_type: w.widget_type,
        config: w.config as Record<string, unknown>,
        formula_config: w.formula_config as Record<string, unknown> | null,
        position: w.position as Record<string, unknown>,
        date_override: w.date_override as Record<string, unknown> | null,
      }))
    )

    return this.repo.findByIdWithWidgets(orgId, copy.id)
  }

  async updateLayout(
    orgId: string,
    dashboardId: string,
    userId: string,
    positions: { widget_id: string; position: { x: number; y: number; w: number; h: number } }[]
  ) {
    await dashboardPermissionService.ensureEditor(orgId, dashboardId, userId)
    await this.repo.updatePositions(positions)
    return this.repo.findByIdWithWidgets(orgId, dashboardId)
  }

  // ── Access & Members ──

  async updateAccess(orgId: string, dashboardId: string, userId: string, input: UpdateAccessInput) {
    await dashboardPermissionService.ensureOwner(orgId, dashboardId, userId)
    const current = await this.repo.findById(orgId, dashboardId)

    // Destructive transitions: delete all member rows
    const needsCleanup =
      input.access_mode === 'only_me' ||
      (current?.access_mode === 'everyone' && input.access_mode === 'restricted')
    if (needsCleanup) {
      await dashboardMemberRepo.removeAllByDashboard(dashboardId)
    }

    return this.repo.update(orgId, dashboardId, {
      access_mode: input.access_mode,
      default_role: input.default_role,
    })
  }

  async getMembers(orgId: string, dashboardId: string, userId: string) {
    await dashboardPermissionService.ensureOwner(orgId, dashboardId, userId)
    return dashboardMemberRepo.findByDashboard(dashboardId)
  }

  async addMember(orgId: string, dashboardId: string, userId: string, input: AddMemberInput) {
    await dashboardPermissionService.ensureOwner(orgId, dashboardId, userId)

    const dashboard = await this.repo.findById(orgId, dashboardId)
    if (dashboard?.access_mode !== 'restricted') {
      throw new Error('Members can only be added in restricted mode')
    }
    if (input.user_id === dashboard.created_by) {
      throw new Error('Cannot add the dashboard owner as a member')
    }

    const isMember = await memberRepo.isMemberOfOrg(orgId, input.user_id)
    if (!isMember) {
      throw new Error('User is not a member of this organization')
    }

    return dashboardMemberRepo.addMember(dashboardId, input.user_id, input.role)
  }

  async updateMemberRole(orgId: string, dashboardId: string, memberId: string, userId: string, role: 'viewer' | 'editor') {
    await dashboardPermissionService.ensureOwner(orgId, dashboardId, userId)
    return dashboardMemberRepo.updateRole(memberId, dashboardId, role)
  }

  async removeMember(orgId: string, dashboardId: string, memberId: string, userId: string) {
    await dashboardPermissionService.ensureOwner(orgId, dashboardId, userId)
    await dashboardMemberRepo.remove(memberId, dashboardId)
  }

  async getOrgMembersForDashboard(orgId: string, dashboardId: string, userId: string) {
    await dashboardPermissionService.ensureOwner(orgId, dashboardId, userId)
    const members = await memberRepo.getByOrgId(orgId)
    return (members ?? [])
      .filter((m) => !m.is_bot)
      .map((m) => ({
        user_id: m.user_id,
      }))
  }

  async transferOwnership(orgId: string, dashboardId: string, userId: string, newOwnerId: string) {
    await dashboardPermissionService.ensureOwner(orgId, dashboardId, userId)

    if (newOwnerId === userId) {
      throw new Error('Cannot transfer ownership to yourself')
    }

    const isMember = await memberRepo.isMemberOfOrg(orgId, newOwnerId)
    if (!isMember) {
      throw new Error('User is not a member of this organization')
    }

    const current = await this.repo.findById(orgId, dashboardId)
    const accessMode = current?.access_mode

    await this.repo.update(orgId, dashboardId, { created_by: newOwnerId })

    if (accessMode === 'only_me') {
      // Private dashboard transfers entirely to the new owner — previous owner loses access.
      await dashboardMemberRepo.removeAllByDashboard(dashboardId)
    } else {
      await dashboardMemberRepo.removeByUserId(dashboardId, newOwnerId)
      try {
        await dashboardMemberRepo.addMember(dashboardId, userId, 'editor')
      } catch {
        // Ignore if already exists (UNIQUE constraint)
      }
    }

    return this.repo.findByIdWithWidgets(orgId, dashboardId)
  }

  // ── Widget CRUD ──

  async createWidget(orgId: string, dashboardId: string, userId: string, input: CreateWidgetInput) {
    await dashboardPermissionService.ensureEditor(orgId, dashboardId, userId)
    return this.repo.createWidget({
      dashboard_id: dashboardId,
      name: input.name,
      widget_type: input.widget_type,
      config: input.config,
      formula_config: input.formula_config ?? null,
      position: input.position,
      ...(input.date_override !== undefined ? { date_override: input.date_override } : {}),
    })
  }

  async updateWidget(
    orgId: string, dashboardId: string, widgetId: string, userId: string,
    input: UpdateWidgetInput,
  ) {
    await dashboardPermissionService.ensureEditor(orgId, dashboardId, userId)
    const updateData: Record<string, unknown> = {}
    if (input.name !== undefined) updateData.name = input.name
    if (input.widget_type !== undefined) updateData.widget_type = input.widget_type
    if (input.config !== undefined) updateData.config = input.config
    if (input.formula_config !== undefined) updateData.formula_config = input.formula_config
    if (input.position !== undefined) updateData.position = input.position
    if (input.date_override !== undefined) updateData.date_override = input.date_override
    return this.repo.updateWidget(widgetId, dashboardId, updateData)
  }

  async deleteWidget(orgId: string, dashboardId: string, widgetId: string, userId: string) {
    await dashboardPermissionService.ensureEditor(orgId, dashboardId, userId)
    await this.repo.deleteWidget(widgetId, dashboardId)
  }

  async getWidgetData(
    orgId: string, dashboardId: string, widgetId: string, userId: string,
    dateRange: { date_from: string; date_to: string },
  ) {
    await dashboardPermissionService.ensureViewer(orgId, dashboardId, userId)
    const widget = await this.repo.findWidget(widgetId, dashboardId)
    const config = widget.config as unknown as WidgetConfig

    // Stored config never passes through widgetConfigSchema again, so gate it here
    if (!AVAILABLE_DATA_SOURCES.includes(config.data_source)) {
      throw new ForbiddenError(`Data source '${config.data_source}' is disabled`)
    }

    return widgetDataService.execute(orgId, config, dateRange)
  }

  async togglePin(orgId: string, dashboardId: string, userId: string) {
    await ensureOrgMember(orgId)
    return this.repo.togglePin(dashboardId, userId)
  }

  /** 2-column grid packing: w=1 widgets side by side, w=2 on own row */
  private packTemplateWidgets(dashboardId: string, widgetIds: string[]) {
    const payloads: {
      dashboard_id: string; name: string; widget_type: string
      config: Record<string, unknown>; position: Record<string, unknown>
    }[] = []

    let y = 0
    let rowFilled = 0
    let rowHeight = 0

    for (const widgetId of widgetIds) {
      const wt = WIDGET_TEMPLATES.find((w) => w.id === widgetId)
      if (!wt) continue
      const size = WIDGET_SIZE_MAP[wt.config.size]

      if (size.w === 2) {
        if (rowFilled > 0) { y += rowHeight; rowFilled = 0; rowHeight = 0 }
        payloads.push({
          dashboard_id: dashboardId, name: wt.id, widget_type: 'standard',
          config: wt.config as unknown as Record<string, unknown>,
          position: { x: 0, y, w: 2, h: size.h },
        })
        y += size.h
      } else {
        if (rowFilled >= 2) { y += rowHeight; rowFilled = 0; rowHeight = 0 }
        payloads.push({
          dashboard_id: dashboardId, name: wt.id, widget_type: 'standard',
          config: wt.config as unknown as Record<string, unknown>,
          position: { x: rowFilled, y, w: 1, h: size.h },
        })
        rowFilled += 1
        rowHeight = Math.max(rowHeight, size.h)
      }
    }
    return payloads
  }
}

export const dashboardService =
  process.env.NODE_ENV !== 'production'
    ? new DashboardService(dashboardRepo)
    : (globalThis._dashboardService ??
      (globalThis._dashboardService = new DashboardService(dashboardRepo)))
