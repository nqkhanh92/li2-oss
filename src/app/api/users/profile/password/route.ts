import { casdoorServerSdk } from '@/shared/lib/casdoor/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { SetPasswordFormSchema } from '@/shared/schemas/profile'
import { z } from 'zod'
import { profileService } from '@/core/services/profile.service'
import { BaseError } from '@/infrastructure/response/errors/base.error'
import { AppError } from '@/infrastructure/response/errors/domain.errors'
import { APIResponse } from '@/infrastructure/response/ok/base'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const dataForCasdoor: z.infer<typeof SetPasswordFormSchema> = SetPasswordFormSchema.parse(
      data.data
    )
    if (!dataForCasdoor) {
      return NextResponse.json({ error: true, message: 'Invalid data' }, { status: 400 })
    }
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('casdoor_access_token')?.value
    const casdoorData = casdoorServerSdk.parseJwtToken(accessToken || '')

    await profileService.updateCasdoorPassword({
      updateData: {
        owner: casdoorData?.owner,
        name: casdoorData?.name,
        oldPassword: dataForCasdoor.oldPassword,
        newPassword: dataForCasdoor.newPassword,
      },
    })

    return APIResponse.ok({
      message: 'Password updated successfully',
      i18nMessage: {
      key: 'common:messages.success.updated_field',
        params: {
          field: '$t(form.fields.password)',
        },
      },
    })
  } catch (error: any) {
    console.error('Error updating user:', error)
    if (error instanceof BaseError) {
      return error.toResponse()
    }
    return new AppError(error?.message).toResponse()
  }
}
