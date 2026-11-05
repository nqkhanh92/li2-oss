// import { ensureOrgPlan } from '@/shared/lib/plan/plans'
// import { ensurePolicy, getPermissionScopeOrThrow } from '@/shared/lib/permission/permissions'
// import { nonScopePolicies, policies } from '@/shared/lib/permission/policy'
// import { PLAN_LIMIT_KEYS } from '@/shared/types/plan-permission'
import { utmTemplateRepo, UTMTemplateRepository } from '../repositories/utm-template.repository'
import { BaseService } from './base.service'
import { CreateUTMTemplate, UpdateUTMTemplate } from '@/shared/schemas/utm-templates'
import { Tables } from '@/shared/types/database.types'
import { RolePermissionScope } from '@/shared/types/role-permission'
import { PostgrestFilterBuilder } from '@supabase/postgrest-js'
import { SearchFilterPagination } from '@/shared/types'
import { queryBuilderByParams } from '@/shared/lib/utils'
import { orgAuditLogService } from './org-audit-log.service'

type UTMTemplate = Tables<'utm_templates'>

export class UTMTemplateService extends BaseService<UTMTemplateRepository> {
  constructor(repo: UTMTemplateRepository) {
    super(repo)
  }

  async getTemplatesByOrg(
    orgId: string,
    options?: { scope?: RolePermissionScope; userId?: string; queryParams: SearchFilterPagination }
  ) {
    const { scope, userId, queryParams } = options ?? {}
    const modifier = (query: PostgrestFilterBuilder<any, any, any>) => {
      if (queryParams) {
        query = queryBuilderByParams(query, queryParams)
        if (queryParams.search) {
          query = query.ilike('name', `%${queryParams.search}%`)
        }
      }
      if (scope === RolePermissionScope.OWN && userId) {
        query = query.eq('created_by', userId)
      }
      return query
    }

    return this.repo.findByOrgId(orgId, modifier)
  }

  async getTemplateById(id: string): Promise<UTMTemplate | null> {
    return this.repo.findById(id)
  }

  async createTemplate(
    orgId: string,
    data: CreateUTMTemplate,
    options?: { scope?: RolePermissionScope; userId?: string }
  ): Promise<UTMTemplate> {
    // Check plan limit
    // await ensureOrgPlan(orgId, PLAN_LIMIT_KEYS.MAX_UTM_TEMPLATES_PER_ORG, {
    //   errorMessage:
    //     'Organization has reached the maximum number of UTM templates allowed by its plan',
    // })

    // // Check permissions
    // await ensurePolicy(orgId, nonScopePolicies.add_utm_template)

    const { userId } = options ?? {}

    if (data.name) {
      // Check for duplicate name in org
      const existing = await this.repo.findByOrgIdAndName(orgId, data.name)
      if (existing) {
        throw new Error('A template with this name already exists in the organization')
      }
    }

    // const modifier = (q: PostgrestFilterBuilder<any, any, any>) => {
    //   if (scope === RolePermissionScope.OWN && userId) {
    //     q = q.eq('user_id', userId)
    //   }
    //   return q
    // }

    if (!userId) {
      throw new Error('User ID missing')
    }

    const created = await this.repo.createForOrg(orgId, data, userId)
    orgAuditLogService.generateChangesAndLogEvent(
      {
        organization_id: orgId,
        action: 'create',
        module: 'utm_template',
        target_id: created.id,
        target_name: created.name,
        user_id: userId,
        target_table: 'utm_templates',
      },
      {},
      created
    )

    return created
  }

  async updateTemplate(
    orgId: string,
    id: string,
    data: UpdateUTMTemplate,
    options?: { scope?: RolePermissionScope; userId?: string }
  ): Promise<UTMTemplate> {
    // Check permissions
    // NOTEs: Permission check is done in the route handler
    // const scope = await getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.EDIT_UTM_TEMPLATE)

    const { scope, userId } = options ?? {}

    let old: UTMTemplate | null = null
    // If name is being updated, check for duplicates
    if (data.name) {
      const existing = await this.repo.findByOrgIdAndName(orgId, data.name)
      if (existing && existing.id !== id) {
        throw new Error('A template with this name already exists in the organization')
      } else if (existing && existing.id === id) {
        old = existing
      }
    }

    const modifier = (q: PostgrestFilterBuilder<any, any, any>) => {
      if (scope === RolePermissionScope.OWN && userId) {
        q = q.eq('created_by', userId)
      }
      return q
    }
    const updated = await this.repo.updateInOrg(id, orgId, data, modifier)
    if (old && updated) {
      orgAuditLogService.generateChangesAndLogEvent(
        {
          organization_id: orgId,
          action: 'update',
          module: 'utm_template',
          target_id: updated.id,
          target_name: updated.name,
          target_table: 'utm_templates',
          user_id: userId,
        },
        old,
        updated
      )
    }

    return updated
  }

  async deleteTemplates(
    orgId: string,
    ids: string[],
    options?: { scope?: RolePermissionScope; userId?: string }
  ) {
    const { scope, userId } = options ?? {}
    const modifier = (q: PostgrestFilterBuilder<any, any, any>) => {
      if (scope === RolePermissionScope.OWN && userId) {
        q = q.eq('created_by', userId)
      }
      return q
    }
    const { data: deleted, count } = await this.repo.deleteFromOrg(ids, orgId, modifier)
    for (const template of deleted) {
      orgAuditLogService.generateChangesAndLogEvent(
        {
          organization_id: orgId,
          action: 'delete',
          module: 'utm_template',
          target_id: template.id,
          target_name: template.name,
          target_table: 'utm_templates',
          user_id: userId,
        },
        template,
        {}
      )
    }

    return count
  }

  async countTemplatesByOrg(orgId: string): Promise<number> {
    return this.repo.countByOrgId(orgId)
  }
}

declare global {
  // eslint-disable-next-line no-var
  var _utmTemplateService: UTMTemplateService | undefined
}

export const utmTemplateService =
  process.env.NODE_ENV !== 'production'
    ? new UTMTemplateService(utmTemplateRepo)
    : (globalThis._utmTemplateService ??
      (globalThis._utmTemplateService = new UTMTemplateService(utmTemplateRepo)))
