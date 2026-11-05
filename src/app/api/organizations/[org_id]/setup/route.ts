import { NextRequest } from 'next/server'
import { setupOrganizationSchema } from '@/shared/schemas/organizations'
import {
  AppError,
  BadRequestError,
  UnauthorizedError,
} from '@/infrastructure/response/errors/domain.errors'
import { logger } from '@/infrastructure/logging/logger'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { organizationService } from '@/core/services/organization.service'
import { APIResponse } from '@/infrastructure/response/ok/base'

const log = logger.child({
  module: 'organizations-setup',
})
export const PATCH = withAuth(
  async (request: NextRequest, { params }: { params: { org_id: string } }) => {
    const body = await request.json()
    const validatedData = setupOrganizationSchema.parse(body)

    const { data: existingOrg } = await organizationService.getOrgBySlug(validatedData.org_slug)

    if (existingOrg && existingOrg.id !== params.org_id) {
      throw new AppError('Slug is taken!', { key: 'common:messages.error.slug_is_taken' })
    }
    if (existingOrg && existingOrg.id === params.org_id) {
      return APIResponse.updated({
        data: existingOrg,
        i18nMessage: {
          key: 'common:messages.success.saved',
        },
      })
    }

    const org = await organizationService.updateOrganization(params.org_id, validatedData)

    if (!org) {
      throw new BadRequestError('Organization not found!')
    }

    return APIResponse.updated({
      data: org,
      i18nMessage: {
        key: 'common:messages.success.saved',
      },
    })
  }
)
