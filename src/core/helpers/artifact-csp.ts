import { ARTIFACT_KIND_SPECS, ArtifactUploadKind } from '@/core/types/artifact.type'

/**
 * Where Office Online renders a .pptx. Named here rather than inlined so the CSP and the iframe
 * `src` that must match it cannot drift apart.
 */
export const OFFICE_VIEWER_ORIGIN = 'https://view.officeapps.live.com'

/**
 * The html policy, character for character as it has always been. Do not "tidy" it.
 *
 * `sandbox` WITHOUT `allow-same-origin` is the load-bearing part: the document runs in an opaque
 * origin, so it cannot read the dashboard's cookies or localStorage. `connect-src 'none'` and
 * `form-action 'none'` close the other half — the Casdoor cookie is `sameSite: 'lax'` (sent on
 * top-level navigations and same-site requests), so an
 * artifact left able to fetch or POST could drive `/api/...` with the visitor's credentials
 * attached. `'self'` is meaningless in an opaque origin, hence the bare source lists.
 */
const HTML_CSP =
  "sandbox allow-scripts allow-popups allow-modals; default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: https:; font-src data: https:; connect-src 'none'; form-action 'none'; frame-ancestors 'self'; base-uri 'none'"

/**
 * THE only place a CSP for `/a/*` is decided.
 *
 * It used to be decided in two places — here and `next.config.mjs` — which was safe while html was
 * the only kind and both strings were identical. Two CSP headers on one response are enforced as
 * their INTERSECTION, not as a fallback, so the config copy would have pinned `sandbox` onto every
 * new kind regardless of what this function returns. The config copy is gone; see the comment
 * there.
 *
 * `sandbox` applies to `html` ALONE. That is not an oversight:
 *
 * - A PDF or an MP4 response produces no HTML document and runs no script of ours or theirs, so
 *   `sandbox` buys nothing — it only makes Chrome refuse to open its PDF viewer and makes `'self'`
 *   meaningless inside our own landing pages.
 * - For `slides` it is actively destructive: an opaque origin voids `frame-src`, so the Office
 *   viewer iframe silently never loads, with no console error of ours to find.
 * - For `video` the landing page is OUR markup, so `media-src 'self'` is a real statement about a
 *   real origin. Add `sandbox` and `'self'` stops referring to anything and the video dies quietly.
 *
 * `frame-ancestors 'self'` stays on every kind: the artifact detail page iframes this route.
 */
export function artifactCsp(kind: ArtifactUploadKind): string {
  if (ARTIFACT_KIND_SPECS[kind].sandboxed) return HTML_CSP

  const directives = [
    "default-src 'none'",
    "img-src 'self' data:",
    "style-src 'unsafe-inline'",
    "form-action 'none'",
    "frame-ancestors 'self'",
    "base-uri 'none'",
  ]

  if (kind === 'pdf')
    // The browser's PDF viewer is a plugin, and `default-src 'none'` refuses it. Without this the
    // frame is blank with nothing in our logs — the refusal is inside the browser, not in our code.
    directives.push("object-src 'self'")
  // Suy từ serveMode, KHÔNG liệt kê kind: `document` và `sheet` gia nhập office-viewer ngày
  // 2026-10-24 và dòng này vẫn chỉ nói 'slides', nên CSP của chúng thiếu `frame-src` và
  // `default-src 'none'` chặn thẳng iframe — trang hiện ra với một khung TRẮNG, lỗi nằm trong
  // console của khách chứ không có gì trong log của li2. Đúng lớp lỗi mà chú thích ở đầu file
  // này cảnh báo, và nó đã tái diễn một lần rồi.
  if (ARTIFACT_KIND_SPECS[kind].serveMode === 'office-viewer')
    directives.push(`frame-src ${OFFICE_VIEWER_ORIGIN}`)
  // The <video> on the landing page points at /a/<token>/file, same origin. If
  // `resolveVideoDelivery` ever returns a signed URL instead, this has to name that host too.
  if (kind === 'video') directives.push("media-src 'self'")

  return directives.join('; ')
}

/**
 * CSP for a landing page tied to NO kind — today that is only the "taken down" page.
 *
 * Exactly the directives of the non-sandbox branch of `artifactCsp`, minus the kind-dependent ones
 * (`object-src` for pdf, `frame-src` for slides, `media-src` for video): this page embeds nothing and
 * plays nothing. `default-src 'none'` is why the logo must be an inline `<svg>` — a webfont or a
 * remote image simply would not load. `style-src 'unsafe-inline'` covers the `<style>` block in
 * `landingShell` and nothing else; there is no script on the page.
 *
 * NO `sandbox`: this is li2's own markup, not a user's bytes. Sandboxing it would only make `'self'`
 * refer to nothing, which buys exactly nothing here.
 *
 * A separate constant rather than widening `artifactCsp` to take `ArtifactUploadKind | 'landing'`:
 * that would make the function's parameter stop being a kind, and `artifact-csp.test.ts` iterates
 * `ARTIFACT_UPLOAD_KINDS` to cover it exhaustively.
 */
export const ARTIFACT_LANDING_CSP = [
  "default-src 'none'",
  "img-src 'self' data:",
  "style-src 'unsafe-inline'",
  "form-action 'none'",
  "frame-ancestors 'self'",
  "base-uri 'none'",
].join('; ')

/**
 * CSP cho bốn trang CỔNG do li2 render ở `/a/<token>` (401 mật khẩu, 429 khoá, 401 mời đăng nhập,
 * 403 sai tài khoản) — spec R8.
 *
 * Giống `ARTIFACT_LANDING_CSP` ở mọi chỉ thị TRỪ `form-action`: trang cổng có `<form method="post">`
 * về chính origin, nên `'none'` ở đây là một form không bao giờ gửi được. Một HÀM riêng chứ không nới
 * hằng cũ, vì bia mộ 410 dùng `ARTIFACT_LANDING_CSP` và không có lý do gì để trang đó được POST đi đâu.
 *
 * `extraFormAction`: trang 403 có form đổi tài khoản POST về `'self'` rồi 303 sang Casdoor; Chrome áp
 * `form-action` lên cả redirect chain (CSP3), nên origin Casdoor phải có tên ở đây — và CHỈ ở trang
 * đó. Truyền origin (`https://host`), không truyền URL đầy đủ.
 *
 * Đây là nới một lớp phòng thủ có chủ đích: lý lẽ gốc ở `HTML_CSP` (form của artifact có thể lợi dụng
 * cookie Casdoor) không áp cho form do li2 dựng. Không `sandbox`, không `script-src`: trang không
 * có script, và `sandbox` sẽ làm `'self'` không còn trỏ vào đâu.
 */
export function artifactGateCsp(extraFormAction?: string): string {
  const formAction = extraFormAction
    ? `form-action 'self' ${extraFormAction}`
    : "form-action 'self'"
  return [
    "default-src 'none'",
    "img-src 'self' data:",
    "style-src 'unsafe-inline'",
    formAction,
    "frame-ancestors 'self'",
    "base-uri 'none'",
  ].join('; ')
}

/**
 * Headers every artifact response carries whatever the kind. Mirrors the four left in
 * `next.config.mjs`, and set here too so a test can assert them without going through the config.
 *
 * `Referrer-Policy: no-referrer` matters most for `slides`: without it the iframe's request to
 * Microsoft carries a Referer containing `/a/<token>`, handing the link itself to a third party.
 */
export const ARTIFACT_COMMON_HEADERS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow',
  'Referrer-Policy': 'no-referrer',
} as const
