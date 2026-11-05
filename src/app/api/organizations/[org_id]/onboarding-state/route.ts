import { NextRequest } from 'next/server'
import { ensureOrgMember, ensurePolicy } from '@/shared/lib/permission/permissions'
import { nonScopePolicies } from '@/shared/lib/permission/policy'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { organizationService } from '@/core/services/organization.service'
import { onboardingStateSchema } from '@/shared/schemas/onboarding-state'

export const GET = withAuth<{ org_id: string }>(async (_request: NextRequest, { params }) => {
  await ensureOrgMember(params.org_id)
  const org = await organizationService.getOrgById(params.org_id)
  return APIResponse.ok({ data: org?.onboarding_state ?? null })
})

export const PATCH = withAuth<{ org_id: string }>(async (request: NextRequest, { params }) => {
  await ensurePolicy(params.org_id, nonScopePolicies.manage_organization)

  const body = await request.json()
  const patch = onboardingStateSchema.parse(body)

  // Fetch current state to merge (never clobber existing progress)
  const org = await organizationService.getOrgById(params.org_id)
  const existing = (org?.onboarding_state ?? {}) as Record<string, any>

  const merged = {
    product_type:
      patch.product_type !== undefined ? patch.product_type : (existing.product_type ?? null),
    ...existing,
  }

  await organizationService.updateOrganization(params.org_id, {
    onboarding_state: merged,
  })

  return APIResponse.ok({
    i18nMessage: { key: 'common:messages.success.saved' },
  })
})
