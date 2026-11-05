import { randomBytes } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
// artifact-serve.service, NOT artifact.service — same import-graph rule as every route under /a/.
import { artifactServeService } from '@/core/services/artifact-serve.service'
import { ARTIFACT_COMMON_HEADERS } from '@/core/helpers/artifact-csp'
import { hasArtifactGoogleClient } from '@/core/helpers/artifact-google'
import { artifactGoogleAuthUrl, createArtifactGoogleClient } from '@/core/helpers/artifact-google-oauth'
import { googleNonceCookieOptions, signGoogleState, viewerSecret } from '@/core/helpers/artifact-viewer-session'

/**
 * [P2] `GET /a/<token>/google` — nút "Tiếp tục với Google" (spec R9).
 *
 * Năm bước resolve rồi mới việc riêng: token không hàng → 404; hàng không ở chế độ google → 404 (không
 * 405: GET là method đúng, chỉ là không có gì ở đây cho artifact đó). Env Google chưa đặt → 404 — chế độ
 * không tồn tại (§9), kể cả khi một hàng DB đang mang `google`.
 *
 * `state` = JWT ký (purpose riêng, token, nonce, 10 phút); `nonce` đồng thời nằm trong cookie
 * `artifact_google_nonce` (Path=/a/) để callback xác nhận cùng một trình duyệt đã bắt đầu.
 */
export async function GET(_request: NextRequest, { params }: { params: { token: string } }) {
  const lookup = await artifactServeService.resolveTargetByToken(params.token)
  if (lookup.outcome !== 'live') return notFound()
  if (lookup.target.access.mode !== 'google') return notFound()
  if (!hasArtifactGoogleClient()) return notFound()
  if (!viewerSecret()) return new NextResponse(null, { status: 503, headers: ARTIFACT_COMMON_HEADERS })

  const nonce = randomBytes(16).toString('base64url')
  const state = await signGoogleState(lookup.target.serveToken, nonce)
  const url = artifactGoogleAuthUrl(createArtifactGoogleClient(), state)

  const response = new NextResponse(null, {
    status: 302,
    headers: { ...ARTIFACT_COMMON_HEADERS, Location: url },
  })
  response.cookies.set({ ...googleNonceCookieOptions(), value: nonce })
  return response
}

const notFound = () => new NextResponse('Not found', { status: 404, headers: ARTIFACT_COMMON_HEADERS })

export const dynamic = 'force-dynamic'
/** Same reason as `/a/<token>`: this route resolves the token itself, so the Data Cache must stay off. */
export const fetchCache = 'force-no-store'
