import { BaseService } from './base.service'
import { integrationRepo, IntegrationRepository } from '../repositories/integration.repository'
import { ensurePolicy, getPermissionScopeOrThrow } from '@/shared/lib/permission/permissions'
import { ROLE_PERMISSION_KEYS, RolePermissionScope } from '@/shared/types/role-permission'
import { PostgrestFilterBuilder } from '@supabase/postgrest-js'
import { requestContext } from '@/shared/types/request'
import { z } from 'zod'
import { createIntegrationSchema, updateIntegrationSchema } from '@/shared/schemas/integrations'
import { TablesInsert, TablesUpdate } from '@/shared/types/database.types'
import { nonScopePolicies } from '@/shared/lib/permission/policy'
import { PLAN_LIMIT_KEYS } from '@/shared/types/plan-permission'
import { ensureOrgPlan } from '@/shared/lib/plan/plans'
import { SearchFilterPagination } from '@/shared/types'
import { queryBuilderByParams } from '@/shared/lib/utils'

export class IntegrationService extends BaseService<IntegrationRepository> {
  constructor(repo: IntegrationRepository) {
    super(repo)
  }

  async findAll(orgId: string, queryParams: SearchFilterPagination) {
    const scope = await getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.VIEW_INTEGRATIONS)
    const userId = requestContext.getStore()?.userId!

    const modifier = (q: PostgrestFilterBuilder<any, any, any>) => {
      if (scope === RolePermissionScope.OWN) {
        q = q.eq('user_id', userId)
      }
      q = queryBuilderByParams(q, queryParams)
      if (queryParams?.search) {
        q = q.ilike('name', `%${queryParams.search}%`)
      }

      return q.eq('org_id', orgId)
    }

    return this.repo.findAllWithModifier(modifier)
  }

  async findById(orgId: string, id: string) {
    const scope = await getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.VIEW_INTEGRATIONS)
    const userId = requestContext.getStore()?.userId!

    const modifier = (q: PostgrestFilterBuilder<any, any, any>) => {
      if (scope === RolePermissionScope.OWN) {
        q = q.eq('user_id', userId)
      }
      return q.eq('org_id', orgId)
    }

    return this.repo.findOneById(id, modifier)
  }

  async updateAndGet(orgId: string, id: string, data: z.infer<typeof updateIntegrationSchema>) {
    const scope = await getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.EDIT_INTEGRATION)

    const modifier = (q: PostgrestFilterBuilder<any, any, any>) => {
      if (scope === RolePermissionScope.OWN) {
        const userId = requestContext.getStore()?.userId!
        q = q.eq('user_id', userId)
      }
      return q.eq('org_id', orgId)
    }
    const fields: TablesUpdate<'integrations'> = {
      name: data.name,
      type: data.type,
      config: data.config,
    }

    return this.repo.updateAndGetOne(id, fields, modifier)
  }

  async createOne(orgId: string, data: z.infer<typeof createIntegrationSchema>) {
    await ensureOrgPlan(orgId, PLAN_LIMIT_KEYS.MAX_INTEGRATIONS_PER_ORG)
    await ensurePolicy(orgId, nonScopePolicies.add_integration)

    const fields: TablesInsert<'integrations'> = {
      name: data.name,
      type: data.type,
      config: data.config,
      org_id: orgId,
      user_id: requestContext.getStore()?.userId!,
    }

    return this.repo.create(fields)
  }

  async deleteOne(orgId: string, id: string) {
    const scope = await getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.DELETE_INTEGRATION)

    const modifier = (q: PostgrestFilterBuilder<any, any, any>) => {
      if (scope === RolePermissionScope.OWN) {
        const userId = requestContext.getStore()?.userId!
        q = q.eq('user_id', userId)
      }
      return q.eq('org_id', orgId)
    }
    return this.repo.delete(id, modifier)
  }

  async deleteMany(orgId: string, ids: string[]) {
    const scope = await getPermissionScopeOrThrow(orgId, ROLE_PERMISSION_KEYS.DELETE_INTEGRATION)

    const modifier = (q: PostgrestFilterBuilder<any, any, any>) => {
      if (scope === RolePermissionScope.OWN) {
        const userId = requestContext.getStore()?.userId!
        q = q.eq('user_id', userId)
      }
      return q.eq('org_id', orgId)
    }
    return this.repo.bulkDelete(ids, modifier)
  }

  async rawUpdate(id: string, data: TablesUpdate<'integrations'>) {
    return this.repo.update(id, data)
  }
}

export const integrationService =
  process.env.NODE_ENV !== 'production'
    ? new IntegrationService(integrationRepo)
    : globalThis._integrationService ??
      (globalThis._integrationService = new IntegrationService(integrationRepo))
