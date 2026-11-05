import 'server-only'

import { OAuth2Client } from 'google-auth-library'

/**
 * [P2] OAuth client RIÊNG cho người xem artifact (spec R9) — không tái dùng client Google Sheets
 * (scope Drive, env `*_SHEETS_*`), không qua Casdoor (Casdoor tạo user li2 cho mỗi lần đăng nhập
 * Google; người xem không phải user li2 — A25). Scope tối thiểu `openid email`; không giữ access/refresh
 * token nào sau khi đọc được email.
 *
 * Redirect URI là MỘT URL cố định (`/a/google/callback`): Google không nhận wildcard theo token, nên
 * token đi trong `state` đã ký (`artifact-viewer-session.ts`).
 */
export const ARTIFACT_GOOGLE_SCOPES = ['openid', 'email'] as const

export function artifactGoogleRedirectUri(): string {
  const base = (process.env.NEXT_PUBLIC_APP_BASE_URL ?? '').replace(/\/+$/, '')
  return `${base}/a/google/callback`
}

export function createArtifactGoogleClient(): OAuth2Client {
  return new OAuth2Client({
    clientId: process.env.ARTIFACT_GOOGLE_CLIENT_ID,
    clientSecret: process.env.ARTIFACT_GOOGLE_CLIENT_SECRET,
    redirectUri: artifactGoogleRedirectUri(),
  })
}

export function artifactGoogleAuthUrl(client: OAuth2Client, state: string): string {
  return client.generateAuthUrl({
    scope: [...ARTIFACT_GOOGLE_SCOPES],
    prompt: 'select_account',
    state,
  })
}

/**
 * Đổi `code` lấy email ĐÃ XÁC MINH. `null` cho mọi thứ khác: không id_token, email chưa verified, lỗi
 * mạng — route coi tất cả là `?g=failed`. Không trả `name`/`picture` dù Google có gửi.
 */
export async function artifactGoogleVerifiedEmail(
  client: OAuth2Client,
  code: string
): Promise<string | null> {
  const { tokens } = await client.getToken(code)
  if (!tokens.id_token) return null
  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: process.env.ARTIFACT_GOOGLE_CLIENT_ID,
  })
  const payload = ticket.getPayload()
  if (!payload?.email || payload.email_verified !== true) return null
  return payload.email
}
