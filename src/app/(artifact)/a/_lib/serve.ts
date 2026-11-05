import { NextRequest, NextResponse } from 'next/server'
// artifact-serve.service, NOT artifact.service: the latter imports touchPointService, which pulls
// in qr-code-styling and the native `canvas` binary. This public route must stay off that path.
import {
  artifactServeService,
  ArtifactServeLookup,
  ArtifactServeTarget,
} from '@/core/services/artifact-serve.service'
import {
  ArtifactGateUnavailableError,
  artifactGateService,
  GateVerdict,
} from '@/core/services/artifact-gate.service'
import {
  artifactCsp,
  artifactGateCsp,
  ARTIFACT_COMMON_HEADERS,
  ARTIFACT_LANDING_CSP,
  OFFICE_VIEWER_ORIGIN,
} from '@/core/helpers/artifact-csp'
import {
  ARTIFACT_LANDING_COPY,
  ArtifactLandingCopy,
  ArtifactLandingLanguage,
  escapeHtml,
  landingLanguageFor,
} from '@/core/helpers/artifact-landing'
import { landingShell, LI2_BRAND_MARK, ROBOT_MASCOT } from '@/core/helpers/artifact-landing-shell'
import { markdownPage } from './markdown-page'
import {
  gateUnavailablePage,
  googleGatePage,
  lockedGatePage,
  passwordGatePage,
  privateDeniedPage,
  privateLoginPage,
} from '@/core/helpers/artifact-gate-pages'
import {
  ARTIFACT_VIEWER_COOKIE,
  signViewerSession,
  viewerCookieHeader,
  viewerCookieOptions,
} from '@/core/helpers/artifact-viewer-session'
import { artifactPublicBase } from '@/core/helpers/artifact-public-url'
import { artifactNotFoundResponse } from '@/core/helpers/artifact-not-found'
import { verifyPassword } from '@/core/helpers/password-hash'
import { resolveVideoDelivery } from '@/core/helpers/artifact-video-delivery'
import { ARTIFACT_GATE_MAX_TRIES, ARTIFACT_KIND_SPECS } from '@/core/types/artifact.type'

/**
 * A Route Handler, NOT a page: `page.tsx` is wrapped in the root layout's `<html>` and providers, so
 * it cannot return a raw HTML document — and `dangerouslySetInnerHTML` never executes `<script>`,
 * which would leave every interactive artifact silently dead.
 *
 * The CSP comes from `artifactCsp(kind)` and from nowhere else. It used to be declared here AND in
 * `next.config.mjs`; two CSP headers on one response are enforced as their intersection, so the
 * config copy would have forced `sandbox` onto every kind regardless of what this file returns.
 * See the comment left in `next.config.mjs`.
 */
function headersFor(target: ArtifactServeTarget, contentType: string) {
  return {
    ...ARTIFACT_COMMON_HEADERS,
    'Content-Type': contentType,
    'Content-Security-Policy': artifactCsp(target.kind),
  }
}

/**
 * 404 — trang có theme, dùng chung với `/a/s/<org>/<slug>` và với middleware (qua `/a/not-found`).
 *
 * Trước đây là `new NextResponse('Not found')`: text thuần giữa một sản phẩm đã có bia mộ 410 và sáu
 * trang cổng cùng theme. Hàm chỉ nhận `Accept-Language` và không có tham số nào mô tả nguyên nhân —
 * `not-found` ở đây là token sai, org sai, slug sai, HOẶC artifact chưa `live`, và cả bốn phải không
 * phân biệt được từ bên ngoài. Vì vậy nó cũng dùng cho mọi nhánh "mất bytes" bên dưới: một artifact
 * `live` mà file đã bay khỏi storage không được phép trông khác một token bịa ra.
 */
const notFound = (request: NextRequest) =>
  artifactNotFoundResponse(request.headers.get('accept-language'))

/** The landing pages are li2's own markup, so they are always html — never the artifact's type. */
const LANDING_CONTENT_TYPE = 'text/html; charset=utf-8'

/**
 * `GET /a/<token>` và `GET /<org_slug>/<slug>` (host artifact, qua `/a/s/…`) dùng chung thân này.
 * `publicPath` khác null = đang phục vụ tại địa chỉ công khai; null = `/a/<token>` trên app.
 */
export async function serveArtifactGet(
  request: NextRequest,
  lookup: ArtifactServeLookup,
  token: string,
  publicPath: string | null
) {
  if (lookup.outcome === 'not-found') return notFound(request)

  /**
   * The language NAME, not just the copy: `<html lang>` has to come from the same decision as the
   * text. It used to be hardcoded `vi` while the copy already followed `Accept-Language` — an English
   * page declaring itself Vietnamese to every screen reader and translation prompt.
   */
  const language = landingLanguageFor(request.headers.get('accept-language'))
  const copy = ARTIFACT_LANDING_COPY[language]

  /**
   * 410 Gone, not 404. The row is still there, so this token DID serve content and the scanner
   * mistyped nothing — and that difference is the whole reason the page exists. An invented token
   * still gets 404 above, which is what keeps this page from lying about content that never existed.
   */
  if (lookup.outcome === 'removed') return tombstone(copy, language)

  const target = lookup.target

  /**
   * THE GATE, after the five resolve steps and before a single byte. `removed` above wins over every
   * mode — a tombstone has no form on it. What the verdict turns into (401/403/429/503 + which page)
   * lives in `gateResponse`, shared with POST so the two methods cannot disagree on a status code.
   */
  /**
   * `/a/<token>` mở TRỰC TIẾP trên app (điều hướng cấp cao nhất, không phải iframe/fetch) trong khi
   * artifact có địa chỉ công khai → đưa người xem sang `artifact.<root>/<org>/<slug>`. Short link
   * (li2-be 302 về `content_value` = `/a/<token>`) nhờ vậy kết thúc ở địa chỉ công khai mà không
   * phải ghi lại dữ liệu cũ. Chỉ khi: `Sec-Fetch-Dest: document` (curl/driver/iframe không có → giữ
   * nguyên), chưa có cookie viewer (đã mở khoá ở app thì xem tại app, không bắt nhập lại), và chế độ
   * public/password (private/google đặt cookie trên app host — đổi host sẽ vòng lặp; chờ hop xác thực).
   */
  if (
    publicPath === null &&
    target.publicPath &&
    request.headers.get('sec-fetch-dest') === 'document' &&
    !request.cookies.get(ARTIFACT_VIEWER_COOKIE) &&
    (target.access.mode === 'public' || target.access.mode === 'password')
  ) {
    const base = artifactPublicBase()
    if (base) {
      const to = new URL(base + target.publicPath)
      request.nextUrl.searchParams.forEach((v, k) => to.searchParams.set(k, v))
      return new NextResponse(null, {
        status: 302,
        headers: { ...ARTIFACT_COMMON_HEADERS, Location: to.toString() },
      })
    }
  }

  const verdict = await artifactGateService.evaluateGate(request, target)
  if (verdict.kind !== 'allow')
    return gateResponse(verdict, {
      copy,
      language,
      token,
      publicPath: publicPath ?? publicPathFrom(request),
    })

  const downloadUrl = `/a/${target.serveToken}/download`

  switch (ARTIFACT_KIND_SPECS[target.kind].serveMode) {
    /** The original path, unchanged: the user's own markup, under the sandbox policy. */
    case 'inline-html': {
      const content = await artifactServeService.getLiveContentByToken(token)
      if (!content) return notFound(request)

      return new NextResponse(content.body, {
        status: 200,
        headers: headersFor(target, content.contentType),
      })
    }

    /**
     * Markdown dựng thành HTML ở server rồi trả như một trang. Trả thẳng bytes `.md` thì trình
     * duyệt tải file về thay vì hiện ra — vô dụng với một link chia sẻ.
     *
     * Dùng chung `getLiveContentByToken` với `inline-html` vì cả hai đều cần NỘI DUNG dạng chuỗi,
     * khác với `getBytes` của nhánh nhị phân.
     */
    case 'markdown-render': {
      const content = await artifactServeService.getLiveContentByToken(token)
      if (!content) return notFound(request)

      return new NextResponse(markdownPage(target.name, content.body, language), {
        status: 200,
        headers: headersFor(target, LANDING_CONTENT_TYPE),
      })
    }

    /**
     * The user's bytes with their real type. `inline` so a PDF opens in the browser's viewer
     * instead of downloading — `/a/<token>/download` is the route that wants `attachment`.
     */
    case 'inline-binary': {
      const bytes = await artifactServeService.getBytes(target)
      if (!bytes) return notFound(request)

      // `new Uint8Array(buffer)` rather than the Buffer itself: `BodyInit` accepts a view, and
      // this one shares the same memory — no second copy of a 10MB file.
      return new NextResponse(new Uint8Array(bytes), {
        status: 200,
        headers: {
          ...headersFor(target, target.contentType),
          'Content-Disposition': 'inline',
          'Content-Length': String(bytes.byteLength),
        },
      })
    }

    /**
     * PowerPoint has no in-browser renderer we can rely on, so Microsoft's viewer renders it from a
     * short-lived signed URL. The bucket stays private; the URL is minted here, per render, and
     * never stored.
     */
    case 'office-viewer': {
      const signedUrl = await artifactServeService.createOfficeViewerUrl(target)
      if (!signedUrl) return notFound(request)

      return new NextResponse(officeViewerPage(target, signedUrl, copy, downloadUrl, language), {
        status: 200,
        headers: headersFor(target, LANDING_CONTENT_TYPE),
      })
    }

    /**
     * The <video> source is `/a/<token>/file`, which speaks Range. Pointing it straight at the
     * bytes here instead would cost the branding, the copy and the download button, and would make
     * `kind='video'` behave differently in a tab than in the detail page's preview iframe.
     */
    case 'video-landing': {
      // The <video> source is asked for, never assumed: `resolveVideoDelivery` is the single place
      // the strategy lives, so switching to a signed URL later is one function, not this file.
      const delivery = await resolveVideoDelivery(target)
      const videoSrc = delivery.mode === 'proxy' ? `/a/${target.serveToken}/file` : delivery.url

      return new NextResponse(videoPage(target, copy, downloadUrl, videoSrc, language), {
        status: 200,
        headers: headersFor(target, LANDING_CONTENT_TYPE),
      })
    }
  }
}

/**
 * `POST /a/<token>` — the password form (spec R6). The ONLY write on the public path, and it writes
 * nothing but a Redis counter and a cookie.
 *
 * The order repeats the five resolve steps and then does its own work, so a POST to a tombstone is
 * still a 410 and a POST to a public artifact is a 405 — the method does not get to see more than GET.
 *
 * Fail CLOSED on Redis: the counter is the only thing standing between this form and a dictionary.
 * `rate-limit.ts` fails OPEN and says why; this is the layer that decides authority, so it does not.
 */
export async function serveArtifactPost(request: NextRequest, token: string) {
  const lookup = await artifactServeService.resolveTargetByToken(token)
  if (lookup.outcome === 'not-found') return notFound(request)

  const language = landingLanguageFor(request.headers.get('accept-language'))
  const copy = ARTIFACT_LANDING_COPY[language]
  const page = { copy, language, token: token }

  if (lookup.outcome === 'removed') return tombstone(copy, language)

  const target = lookup.target
  if (target.access.mode !== 'password')
    return new NextResponse(null, {
      status: 405,
      headers: { ...ARTIFACT_COMMON_HEADERS, Allow: 'GET' },
    })

  try {
    const lock = await artifactGateService.readLock(token)
    if (lock.locked)
      return gateResponse({ kind: 'locked', retryAfterSeconds: lock.retryAfterSeconds }, page)

    const { password: submitted, returnTo } = await passwordFromForm(request)
    const correct = await verifyPassword(submitted, target.access.passwordHash)

    if (!correct) {
      const after = await artifactGateService.recordFailure(token)
      if (after.locked)
        return gateResponse({ kind: 'locked', retryAfterSeconds: after.retryAfterSeconds }, page)
      return gatePage(
        401,
        passwordGatePage(
          { ...page, publicPath: returnTo },
          { kind: 'wrong', triesLeft: ARTIFACT_GATE_MAX_TRIES - after.count }
        )
      )
    }

    // Order: cookie signed BEFORE the counter is cleared, so a missing secret cannot clear a lock and
    // then fail to let anyone in.
    const cookie = await signViewerSession({
      token: target.serveToken,
      mode: 'password',
      accessVersion: target.access.accessVersion,
    })
    await artifactGateService.clearFailures(token)

    const response = new NextResponse(null, {
      status: 303,
      headers: { ...ARTIFACT_COMMON_HEADERS, Location: returnTo ?? `/a/${target.serveToken}` },
    })
    /**
     * Qua short link host riêng, trang nằm ở `/<slug>` nhưng mọi tài nguyên con (`/a/<token>/file` cho
     * video và slides, `/download`) vẫn ở `/a/<token>/`. Một cookie `Path=/<slug>` không tới được
     * chúng — đo 17/10: trình phát video rỗng, Download 401 — nên đặt THÊM cookie mặc định
     * `Path=/a/<token>`. Hai cookie cùng tên, khác Path là hợp lệ và trình duyệt gửi đúng cái khớp.
     */
    response.cookies.set({ ...viewerCookieOptions(target.serveToken), value: cookie })
    if (returnTo)
      response.headers.append('Set-Cookie', viewerCookieHeader(target.serveToken, cookie, returnTo))
    return response
  } catch (error) {
    if (error instanceof ArtifactGateUnavailableError)
      return gateResponse({ kind: 'unavailable' }, page)
    // The secret is missing or unreadable: same page, same code — nothing about WHY leaves the server.
    return gateResponse({ kind: 'unavailable' }, page)
  }
}

/**
 * Only `application/x-www-form-urlencoded` (and multipart, which `formData()` also parses). Anything
 * else — a JSON body, a bare string — is an empty password, which is simply wrong and counts as a try.
 */
async function passwordFromForm(
  request: NextRequest
): Promise<{ password: string; returnTo: string | null }> {
  try {
    const form = await request.formData()
    const value = form.get('password')
    const returnTo = form.get('return_to')
    return {
      password: typeof value === 'string' ? value : '',
      returnTo: publicPathOrNull(typeof returnTo === 'string' ? returnTo : null),
    }
  } catch {
    return { password: '', returnTo: null }
  }
}

type GatePageContext = {
  copy: ArtifactLandingCopy
  language: ArtifactLandingLanguage
  token: string
  publicPath?: string | null
}

/**
 * Đường dẫn công khai khi nội dung được li2-be proxy từ short link (`artifact.<root>/<slug>`): header
 * `X-Artifact-Public-Path: /<slug>`. CHỈ nhận một đoạn slug (chữ, số, `._-`), không nhận `//`, không
 * nhận query — giá trị này sau đó thành `Location` và `Path` của cookie, nên bất cứ thứ gì ngoài slug
 * đều bị bỏ (về `/a/<token>`), không phải lỗi.
 */
const PUBLIC_PATH_RE = /^\/[A-Za-z0-9][A-Za-z0-9._-]{0,127}(\/[A-Za-z0-9][A-Za-z0-9._-]{0,127})?$/
/** `/a/...` là không gian nội bộ của app (token, file, download) — không bao giờ là địa chỉ công khai. */
const INTERNAL_PREFIX_RE = /^\/a(\/|$)/i
function publicPathOrNull(value: string | null): string | null {
  return value && PUBLIC_PATH_RE.test(value) && !INTERNAL_PREFIX_RE.test(value) ? value : null
}
function publicPathFrom(request: NextRequest): string | null {
  return publicPathOrNull(request.headers.get('x-artifact-public-path'))
}

/**
 * One verdict → one response, for GET and POST alike. Status codes are the public contract (spec §5):
 * 401 for "prove who you are", 403 for "we know who you are and no", 429 for the lock, 503 for "we
 * cannot check right now". None of these pages carries the artifact's name.
 */
function gateResponse(verdict: Exclude<GateVerdict, { kind: 'allow' }>, page: GatePageContext) {
  switch (verdict.kind) {
    case 'password-required':
      return gatePage(
        401,
        passwordGatePage(page, verdict.hint === 'changed' ? { kind: 'changed' } : { kind: 'fresh' })
      )
    case 'locked':
      return gatePage(429, lockedGatePage(page, verdict.retryAfterSeconds), {
        'Retry-After': String(verdict.retryAfterSeconds),
      })
    case 'private-login':
      return gatePage(401, privateLoginPage(page))
    case 'private-denied':
      // The switch-account form POSTs to 'self' and is then redirected to Casdoor; Chrome checks
      // `form-action` against the redirect target too, so Casdoor's origin has to be allowed HERE.
      return gatePage(403, privateDeniedPage(page, verdict.email), {}, casdoorOrigin())
    case 'google-required':
      return gatePage(401, googleGatePage(page, verdict.hint))
    case 'unavailable':
      return gatePage(503, gateUnavailablePage(page))
  }
}

function gatePage(
  status: number,
  html: string,
  extraHeaders: Record<string, string> = {},
  extraFormAction?: string
) {
  return new NextResponse(html, {
    status,
    headers: {
      ...ARTIFACT_COMMON_HEADERS,
      'Content-Type': LANDING_CONTENT_TYPE,
      'Content-Security-Policy': artifactGateCsp(extraFormAction),
      ...extraHeaders,
    },
  })
}

/** Origin only — `form-action` takes a source expression, and a full URL with a path would not match. */
function casdoorOrigin(): string | undefined {
  try {
    return new URL(process.env.NEXT_PUBLIC_CASDOOR_APP_URL ?? '').origin
  } catch {
    return undefined
  }
}

function tombstone(copy: ArtifactLandingCopy, language: ArtifactLandingLanguage) {
  return new NextResponse(removedPage(copy, language), {
    status: 410,
    headers: {
      ...ARTIFACT_COMMON_HEADERS,
      'Content-Type': LANDING_CONTENT_TYPE,
      'Content-Security-Policy': ARTIFACT_LANDING_CSP,
    },
  })
}

/**
 * `encodeURIComponent` on the signed URL is load-bearing, not tidiness: the Supabase URL carries
 * its own `?token=...`, and concatenating it raw would merge that query into `embed.aspx`'s own,
 * handing Microsoft a truncated URL and showing a blank frame with no error of ours to find.
 *
 * The download link is rendered immediately and never hidden. An iframe on another origin cannot
 * report success or failure back to us, so "show the button once we detect a problem" is a promise
 * this page cannot keep.
 */
function officeViewerPage(
  target: ArtifactServeTarget,
  signedUrl: string,
  copy: ArtifactLandingCopy,
  downloadUrl: string,
  language: ArtifactLandingLanguage
) {
  const name = escapeHtml(target.name)
  const src = `${OFFICE_VIEWER_ORIGIN}/op/embed.aspx?src=${encodeURIComponent(signedUrl)}`

  return landingShell(
    name,
    `<iframe class="viewer" src="${escapeHtml(src)}" title="${name}" referrerpolicy="no-referrer"></iframe>
    <p class="note">${escapeHtml(copy.office_loading)}</p>
    <p class="note">${escapeHtml(copy.office_privacy)}</p>
    <p><a class="download" href="${escapeHtml(downloadUrl)}">${escapeHtml(copy.download)}</a></p>`,
    language
  )
}

function videoPage(
  target: ArtifactServeTarget,
  copy: ArtifactLandingCopy,
  downloadUrl: string,
  videoSrc: string,
  language: ArtifactLandingLanguage
) {
  const name = escapeHtml(target.name)
  const fileUrl = escapeHtml(videoSrc)

  return landingShell(
    name,
    `<video class="viewer" controls preload="metadata" playsinline>
      <source src="${fileUrl}" type="${escapeHtml(target.contentType)}" />
      ${escapeHtml(copy.video_unsupported)}
    </video>
    <p><a class="download" href="${escapeHtml(downloadUrl)}">${escapeHtml(copy.download)}</a></p>`,
    language
  )
}

/**
 * The tombstone page. Built on `landingShell` like the other two — a second shell would be a second
 * place for the dark-mode colours and the `lang` attribute to drift.
 *
 * Both SVGs are inline, and that is not a preference: the CSP here is `default-src 'none'`, so a
 * remote image or a webfont would not load at all.
 *
 * `copy.removed_title` is passed as the shell's title, so it lands in BOTH `<title>` and `<h1>`. That
 * is the intent — the `<title>` of a tombstone must not be the name of the artifact that was removed.
 *
 * NO `target.name` anywhere on this page. The name of removed content is the org's information, not
 * the scanner's — and it is also the one user-typed string that would need strict escaping here.
 * Leaving it out removes a whole class of risk along with it.
 *
 * Everything interpolated still goes through `escapeHtml`, even though all of it is a constant today:
 * today's constant is next month's editable string.
 */
function removedPage(copy: ArtifactLandingCopy, language: ArtifactLandingLanguage) {
  /**
   * The mockup puts the brand and the icon ABOVE the heading, which is why `landingShell` takes an
   * `aboveTitle` slot rather than this page building its own document.
   *
   * Icon thùng rác lucide bị mascot thay — cùng một lý do như các trang cổng: khách gặp bia mộ ngay
   * sau khi quét QR, và nó phải cùng một giao diện với trang mật khẩu short link của li2-be.
   */
  const aboveTitle = `${LI2_BRAND_MARK}
    ${ROBOT_MASCOT}`

  return landingShell(
    escapeHtml(copy.removed_title),
    `<p>${escapeHtml(copy.removed_body)}</p>
    <div class="gone-reassure">
      <b>${escapeHtml(copy.removed_reassure_strong)}</b><br />
      ${escapeHtml(copy.removed_reassure_body)}
    </div>
    <p class="gone-foot">${escapeHtml(copy.removed_footer)} <a href="https://li2.ai">Li2</a></p>`,
    language,
    aboveTitle,
    'gate'
  )
}
