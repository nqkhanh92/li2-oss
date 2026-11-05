import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { profileFormSchema } from '@/shared/schemas/profile'
import { casdoorServerSdk } from '@/shared/lib/casdoor/server'
import {
  AppError,
  BadRequestError,
  UnauthorizedError,
} from '@/infrastructure/response/errors/domain.errors'
import { redis } from '@/infrastructure/cache/redis'
import { cookies } from 'next/headers'
import { profileService } from '@/core/services/profile.service'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { BaseError } from '@/infrastructure/response/errors/base.error'
import { withAuth } from '@/shared/lib/middlewares/with-auth'

export const GET = withAuth(
  async (request: NextRequest, { context }) => {
    try {
      const profile = await profileService.getProfile(context.userId)
      return NextResponse.json(profile)
    } catch (error: any) {
      if (error instanceof BaseError) {
        return error.toResponse()
      }
      return new AppError(error.message).toResponse()
    }
  }
)

export const POST = withAuth(
  async (request: NextRequest, { context }) => {
    try {
      const data = await request.json()
      const updateData: z.infer<typeof profileFormSchema> = profileFormSchema.parse(data.data)
      if (!updateData) {
        throw new BadRequestError('Error: Data is missing', {
          key: 'common:messages.error.field_invalid',
          params: {
            field: '$t(module.profile)',
          },
        })
      }

      await profileService.updateProfile(context.userId, {
        dob: updateData.dob,
        display_name: updateData?.display_name,
        address: updateData?.address,
        timezone: updateData?.timezone,
      })

      return APIResponse.ok({
        message: 'User updated successfully',
        i18nMessage: {
          key: 'common:messages.success.updated_field',
          params: {
            field: '$t(module.profile)',
          },
        },
      })
    } catch (error: any) {
      return NextResponse.json(
        { error: true, message: error?.message || 'Something went wrong' },
        { status: 500 }
      )
    }
  }
)

export const DELETE = withAuth(
  async (request: NextRequest, { context }) => {
    try {
      const cookieStore = await cookies()
      const accessToken = cookieStore.get('casdoor_access_token')?.value
      const user = casdoorServerSdk.parseJwtToken(accessToken || '')
      if (!user || !user.id || !user.email) {
        throw new UnauthorizedError('Unauthorized')
      }

      await profileService.deleteProfile({
        id: user.id,
        email: user.email,
        user,
      })

      await redis.rpush(
        'email:send',
        JSON.stringify({
          key: 'user:delete',
          to: user.email,
          value: {
            Email: user.email,
          },
          subject_value: [],
        })
      )

      return NextResponse.json({ message: 'Delete successfully!' })
    } catch (error: any) {
      return NextResponse.json(
        { error: true, message: error?.message || 'Something went wrong' },
        { status: 500 }
      )
    }
  }
)
