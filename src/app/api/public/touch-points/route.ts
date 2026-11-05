import { organizationService } from '@/core/services/organization.service'
import { touchPointService } from '@/core/services/touch-point.service'
import { BadRequestError } from '@/infrastructure/response/errors/domain.errors'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { touchPointAnonSchema } from '@/shared/schemas/touch-points/touch-points-anon'
import { NextRequest, NextResponse } from 'next/server'
import dayjs from '@/shared/lib/dayjs'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { AuthContext } from '@/shared/types/request'
import { compose } from '@/shared/lib/middlewares/compose'
import { withCors } from '@/shared/lib/middlewares/with-cors'
import { z } from 'zod'
import { touchPointFormSchema } from '@/shared/schemas/touch-points'
import { formToJSON } from 'axios'
import { uploadFile } from '@/shared/lib/storage/upload'

const POST_IMPL = async (request: NextRequest, { context }: { context: AuthContext }) => {
  const { userId } = context

  const formData = await request.formData()
  const json = formToJSON(formData)
  const validatedData = touchPointAnonSchema.parse(json)

  const { data: organization, error } = await organizationService.getFirstOrgByUserId(userId)

  if (error) throw error
  if (!organization) {
    throw new BadRequestError('You need at least one organization to create a touch point!')
  }

  const tpData: z.infer<typeof touchPointFormSchema> = {
    ...validatedData,
    enabled: true,
    is_campaign_based: false,
  }
  const createdTp = await touchPointService.createTouchPoint(organization.id, tpData, userId)

  return APIResponse.created({ message: 'Touchpoint created successfully', data: createdTp })
}
export const POST = compose(withCors, withAuth)(POST_IMPL)

export const OPTIONS = withCors(async (request: NextRequest) => {
  const response = new NextResponse(null, { status: 204 })
  return response
})
