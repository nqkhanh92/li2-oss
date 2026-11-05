import { BaseError } from '@/infrastructure/response/errors/base.error'
import { AppError } from '@/infrastructure/response/errors/domain.errors'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { casdoorServerSdk } from '@/shared/lib/casdoor/server'
import axios from 'axios'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

const BASE_URL = process.env.NEXT_PUBLIC_CASDOOR_APP_URL

export async function POST(request: NextRequest) {
  const body = await request.json()
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('casdoor_access_token')?.value
    const user = casdoorServerSdk.parseJwtToken(accessToken || '')
    if (!user) {
      throw new AppError()
    }

    const formData = new FormData()
    formData.append('owner', user.owner)
    formData.append('name', user.name)
    formData.append('mfaType', 'app')
    formData.append('passcode', body.passcode)
    formData.append('secret', body.secret)
    // formData.append("countryCode", "US");

    const response = await axios.post(`/api/mfa/setup/verify`, formData, {
      baseURL: BASE_URL,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
    if (response.data.status !== 'ok') {
      if (response.data.msg) {
        throw new AppError(response.data.msg)
      }
      throw new AppError()
    }
    return APIResponse.ok({
      message: 'MFA verified successfully',
      i18nMessage: {
        key: 'common:messages.success.verify_field',
        params: {
          field: 'MFA',
        },
      },
    })
  } catch (error: any) {
    if (error instanceof BaseError) {
      return error.toResponse()
    }
    return new AppError(error?.message).toResponse()
  }
}
