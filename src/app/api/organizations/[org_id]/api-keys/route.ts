import { NextRequest } from 'next/server'
import { apiKeyService } from '@/core/services/api-key.service'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { createApiKeySchema } from '@/shared/schemas/api-keys'
import { ensureOrgMember, ensurePolicy } from '@/shared/lib/permission/permissions'
import { nonScopePolicies } from '@/shared/lib/permission/policy'

export const GET = withAuth<{ org_id: string }>(async (request: NextRequest, { params }) => {
  await ensureOrgMember(params.org_id)
  const apiKeys = await apiKeyService.findAll(params.org_id)
  return APIResponse.ok({ data: apiKeys })
})

export const POST = withAuth<{ org_id: string }>(async (request: NextRequest, { params }) => {
  await ensurePolicy(params.org_id, nonScopePolicies.manage_organization)
  const body = await request.json()
  const validatedData = createApiKeySchema.parse(body)

  const apiKey = await apiKeyService.createOne(params.org_id, validatedData)

  return APIResponse.created({
    data: apiKey,
    i18nMessage: {
      key: 'common:messages.success.created_field',
      params: { field: 'API Key' },
    },
  })
})
