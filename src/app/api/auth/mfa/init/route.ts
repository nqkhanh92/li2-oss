import { InitMfaType } from '@/features/profile/hooks/mutations/mfa'
import { BaseError } from '@/infrastructure/response/errors/base.error'
import { AppError } from '@/infrastructure/response/errors/domain.errors'
import { casdoorServerSdk } from '@/shared/lib/casdoor/server'
import axios from 'axios'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const BASE_URL = process.env.NEXT_PUBLIC_CASDOOR_APP_URL

export async function POST(request: NextRequest) {
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

    const response = await axios.post(`/api/mfa/setup/initiate`, formData, {
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

    const result: InitMfaType = {
      url: transformOtpUri(response.data.data.url),
      secret: response.data.data.secret,
      enabled: response.data.data.enabled,
      isPreferred: response.data.data.isPreferred,
      mfaType: response.data.data.mfaType,
      recoveryCodes: response.data.data.recoveryCodes,
    }

    return NextResponse.json(result)
  } catch (error: any) {
    if (error instanceof BaseError) {
      return error.toResponse()
    }
    return new AppError(error?.message).toResponse()
  }
}

function transformOtpUri(uri: string): string {
  return uri.replace(/^otpauth:\/\/totp\/[^:]+:.*\//, 'otpauth://totp/Proxify:')
}
