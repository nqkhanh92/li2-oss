import { AuthContext } from '@/shared/types/request'
import { NextRequest, NextResponse } from 'next/server'
import { AppError } from '@/infrastructure/response/errors/domain.errors'
import { profileService } from '@/core/services/profile.service'
import { compose } from '@/shared/lib/middlewares/compose'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { withCors } from '@/shared/lib/middlewares/with-cors'
import { APIResponse } from '@/infrastructure/response/ok/base'

const GET_IMPL = async (request: NextRequest, { context }: { context: AuthContext }) => {
  try {
    const { userId } = context
    const profile = await profileService.getProfile(userId)
    return APIResponse.ok({ data: profile })
  } catch (error: any) {
    if (error instanceof AppError) {
      return error.toResponse()
    }
    return new AppError(error?.message).toResponse()
  }
}

export const GET = compose(withCors, withAuth)(GET_IMPL)

export const OPTIONS = withCors(async (request: NextRequest) => {
  const response = new NextResponse(null, { status: 204 })
  return response
})
