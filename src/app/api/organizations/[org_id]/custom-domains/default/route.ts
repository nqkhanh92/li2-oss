import { NextRequest } from 'next/server'
import { AppError } from '@/infrastructure/response/errors/domain.errors'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { ensureOrgMember } from '@/shared/lib/permission/permissions'
import { BaseError } from '@/infrastructure/response/errors/base.error'
import { domainService } from '@/core/services/domain.service'

/**
 * GET /api/organizations/:org_id/custom-domains/default
 * Returns the effective default domain for the org:
 *   - org's default_domain_id if set, otherwise the system default domain.
 */
export const GET = withAuth<{ org_id: string }>(
  async (_request: NextRequest, { params }) => {
    try {
      await ensureOrgMember(params.org_id)
      const domain = await domainService.findDefaultOrgDomain(params.org_id)
      return APIResponse.ok({ data: domain })
    } catch (error: any) {
      if (error instanceof BaseError) return error.toResponse()
      return new AppError(error?.message).toResponse()
    }
  }
)
