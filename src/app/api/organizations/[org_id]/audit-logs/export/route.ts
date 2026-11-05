import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { AppError } from '@/infrastructure/response/errors/domain.errors'
import { BaseError } from '@/infrastructure/response/errors/base.error'
import { ensurePolicy } from '@/shared/lib/permission/permissions'
import { ensureOrgPlan } from '@/shared/lib/plan/plans'
import { nonScopePolicies } from '@/shared/lib/permission/policy'
import { ADVANCED_FEATURE_KEYS } from '@/shared/types/plan-permission'
import { orgAuditLogService } from '@/core/services/org-audit-log.service'
import { exportAuditLogsQuerySchema } from '@/shared/schemas/audit-logs'

export const GET = withAuth<{ org_id: string }>(
  async (request: NextRequest, { params, context }) => {
    try {
      // 1. Permission checks - export requires separate permission
      await ensurePolicy(params.org_id, nonScopePolicies.export_audit_logs)
      await ensureOrgPlan(params.org_id, ADVANCED_FEATURE_KEYS.AUDIT_LOGS)

      // 2. Parse and validate query params
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

      const queryParams = exportAuditLogsQuerySchema.parse(searchParams)

      // 3. Generate export content
      const content = await orgAuditLogService.exportAuditLogs(params.org_id, {
        format: queryParams.format,
        module: queryParams.module as any,
        action: queryParams.action as any,
        user_id: queryParams.user_id,
        start_date: queryParams.start_date,
        end_date: queryParams.end_date,
      })

      // 4. Return file response with appropriate headers
      const timestamp = Date.now()
      if (queryParams.format === 'csv') {
        return new NextResponse(content, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="audit-logs-${timestamp}.csv"`,
          },
        })
      } else {
        return new NextResponse(content, {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="audit-logs-${timestamp}.json"`,
          },
        })
      }
    } catch (error: any) {
      console.error('GET /audit-logs/export error:', error)
      if (error instanceof BaseError) {
        return error.toResponse()
      }
      return new AppError(error.message).toResponse()
    }
  }
)
