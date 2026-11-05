import { NextRequest, NextResponse } from 'next/server'
import { withAnonAuth } from '@/shared/lib/middlewares/with-anon-auth'
import { touchPointAnonSchema } from '@/shared/schemas/touch-points/touch-points-anon'
import { AnonAuthContext } from '@/shared/types/request'
import { anonTouchPointService } from '@/core/services/anon-touch-point.service'
import { BaseError } from '@/infrastructure/response/errors/base.error'
import { AppError, BadRequestError } from '@/infrastructure/response/errors/domain.errors'
import { compose } from '@/shared/lib/middlewares/compose'
import { withCors } from '@/shared/lib/middlewares/with-cors'
import { redis } from '@/infrastructure/cache/redis'
import { logger } from '@/infrastructure/logging/logger'
const log = logger.child({ module: 'anon-touch-points' })

const GET_IMPL = async (request: NextRequest, context: AnonAuthContext) => {
  try {
    const { anonId } = context
    const anonTouchPointList = await anonTouchPointService.getAnonTouchPointList(anonId)
    return NextResponse.json(anonTouchPointList)
  } catch (error: any) {
    if (error instanceof BaseError) {
      return error.toResponse()
    }
    return new AppError(error.message).toResponse()
  }
}

const POST_IMPL = async (request: NextRequest, context: AnonAuthContext) => {
  try {
    const body = await request.json()
    const { anonId, ipAddress } = context

    const validatedData = touchPointAnonSchema.safeParse(body)
    if (!validatedData.success) {
      throw new BadRequestError('Invalid touch point data', {
        key: 'common:errors.invalid_tp_data',
      })
    }

    const count = await anonTouchPointService.countCreated(anonId)
    if (count && count >= 1) {
      redis.set(`anon:${anonId}:tp:pending`, JSON.stringify(validatedData.data), 'EX', 86400)

      throw new BadRequestError(
        "You've reached your free link limit. Keep going! Sign up to create unlimited links and unlock tools.",
        {
          key: 'home.error.max_anon_tp',
          params: {
            max: 1,
          },
        }
      )
    }

    const insertedTp = await anonTouchPointService.createAnonTouchPoint(validatedData.data, {
      anonId,
      ip: ipAddress,
    })
    return NextResponse.json(insertedTp)
  } catch (error: any) {
    if (error instanceof BaseError) {
      return error.toResponse()
    }
    return new AppError(error.message).toResponse()
  }
}

export const GET = compose(withCors, withAnonAuth)(GET_IMPL)
export const POST = compose(withCors, withAnonAuth)(POST_IMPL)

export const OPTIONS = withCors(async (request: NextRequest) => {
  const response = new NextResponse(null, { status: 204 })
  return response
})
