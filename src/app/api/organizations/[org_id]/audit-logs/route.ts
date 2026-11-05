import 'server-only'
import { NextRequest } from 'next/server'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { AppError } from '@/infrastructure/response/errors/domain.errors'
import { BaseError } from '@/infrastructure/response/errors/base.error'
import { ensurePolicy } from '@/shared/lib/permission/permissions'
import { ensureOrgPlan, getOrganizationPlan } from '@/shared/lib/plan/plans'
import { nonScopePolicies } from '@/shared/lib/permission/policy'
import { ADVANCED_FEATURE_KEYS } from '@/shared/types/plan-permission'
import { orgAuditLogService } from '@/core/services/org-audit-log.service'
import { getAuditLogsQuerySchema } from '@/shared/schemas/audit-logs'

export const GET = withAuth<{ org_id: string }>(
  async (request: NextRequest, { params }) => {
    try {
      // 1. Permission checks
      await ensurePolicy(params.org_id, nonScopePolicies.view_audit_logs)
      await ensureOrgPlan(params.org_id, ADVANCED_FEATURE_KEYS.AUDIT_LOGS)

      // 2. Get retention limit from plan
      const orgPlan = await getOrganizationPlan(params.org_id)
      const retentionDays = orgPlan?.audit_logs_retention_days || 30

      // 3. Parse and validate query params
      const searchParams: Record<string, any> = Object.fromEntries(request.nextUrl.searchParams.entries())

      // Handle array parameters properly (module[] and action[])
      const moduleParams = request.nextUrl.searchParams.getAll('module[]')
      const actionParams = request.nextUrl.searchParams.getAll('action[]')

      if (moduleParams.length > 0) {
        searchParams.module = moduleParams
      }
      if (actionParams.length > 0) {
        searchParams.action = actionParams
      }

      const queryParams = getAuditLogsQuerySchema.parse(searchParams)

      // 4. Fetch data with retention enforcement
      const { data, count } = await orgAuditLogService.getAuditLogs(params.org_id, {
        module: queryParams.module as any,
        action: queryParams.action as any,
        user_id: queryParams.user_id,
        target_id: queryParams.target_id,
        start_date: queryParams.start_date,
        end_date: queryParams.end_date,
        page: queryParams.page,
        limit: queryParams.limit,
        retention_days: retentionDays,
        search: queryParams.search,
      })

      return APIResponse.ok({ data, rowCount: count })
    } catch (error: any) {
      console.error('GET /audit-logs error:', error)
      if (error instanceof BaseError) {
        return error.toResponse()
      }
      return new AppError(error.message).toResponse()
    }
  }
)
