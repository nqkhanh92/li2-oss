import { organizationService } from '@/core/services/organization.service'
import { touchPointService } from '@/core/services/touch-point.service'
import { compose } from '@/shared/lib/middlewares/compose'
import { withCors } from '@/shared/lib/middlewares/with-cors'
import { withServiceAuth } from '@/shared/lib/middlewares/with-service-auth'
import { touchPointAnonSchema } from '@/shared/schemas/touch-points/touch-points-anon'
import { formToJSON } from 'axios'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { touchPointFormSchema } from '@/shared/schemas/touch-points'
import { validate } from 'uuid'
import { BadRequestError } from '@/infrastructure/response/errors/domain.errors'

export const OPTIONS = withCors(async (request: NextRequest) => {
  const response = new NextResponse(null, { status: 204 })
  return response
})

export const POST = compose(
  withCors,
  withServiceAuth
)(async (request: NextRequest) => {
  const formData = await request.formData()
  const json = formToJSON(formData)

  const validatedData = touchPointAnonSchema
    .extend({
      user_id: z.string().refine(validate),
    })
    .parse(json)

  const { data: org, error } = await organizationService.getFirstOrgByUserId(validatedData.user_id)
  if (error) {
    throw new BadRequestError('Cant find organization by user id')
  }
  const tpData: z.infer<typeof touchPointFormSchema> = {
    ...validatedData,
    enabled: true,
    is_campaign_based: false,
  }

  const createdTp = await touchPointService.createTouchPoint(org.id, tpData, validatedData.user_id)

  return APIResponse.created({ message: 'Touchpoint created successfully', data: createdTp })
})
