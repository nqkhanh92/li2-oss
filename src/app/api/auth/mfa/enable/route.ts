import { MfaType } from '@/features/profile/hooks/queries/mfa'
import { AppError } from '@/infrastructure/response/errors/domain.errors'
import { APIResponse } from '@/infrastructure/response/ok/base'
import { casdoorServerSdk } from '@/shared/lib/casdoor/server'
import axios from 'axios'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/shared/lib/middlewares/with-auth'

const BASE_URL = process.env.NEXT_PUBLIC_CASDOOR_APP_URL

export const POST = withAuth(async (request: NextRequest) => {
  const body = await request.json()
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
  formData.append('recoveryCodes', body.recoveryCodes)
  formData.append('secret', body.secret)

  const response = await axios.post(`/api/mfa/setup/enable`, formData, {
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
    message: 'MFA enabled successfully',
    i18nMessage: {
      key: 'common:messages.success.enable_field',
      params: {
        field: 'MFA',
      },
    },
  })
})

export const GET = withAuth(async (request: NextRequest) => {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('casdoor_access_token')?.value
  const user = casdoorServerSdk.parseJwtToken(accessToken || '')
  if (!user) {
    throw new AppError()
  }

  const response = await axios.get('/api/get-account', {
    baseURL: BASE_URL,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const result: MfaType = {
    multiFactorAuths: response.data.data.multiFactorAuths,
    name: response.data.data.name,
  }

  return NextResponse.json(result)
})

export const DELETE = withAuth(async (request: NextRequest) => {
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
  formData.append('recoveryCodes', 'null')

  const response = await axios.post('https://example.com/api/delete-mfa', formData, {
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
    message: 'MFA disabled successfully',
    i18nMessage: {
      key: 'common:messages.success.disabled_field',
      params: {
        field: 'MFA',
      },
    },
  })
})
