import { analyticsSettingsService } from '@/core/services/analytics-settings.service'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { BadRequestError } from '@/infrastructure/response/errors/domain.errors'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { ensureOrgMember, ensurePolicy } from '@/shared/lib/permission/permissions'
import { nonScopePolicies } from '@/shared/lib/permission/policy'

export const PUT = withAuth<{ org_id: string }>(async (req, { params: { org_id } }) => {
  await ensurePolicy(org_id, nonScopePolicies.manage_organization)

  const body = await req.json()
  const { outbound_domains } = body

  if (!Array.isArray(outbound_domains)) {
    throw new BadRequestError()
  }

  const domains = (outbound_domains as unknown[])
    .filter((d): d is string => typeof d === 'string' && d.trim() !== '')
    .map((d) => d.trim())

  const settings = await analyticsSettingsService.updateOutboundDomains(org_id, domains)

  return APIResponse.updated({ data: settings })
})
