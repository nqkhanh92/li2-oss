import 'server-only'
import { NextRequest } from 'next/server'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { AppError, NotFoundError } from '@/infrastructure/response/errors/domain.errors'
import { BaseError } from '@/infrastructure/response/errors/base.error'
import { ensurePolicy } from '@/shared/lib/permission/permissions'
import { ensureOrgPlan } from '@/shared/lib/plan/plans'
import { nonScopePolicies } from '@/shared/lib/permission/policy'
import { ADVANCED_FEATURE_KEYS } from '@/shared/types/plan-permission'
import { orgAuditLogService } from '@/core/services/org-audit-log.service'

export const GET = withAuth<{ org_id: string; log_id: string }>(
  async (request: NextRequest, { params, context }) => {
    try {
      // 1. Permission checks
      await ensurePolicy(params.org_id, nonScopePolicies.view_audit_logs)
      await ensureOrgPlan(params.org_id, ADVANCED_FEATURE_KEYS.AUDIT_LOGS)

      // 2. Fetch audit log by ID
      const auditLog = await orgAuditLogService.getAuditLogById(params.log_id, params.org_id)

      if (!auditLog) {
        throw new NotFoundError('Audit log not found', {
          key: 'audit_logs:errors.not_found',
        })
      }

      return APIResponse.ok({ data: auditLog })
    } catch (error: any) {
      console.error('GET /audit-logs/[log_id] error:', error)
      if (error instanceof BaseError) {
        return error.toResponse()
      }
      return new AppError(error.message).toResponse()
    }
  }
)
