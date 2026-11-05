import { staticQrRepo, StaticQrRepository } from '../repositories/static-qr.repository'
import { BaseService } from './base.service'
import { ensureOrgPlan } from '@/shared/lib/plan/plans'
import { PLAN_LIMIT_KEYS } from '@/shared/types/plan-permission'
import { ensurePolicy, getPermissionScopeOrThrow } from '@/shared/lib/permission/permissions'
import { TablesInsert, TablesUpdate } from '@/shared/types/database.types'
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '@/infrastructure/response/errors/domain.errors'
import { OrgAuditLog, orgAuditLogService } from './org-audit-log.service'
import { ROLE_PERMISSION_KEYS, RolePermissionScope } from '@/shared/types/role-permission'
import { PostgrestFilterBuilder } from '@supabase/postgrest-js'
import { requestContext } from '@/shared/types/request'
import { SearchFilterPagination } from '@/shared/types'
import { queryBuilderByParams } from '@/shared/lib/utils'
import { nonScopePolicies } from '@/shared/lib/permission/policy'

export class StaticQrService extends BaseService<StaticQrRepository> {
  constructor(repo: StaticQrRepository) {
    super(repo)
  }

  async findAll(orgId: string, queryParams: SearchFilterPagination) {
    const scope = RolePermissionScope.OWN
    const userId = requestContext.getStore()?.userId!

    const modifier = (q: PostgrestFilterBuilder<any, any, any>) => {
      q = q.eq('organization_id', orgId).is('deleted_at', null)
      if (scope === RolePermissionScope.OWN) {
        q = q.eq('user_id', userId)
      }
      q = queryBuilderByParams(q, queryParams)
      if (queryParams?.search) {
        q = q.ilike('name', `%${queryParams.search}%`)
      }
      return q
    }

    return this.repo.findAllWithModifier(modifier)
  }

  async findById(orgId: string, id: string) {
    const scope = RolePermissionScope.OWN
    const userId = requestContext.getStore()?.userId!

    const modifier = (q: PostgrestFilterBuilder<any, any, any>) => {
      q = q.eq('organization_id', orgId).is('deleted_at', null)
      if (scope === RolePermissionScope.OWN) {
        q = q.eq('user_id', userId)
      }
      return q
    }

    const data = await this.repo.findOneById(id, modifier)
    if (!data) {
      throw new NotFoundError('Static QR not found')
    }
    return data
  }

  async create(
    orgId: string,
    input: Omit<TablesInsert<'static_qr'>, 'organization_id' | 'user_id'>
  ) {
    await ensurePolicy(orgId, nonScopePolicies.add_touch_point)
    await ensureOrgPlan(orgId, PLAN_LIMIT_KEYS.MAX_STATIC_QR_PER_ORG)

    const userId = requestContext.getStore()?.userId!

    const data = await this.repo.create({
      ...input,
      organization_id: orgId,
      user_id: userId,
    })

    return data
  }

  async update(orgId: string, id: string, input: TablesUpdate<'static_qr'>) {
    const scope = RolePermissionScope.OWN
    const userId = requestContext.getStore()?.userId!

    // Check if user has permission to edit this specific static QR
    const existing = await this.findById(orgId, id)
    if (scope === RolePermissionScope.OWN && existing.user_id !== userId) {
      throw new ForbiddenError('You do not have permission to edit this static QR')
    }

    const modifier = (q: PostgrestFilterBuilder<any, any, any>) => {
      q = q.eq('organization_id', orgId)
      if (scope === RolePermissionScope.OWN) {
        q = q.eq('user_id', userId)
      }
      return q
    }

    const data = await this.repo.updateAndGetOne(id, input, modifier)

    return data
  }

  async delete(orgId: string, id: string) {
    const scope = RolePermissionScope.OWN
    const userId = requestContext.getStore()?.userId!

    // Check if user has permission to delete this specific static QR
    const existing = await this.findById(orgId, id)
    if (scope === RolePermissionScope.OWN && existing.user_id !== userId) {
      throw new ForbiddenError('You do not have permission to delete this static QR')
    }

    const modifier = (q: PostgrestFilterBuilder<any, any, any>) => {
      q = q.eq('organization_id', orgId)
      if (scope === RolePermissionScope.OWN) {
        q = q.eq('user_id', userId)
      }
      return q
    }

    const data = await this.repo.deleteAndGetOne(id, modifier)

    return data
  }
  async bulkDelete(orgId: string, ids: string[]) {
    const userId = requestContext.getStore()?.userId!

    const modifier = (q: PostgrestFilterBuilder<any, any, any>) => {
      q = q.eq('organization_id', orgId).eq('user_id', userId)
      return q
    }

    const data = await this.repo.bulkDelete(ids, modifier)

    return data
  }
}

export const staticQrService =
  process.env.NODE_ENV !== 'production'
    ? new StaticQrService(staticQrRepo)
    : (globalThis._staticQrService ??
      (globalThis._staticQrService = new StaticQrService(staticQrRepo)))
