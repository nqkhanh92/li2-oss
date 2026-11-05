'use server'
import { cookies, headers } from 'next/headers'
import * as jose from 'jose'
import { casdoorConfig } from '../casdoor'
import { getPublicKey } from '.'
import { getInsidePublicKey, isInsideAudience } from './inside-cert'
import { NextRequest } from 'next/server'

/**
 * Returns the current user session.
 *
 * @returns A session object, or null if no session is present.
 */
export type Session = {
  sub: string
  email: string
  exp: number
  id: string
}

export const getToken = async (r?: NextRequest) => {
  if (r) {
    return (
      r.cookies.get('casdoor_access_token')?.value ||
      r.headers.get('Authorization')?.split('Bearer ')[1]
    )
  }
  const cookieStore = await cookies()
  const headersStore = await headers()
  return (
    cookieStore.get('casdoor_access_token')?.value ||
    headersStore.get('Authorization')?.split('Bearer ')[1]
  )
}
export const getAPIKey = async (r?: NextRequest) => {
  const apiKey = r?.headers.get('x-api-key') ?? (await headers().get('x-api-key'))
  if (!apiKey) return null
  return apiKey
}

const toSession = (payload: jose.JWTPayload): Session =>
  ({
    id: payload.id,
    sub: payload.sub,
    email: payload.email,
    exp: payload.exp,
  }) as Session

/**
 * Xác minh token, thử cert CHÍNH trước, rồi mới tới cert phụ của Inside.
 *
 * Thứ tự quan trọng: gần như mọi lời gọi đến từ chính app và khớp cert chính ngay lần đầu, nên
 * đường phổ biến không phải trả giá cho một lần xác minh thừa.
 *
 * Cert phụ chỉ nhận khi token **vừa** đúng chữ ký **vừa** đúng audience của Inside. Lý do đầy đủ
 * ở `inside-cert.ts`; tóm lại: `cert-built-in` là cert mặc định của Casdoor, dùng chung với
 * `app-built-in`, nên riêng chữ ký không chứng minh được token đến từ Inside — và `getSession`
 * là cửa của **mọi** route có `withAuth`, không riêng endpoint admin.
 */
export const getSession = async (r?: NextRequest): Promise<Session | null> => {
  const access_token = await getToken(r)
  if (!access_token) return null

  try {
    const { payload } = await jose.jwtVerify(access_token, await getPublicKey(), {
      clockTolerance: 60,
    })
    return toSession(payload)
  } catch {
    // Chữ ký không khớp cert chính — có thể là token của Inside. Thử tiếp.
  }

  const insideKey = await getInsidePublicKey()
  if (!insideKey) return null

  try {
    const { payload } = await jose.jwtVerify(access_token, insideKey, {
      clockTolerance: 60,
    })
    // Đúng chữ ký vẫn CHƯA đủ: phải đúng ứng dụng phát hành.
    if (!isInsideAudience(payload)) return null
    return toSession(payload)
  } catch {
    return null
  }
}

export const refreshAccessToken = async (
  refresh_token: string
): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
} | null> => {
  try {
    const response = await fetch(`${casdoorConfig.endpoint}/api/login/oauth/refresh_token`, {
      method: 'POST',
      body: JSON.stringify({
        refresh_token,
        grant_type: 'refresh_token',
        client_id: casdoorConfig.clientId,
        client_secret: casdoorConfig.clientSecret,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })
    const { access_token, refresh_token: new_refresh_token, expires_in } = await response.json()
    if (!access_token || !new_refresh_token || !expires_in) return null
    return { access_token, refresh_token: new_refresh_token, expires_in }
  } catch (e) {
    return null
  }
}
