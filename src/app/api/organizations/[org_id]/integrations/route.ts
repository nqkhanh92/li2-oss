import { BadRequestError } from '@/infrastructure/response/errors/domain.errors'

import { getQueryParams } from '@/shared/lib/utils'
import { SearchFilterPagination } from '@/shared/types'
import { Tables } from '@/shared/types/database.types'

import { createIntegrationSchema } from '@/shared/schemas/integrations'

import { IntegrationType } from '@/features/integrations/constants'
import { createIntegrationService } from '@/infrastructure/external/integrations/factory'
import { logger } from '@/infrastructure/logging/logger'
import { BaseError } from '@/infrastructure/response/errors/base.error'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { integrationService } from '@/core/services/integration.service'
import { GoogleSheetsIntegrationService } from '@/infrastructure/external/integrations/google-sheets.service'

const log = logger.child({ module: 'integrations' })

export type Integration = Tables<'integrations'> & {
  type: IntegrationType
}

export const GET = withAuth<{ org_id: string }>(async (req, { params: { org_id } }) => {
  const queryParams = getQueryParams(req) as SearchFilterPagination

  const integrations = await integrationService.findAll(org_id, queryParams)
  return APIResponse.ok({
    data: integrations,
    rowCount: integrations.length,
  })
})

export const POST = withAuth<{ org_id: string }>(async (req, { params: { org_id } }) => {
  const body = await req.json()
  const validatedData = createIntegrationSchema.parse(body)

  const externalIntegrationService = createIntegrationService(
    validatedData.type,
    validatedData.config
  )

  switch (validatedData.type) {
    case IntegrationType.GOOGLE_SHEETS:
      const { tokens, valid } = await (
        externalIntegrationService as GoogleSheetsIntegrationService
      ).getTokens()
      if (!valid) {
        throw new BadRequestError("We can't connect to your integration, please check your data!")
      }
      validatedData.config = {
        ...validatedData.config,
        access_token: tokens.access_token ?? undefined,
        refresh_token: tokens.refresh_token ?? undefined,
        expiry_date: tokens.expiry_date ?? undefined,
        id_token: tokens.id_token ?? undefined,
      }
      break
    default:
      const result = await externalIntegrationService.validateConfig()
      if (!result) {
        throw new BadRequestError("We can't connect to your integration, please check your data!")
      }
      break
  }

  const integration = await integrationService.createOne(org_id, validatedData)

  return APIResponse.created({
    data: integration,
    i18nMessage: {
      key: 'common:messages.success.created_field',
      params: {
        field: '$t(module.integration)',
      },
    },
  })
})

export const DELETE = withAuth<{ org_id: string }>(async (req, { params: { org_id } }) => {
  const { ids } = await req.json()
  const deleteCount = await integrationService.deleteMany(org_id, ids)

  if (deleteCount === null) {
    throw new BadRequestError('Cant delete anything.')
  }

  if (deleteCount < ids.length) {
    return APIResponse.deleted({
      success: true,
      i18nMessage: {
        key: 'common:messages.success.deleted_count_restricted',
        params: {
          field: '$t(module.integration)',
          count: `${deleteCount}/${ids.length}`,
        },
      },
    })
  }

  return APIResponse.deleted({
    success: true,
    i18nMessage: {
      key: 'common:messages.success.deleted_count',
      params: {
        field: '$t(module.integration)',
        count: deleteCount,
      },
    },
  })
})
