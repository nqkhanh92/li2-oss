import { NextRequest, NextResponse } from 'next/server'
// artifact-serve.service, NOT artifact.service — same import-graph rule as every route under /a/.
import { artifactServeService } from '@/core/services/artifact-serve.service'
import { artifactGateService } from '@/core/services/artifact-gate.service'
import { ARTIFACT_COMMON_HEADERS } from '@/core/helpers/artifact-csp'
import { hasArtifactGoogleClient } from '@/core/helpers/artifact-google'
import { artifactGoogleVerifiedEmail, createArtifactGoogleClient } from '@/core/helpers/artifact-google-oauth'
import {
  ARTIFACT_GOOGLE_NONCE_COOKIE,
  googleNonceCookieOptions,
  signViewerSession,
  verifyGoogleState,
  viewerCookieOptions,
} from '@/core/helpers/artifact-viewer-session'
import { logger } from '@/infrastructure/logging/logger'

const log = logger.child({ module: 'artifact-google-callback' })

/**
 * [P2] `GET /a/google/callback` — MỘT URL cố định cho mọi artifact (Google không nhận wildcard), token
 * lấy từ `state` (spec R9).
 *
 * Mọi đường ra đều là 303 về `/a/<token>` với `?g=`: `cancelled` khi người dùng bấm Huỷ ở Google,
 * `failed` cho mọi thứ khác (state hỏng, nonce lệch, không email, email chưa verified, lỗi mạng).
 * Không có `state` đọc được thì không biết quay về đâu → 400 trần. Trang `/a/<token>` đổi `?g=` thành
 * hai câu khác nhau (M2.8/M2.9).
 *
 * Thành công: ghi `customer_profiles` + `artifact_views` (thất bại → vẫn phục vụ, R9 bước 3), đặt cookie
 * `artifact_viewer` với `m: 'google'`, xoá cookie nonce. KHÔNG lưu access/refresh/id token, KHÔNG
 * `name`/`picture`. Không cookie Casdoor nào được đặt — người xem không phải user li2 (A25).
 */
export async function GET(request: NextRequest) {
  if (!hasArtifactGoogleClient()) return new NextResponse('Not found', { status: 404, headers: ARTIFACT_COMMON_HEADERS })

  const params = request.nextUrl.searchParams
  const state = await verifyGoogleState(params.get('state'))
  if (!state) return new NextResponse('Bad request', { status: 400, headers: ARTIFACT_COMMON_HEADERS })

  const back = (hint: 'cancelled' | 'failed' | null) => {
    const location = hint ? `/a/${state.token}?g=${hint}` : `/a/${state.token}`
    const response = new NextResponse(null, { status: 303, headers: { ...ARTIFACT_COMMON_HEADERS, Location: location } })
    response.cookies.set({ ...googleNonceCookieOptions(), value: '', maxAge: 0 })
    return response
  }

  if (params.get('error') === 'access_denied') return back('cancelled')
  if (params.get('error')) return back('failed')

  // Nonce: cookie đặt lúc bắt đầu phải khớp claim trong state. Không cookie = trình duyệt khác (hoặc đã
  // quá 10 phút) = không tin.
  if (request.cookies.get(ARTIFACT_GOOGLE_NONCE_COOKIE)?.value !== state.nonce) return back('failed')

  const code = params.get('code')
  if (!code) return back('failed')

  const lookup = await artifactServeService.resolveTargetByToken(state.token)
  if (lookup.outcome !== 'live' || lookup.target.access.mode !== 'google') return back('failed')
  const target = lookup.target

  let email: string | null
  try {
    email = await artifactGoogleVerifiedEmail(createArtifactGoogleClient(), code)
  } catch (error) {
    log.error({ err: error, artifactId: target.id }, 'Google token exchange failed')
    return back('failed')
  }
  if (!email) return back('failed')

  await artifactGateService.recordGoogleViewer(target, email)

  let cookie: string
  try {
    cookie = await signViewerSession({ token: target.serveToken, mode: 'google', accessVersion: target.access.accessVersion })
  } catch (error) {
    log.error({ err: error, artifactId: target.id }, 'Cannot sign the viewer cookie after Google sign-in')
    return back('failed')
  }

  const response = back(null)
  response.cookies.set({ ...viewerCookieOptions(target.serveToken), value: cookie })
  return response
}

export const dynamic = 'force-dynamic'
/** Resolves the token from `state`, so the on-disk Data Cache must stay off here too. */
export const fetchCache = 'force-no-store'
