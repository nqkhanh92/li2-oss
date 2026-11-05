import { ensurePolicy } from '@/shared/lib/permission/permissions'
import { updateIntegrationSchema } from '@/shared/schemas/integrations'
import { nonScopePolicies } from '@/shared/lib/permission/policy'
import { Tables } from '@/shared/types/database.types'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { integrationService } from '@/core/services/integration.service'
export type Integration = Tables<'integrations'>

export const GET = withAuth<{ org_id: string; integration_id: string }>(async (req, { params }) => {
  const integration = await integrationService.findById(params.org_id, params.integration_id)
  return APIResponse.ok({
    data: integration,
  })
})

export const PATCH = withAuth<{ org_id: string; integration_id: string }>(
  async (req, { params }) => {
    await ensurePolicy(params.org_id, nonScopePolicies.manage_organization)

    const body = await req.json()
    const validatedData = updateIntegrationSchema.parse(body)

    await integrationService.updateAndGet(params.org_id, params.integration_id, validatedData)

    return APIResponse.updated({
      success: true,
      i18nMessage: {
        key: 'common:messages.success.updated_field',
        params: {
          field: '$t(module.integration)',
        },
      },
    })
  }
)
