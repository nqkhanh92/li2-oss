import { NextRequest } from 'next/server'
import { apiKeyService } from '@/core/services/api-key.service'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { updateApiKeySchema } from '@/shared/schemas/api-keys'
import { ensureOrgMember, ensurePolicy } from '@/shared/lib/permission/permissions'
import { nonScopePolicies } from '@/shared/lib/permission/policy'

export const GET = withAuth<{ org_id: string; key_id: string }>(
  async (request: NextRequest, { params }) => {
    await ensureOrgMember(params.org_id)
    const apiKey = await apiKeyService.findOneById(params.org_id, params.key_id)
    return APIResponse.ok({ data: apiKey })
  }
)

export const PATCH = withAuth<{ org_id: string; key_id: string }>(
  async (request: NextRequest, { params }) => {
    await ensurePolicy(params.org_id, nonScopePolicies.manage_organization)
    const body = await request.json()
    const validatedData = updateApiKeySchema.parse(body)

    const apiKey = await apiKeyService.updateOne(params.org_id, params.key_id, validatedData)
    return APIResponse.updated({
      data: apiKey,
      i18nMessage: {
        key: 'common:messages.success.updated_field',
        params: { field: 'API Key' },
      },
    })
  }
)

export const DELETE = withAuth<{ org_id: string; key_id: string }>(
  async (request: NextRequest, { params }) => {
    await ensurePolicy(params.org_id, nonScopePolicies.manage_organization)
    await apiKeyService.deleteOne(params.org_id, params.key_id)
    return APIResponse.deleted({
      success: true,
      i18nMessage: {
        key: 'common:messages.success.deleted_field',
        params: { field: 'API Key' },
      },
    })
  }
)
