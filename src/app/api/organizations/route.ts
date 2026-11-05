import { Database } from '@/shared/types/database.types'
import { NextRequest } from 'next/server'
import { organizationFormSchema } from '@/shared/schemas/organizations'
import { z } from 'zod'
import { logger } from '@/infrastructure/logging/logger'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { organizationService } from '@/core/services/organization.service'
import { APIResponse } from '@/infrastructure/response/ok/base'

export type Organization = Database['public']['Tables']['organizations']['Row']

const log = logger.child({ module: 'organizations' })

export const GET = withAuth(async (request, { context }) => {
  const orgs = await organizationService.getUserOrgs(context.userId)
  return APIResponse.ok({ data: orgs })
})

export const POST = withAuth(async (request: NextRequest, { context }) => {
  const body = await request.json()
  const validatedData = organizationFormSchema.parse(body) as z.infer<typeof organizationFormSchema>

  log.info({ userId: context.userId, slug: validatedData.org_slug, msg: 'Creating organization' })

  const organization = await organizationService.createOrganization(context.userId, validatedData)

  log.info({ userId: context.userId, orgId: organization.id, slug: organization.org_slug, msg: 'Organization created' })

  return APIResponse.created({ data: organization })
})
