import 'server-only'

import { jwtVerify, SignJWT } from 'jose'
import {
  ARTIFACT_VIEWER_SESSION_SECONDS,
  ArtifactAccessMode,
  isArtifactAccessMode,
} from '@/core/types/artifact.type'

/**
 * Cookie phiên người xem cho `/a/<token>` (spec R5).
 *
 * JWT HS256 ký bằng `ARTIFACT_VIEWER_SECRET` — cùng khuôn `TOOLBAR_SESSION_SECRET`
 * (`toolbar-session/route.ts`), KHÔNG PASETO: `paseto-ts` trong repo là v4.public bất đối xứng cho
 * token hai hop li2-app ↔ li2-ai; cookie này chỉ li2-app phát và li2-app đọc.
 *
 * Claims: `purpose` (để không nhầm với toolbar JWT cùng thuật toán), `tok` (token này, không token
 * khác — cookie đã `Path=/a/<token>` nhưng path là của trình duyệt, không phải của ta), `m` (chế độ
 * lúc phát), `v` (`access_version` lúc phát). Đổi chế độ HOẶC đổi mật khẩu đều tăng `v` → phiên chết.
 */
export const ARTIFACT_VIEWER_COOKIE = 'artifact_viewer'

const PURPOSE = 'artifact-viewer'
const ALG = 'HS256'

/** Secret phải đủ dài để HS256 có nghĩa. `openssl rand -hex 32` cho 64 ký tự. */
const MIN_SECRET_LENGTH = 32

export type ViewerSessionClaims = {
  token: string
  mode: ArtifactAccessMode
  accessVersion: number
}

export type ViewerSessionVerdict =
  | { ok: true }
  /**
   * Vì sao phiên không được nhận — CHỈ để chọn hint (R5: `v` lệch + mode password → "đã đổi mật
   * khẩu"). Mọi lý do đều là "không có phiên"; không lý do nào được nới thành "tạm cho qua".
   */
  | { ok: false; reason: 'absent' | 'invalid' | 'token' | 'mode' | 'version' }

/**
 * `null` khi secret thiếu hoặc quá ngắn. Route coi đó là 503 cho mọi chế độ không-public (spec R5):
 * KHÔNG fallback secret rỗng — một secret rỗng là một cookie ai cũng ký được.
 */
export function viewerSecret(): Uint8Array | null {
  const raw = process.env.ARTIFACT_VIEWER_SECRET
  if (!raw || raw.length < MIN_SECRET_LENGTH) return null
  return new TextEncoder().encode(raw)
}

export async function signViewerSession(claims: ViewerSessionClaims): Promise<string> {
  const secret = viewerSecret()
  if (!secret) throw new Error('ARTIFACT_VIEWER_SECRET is missing or shorter than 32 characters')

  const now = Math.floor(Date.now() / 1000)
  return new SignJWT({ purpose: PURPOSE, tok: claims.token, m: claims.mode, v: claims.accessVersion })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt(now)
    .setExpirationTime(now + ARTIFACT_VIEWER_SESSION_SECONDS)
    .sign(secret)
}

/**
 * Chữ ký + `exp` + `purpose` + `tok` + `m` + `v` — BẤT KỲ lệch nào = không có phiên. Thứ tự kiểm là
 * thứ tự tin cậy: chưa qua chữ ký thì không claim nào được đọc để chọn hint.
 */
export async function verifyViewerSession(
  cookieValue: string | undefined,
  expected: ViewerSessionClaims
): Promise<ViewerSessionVerdict> {
  if (!cookieValue) return { ok: false, reason: 'absent' }

  const secret = viewerSecret()
  if (!secret) return { ok: false, reason: 'invalid' }

  let payload: Record<string, unknown>
  try {
    payload = (await jwtVerify(cookieValue, secret, { algorithms: [ALG] })).payload
  } catch {
    return { ok: false, reason: 'invalid' }
  }

  if (payload.purpose !== PURPOSE) return { ok: false, reason: 'invalid' }
  if (payload.tok !== expected.token) return { ok: false, reason: 'token' }
  if (!isArtifactAccessMode(payload.m) || payload.m !== expected.mode)
    return { ok: false, reason: 'mode' }
  if (payload.v !== expected.accessVersion) return { ok: false, reason: 'version' }

  return { ok: true }
}

/**
 * Thuộc tính cookie, một chỗ duy nhất. `Path=/a/<token>` khớp cả `/a/<token>/file` và
 * `/a/<token>/download` (path-match là prefix + `/`), và KHÔNG gửi sang token khác. `Lax` đủ: mọi
 * request là top-level navigation hoặc same-origin `<video>`. Không `Domain`: cookie thuộc đúng host
 * app, không thuộc `.<root>` như cookie Casdoor — không có lý do để short link domain khác đọc nó.
 */
export function viewerCookieOptions(token: string, publicPath?: string | null) {
  return {
    name: ARTIFACT_VIEWER_COOKIE,
    // Qua short link (`artifact.<root>/<slug>`) cookie phải tới được `/<slug>`; vẫn host-only.
    path: publicPath ?? `/a/${token}`,
    httpOnly: true,
    secure: true,
    sameSite: 'lax' as const,
    maxAge: ARTIFACT_VIEWER_SESSION_SECONDS,
  }
}

/**
 * [P2] `state` của OAuth Google (spec R9): Google chỉ nhận MỘT redirect URI cố định (`/a/google/callback`),
 * nên token của artifact phải đi trong `state` — ký cùng secret, `purpose` riêng để một cookie viewer
 * không bao giờ được chấp nhận làm state (và ngược lại). `nonce` khớp với cookie `artifact_google_nonce`
 * để callback chắc đây là trình duyệt đã bắt đầu, không phải một state bị dán vào từ nơi khác.
 */
/**
 * Chuỗi `Set-Cookie` thô cho cookie viewer. Cần vì `NextResponse.cookies.set` khoá theo TÊN: đặt
 * hai lần cùng tên (khác `Path`) thì cái sau đè cái trước, trong khi qua short link host riêng ta cần
 * cả `Path=/<slug>` (trang) và `Path=/a/<token>` (`/file`, `/download`). Thêm bằng `headers.append`.
 */
export function viewerCookieHeader(token: string, value: string, publicPath?: string | null): string {
  const o = viewerCookieOptions(token, publicPath)
  return `${o.name}=${value}; Path=${o.path}; Max-Age=${o.maxAge}; HttpOnly; Secure; SameSite=Lax`
}

export const ARTIFACT_GOOGLE_NONCE_COOKIE = 'artifact_google_nonce'
const GOOGLE_STATE_PURPOSE = 'artifact-google-state'
const GOOGLE_STATE_SECONDS = 600

export async function signGoogleState(token: string, nonce: string): Promise<string> {
  const secret = viewerSecret()
  if (!secret) throw new Error('ARTIFACT_VIEWER_SECRET is missing or shorter than 32 characters')
  const now = Math.floor(Date.now() / 1000)
  return new SignJWT({ purpose: GOOGLE_STATE_PURPOSE, tok: token, nonce })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt(now)
    .setExpirationTime(now + GOOGLE_STATE_SECONDS)
    .sign(secret)
}

/** `null` cho mọi thứ không phải state hợp lệ của ta. Nonce KHÔNG kiểm ở đây — route so với cookie. */
export async function verifyGoogleState(
  state: string | null | undefined
): Promise<{ token: string; nonce: string } | null> {
  if (!state) return null
  const secret = viewerSecret()
  if (!secret) return null
  try {
    const { payload } = await jwtVerify(state, secret, { algorithms: [ALG] })
    if (payload.purpose !== GOOGLE_STATE_PURPOSE) return null
    if (typeof payload.tok !== 'string' || typeof payload.nonce !== 'string') return null
    return { token: payload.tok, nonce: payload.nonce }
  } catch {
    return null
  }
}

/** `Path=/a/` vì callback nằm ở `/a/google/callback`, không dưới `/a/<token>/`. Sống đúng bằng state. */
export function googleNonceCookieOptions() {
  return {
    name: ARTIFACT_GOOGLE_NONCE_COOKIE,
    path: '/a/',
    httpOnly: true,
    secure: true,
    sameSite: 'lax' as const,
    maxAge: GOOGLE_STATE_SECONDS,
  }
}
