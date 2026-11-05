import 'server-only'

import {
  ArtifactLandingCopy,
  ArtifactLandingLanguage,
  escapeHtml,
  fillCopy,
} from '@/core/helpers/artifact-landing'
import {
  ARROW_ICON,
  landingShell,
  LI2_BRAND_MARK,
  ROBOT_MASCOT,
} from '@/core/helpers/artifact-landing-shell'
import { ARTIFACT_PASSWORD_MIN_LENGTH } from '@/core/types/artifact.type'

/**
 * Bốn trang cổng của `/a/<token>` + trang 503 (spec R6, R7, R9, R11). Tất cả dựng trên `landingShell`
 * như bia mộ, và theo cùng ba quy tắc của bia mộ:
 *
 * - KHÔNG `target.name` ở bất kỳ đâu: tên nội dung chưa mở được là thông tin của org, không của người
 *   đứng trước cổng (`route.ts` bia mộ nói cùng điều này).
 * - KHÔNG script. Trạng thái "Đang kiểm tra…" của proto cần JS nên bị bỏ (spec §8.7); trình duyệt
 *   tự hiện tiến trình điều hướng.
 * - Mọi chuỗi đi qua `escapeHtml`/`fillCopy`, kể cả hằng — hằng hôm nay là chuỗi sửa được tháng sau.
 *
 * `action` của form luôn TƯỜNG MINH (`/a/<token>`), không dựa URL hiện tại: token lấy từ `params`
 * đã qua `SERVE_TOKEN_PATTERN`, nên chuỗi này không thể chứa gì ngoài 16 ký tự hex.
 */
/** Origin của app (không dấu `/` cuối). Rỗng nếu env thiếu → link tương đối như cũ. */
function appOrigin(): string {
  const base = process.env.NEXT_PUBLIC_APP_BASE_URL ?? ''
  try {
    return base ? new URL(base).origin : ''
  } catch {
    return ''
  }
}

/**
 * `publicPath`: đường dẫn người xem đang thấy khi nội dung được phục vụ qua short link
 * (`artifact.<root>/<slug>` — li2-be proxy, header `X-Artifact-Public-Path`). Form vẫn POST về
 * `/a/<token>` (đi thẳng tới app, không qua li2-be nên không tính thêm visit); giá trị này chỉ đi
 * theo form để response 303 và cookie quay về đúng `/<slug>`.
 */
type Page = {
  copy: ArtifactLandingCopy
  language: ArtifactLandingLanguage
  token: string
  publicPath?: string | null
}

/**
 * Mascot thay cho ba icon lucide (khoá / người / đồng hồ) từng đứng trên tiêu đề. Trang mật khẩu
 * short link của li2-be chỉ có mascot, và đây là lý do duy nhất để các trang này tồn tại theo cùng
 * một giao diện: khác biệt giữa các cổng do TIÊU ĐỀ nói, không do icon.
 */
const ABOVE_TITLE = ROBOT_MASCOT

/**
 * Logo Google bốn màu — ngoại lệ DUY NHẤT với quy tắc màu theo token, chép từ proto `:1380` (proto ghi
 * rõ). Bốn màu là thương hiệu của Google, không phải của li2; đổi theo dark mode là sai thương hiệu.
 */
const GOOGLE_LOGO = `<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2.5 24 .5 14.6.5 6.5 5.8 2.6 13.6l7.8 6.1C12.3 13.2 17.6 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-2.8-.4-4.1H24v8.2h12.6c-.3 2.1-1.6 5.2-4.6 7.3l7.6 5.9c4.5-4.2 6.5-10.2 6.5-17.3z"/><path fill="#FBBC05" d="M10.4 28.3A14.6 14.6 0 0 1 9.6 24c0-1.5.3-3 .7-4.3l-7.8-6.1A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.8-6.4z"/><path fill="#34A853" d="M24 47.5c6.2 0 11.5-2 15.6-5.6l-7.6-5.9c-2 1.4-4.7 2.4-8 2.4-6.4 0-11.7-3.7-13.6-9.1l-7.8 6.4C6.5 42.2 14.6 47.5 24 47.5z"/></svg>`

const footer = (copy: ArtifactLandingCopy) =>
  `<p class="gone-foot">${escapeHtml(copy.removed_footer)} <a href="https://li2.ai">Li2</a></p>`

/**
 * 404 — "Không tìm thấy trang này". Dùng chung cho BA nguyên nhân khác nhau và đó là điểm chính của
 * nó: org sai, slug sai, và artifact tồn tại nhưng chưa ở trạng thái `live` đều phải trả về đúng một
 * trang này, từng byte. Một trang khác nhau (hay chỉ một chữ khác nhau) giữa các nguyên nhân là một
 * oracle: người ngoài gõ thử `/<org>/<slug>` hàng loạt và đọc được org nào có thật, slug nào đã được
 * đặt. Vì vậy hàm này KHÔNG nhận tham số nào ngoài `copy`/`language` — không có chỗ để nhét lý do vào.
 *
 * Giống bia mộ 410 (`serve.ts:removedPage`) về khung và giọng: `landingShell(..., 'gate')`, dấu
 * thương hiệu + mascot ở trên tiêu đề, footer "Đường dẫn này chạy trên Li2".
 *
 * KHÁC bia mộ ở hai điểm, cả hai đều có lý do:
 *  - KHÔNG có khối "Mã QR của bạn không hỏng": bia mộ biết chắc người quét đã quét đúng (dòng dữ liệu
 *    vẫn còn), còn ở đây ta không biết gì — trấn an như vậy sẽ là một câu nói sai.
 *  - KHÔNG có nút quay về app: host artifact là mặt công khai, người xem thường không có tài khoản li2,
 *    và một nút "Về trang chủ" ở đây chỉ dẫn họ tới trang đăng nhập.
 */
export function notFoundPage(copy: ArtifactLandingCopy, language: ArtifactLandingLanguage) {
  return landingShell(
    escapeHtml(copy.not_found_title),
    `<p>${escapeHtml(copy.not_found_body)}</p>
    ${footer(copy)}`,
    language,
    `${LI2_BRAND_MARK}
    ${ROBOT_MASCOT}`,
    'gate'
  )
}

export type PasswordPageState =
  | { kind: 'fresh' }
  /** Phiên cũ có chữ ký đúng nhưng `access_version` lệch → "Mật khẩu đã được đổi." */
  | { kind: 'changed' }
  /** Vừa nhập sai; `triesLeft` ≥ 1 (0 là trang khoá, không phải trang này). */
  | { kind: 'wrong'; triesLeft: number }

/**
 * M2.5 — 401, form POST thật. `autocomplete="current-password"` để trình quản lý mật khẩu điền được;
 * `minlength` khớp `ARTIFACT_PASSWORD_MIN_LENGTH` nên trình duyệt chặn một mật khẩu chắc chắn sai trước
 * khi tốn một lượt thử; `autofocus` vì cả trang chỉ có một việc để làm.
 */
export function passwordGatePage(
  { copy, language, token, publicPath }: Page,
  state: PasswordPageState
) {
  const returnTo = publicPath
    ? `<input type="hidden" name="return_to" value="${escapeHtml(publicPath)}" />`
    : ''
  const message =
    state.kind === 'changed'
      ? `<p class="gate-hint">${escapeHtml(copy.gate_password_changed)}</p>`
      : state.kind === 'wrong'
        ? `<p class="gate-err" id="password-error">${fillCopy(copy.gate_password_wrong, { n: state.triesLeft })}</p>`
        : ''
  const inputClass = state.kind === 'wrong' ? 'gate-input bad' : 'gate-input'
  const describedBy = state.kind === 'wrong' ? ' aria-describedby="password-error"' : ''

  return landingShell(
    escapeHtml(copy.gate_password_title),
    `<p class="gate-lead">${escapeHtml(copy.gate_password_lead)}</p>
    <form class="gate-form" method="post" action="/a/${escapeHtml(token)}">
      <label class="gate-label" for="password">${escapeHtml(copy.gate_password_label)}</label>
      <input class="${inputClass}" id="password" name="password" type="password" autocomplete="current-password" required minlength="${ARTIFACT_PASSWORD_MIN_LENGTH}" autofocus${describedBy} />
      ${returnTo}
      ${message}
      <button class="gate-btn" type="submit"><span>${escapeHtml(copy.gate_password_submit)}</span>${ARROW_ICON}</button>
    </form>
    ${footer(copy)}`,
    language,
    ABOVE_TITLE,
    'gate'
  )
}

/** M2.6 — 429. KHÔNG ô nhập: thử tiếp là vô nghĩa và người đứng trước cổng cần biết điều đó. */
export function lockedGatePage({ copy, language }: Page, retryAfterSeconds: number) {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60))
  return landingShell(
    escapeHtml(copy.gate_locked_title),
    `<p class="gate-lead">${fillCopy(copy.gate_locked_lead, { m: minutes })}</p>
    ${footer(copy)}`,
    language,
    ABOVE_TITLE,
    'gate'
  )
}

/**
 * M2.7a — 401, mời đăng nhập li2. `redirect_to` dựng server-side từ token đã qua pattern — không open
 * redirect; `/auth/callback` còn kiểm cùng origin lần nữa trước khi quay về.
 */
export function privateLoginPage({ copy, language, token }: Page) {
  // TUYỆT ĐỐI, không tương đối: trang này có thể được phục vụ tại `artifact.<root>/<slug>` (li2-be
  // proxy), nơi chỉ `/a/*` được route sang app — `/auth/login` tương đối ở đó là 404 (đo 17/10).
  const href = `${appOrigin()}/auth/login?redirect_to=${encodeURIComponent(`/a/${token}`)}`
  return landingShell(
    escapeHtml(copy.gate_private_title),
    `<p class="gate-lead">${escapeHtml(copy.gate_private_lead)}</p>
    <a class="gate-btn" href="${escapeHtml(href)}"><span>${escapeHtml(copy.gate_private_button)}</span>${ARROW_ICON}</a>
    ${footer(copy)}`,
    language,
    ABOVE_TITLE,
    'gate'
  )
}

/**
 * M2.7b — 403. Form POST (không `<a>` GET) vì đổi tài khoản có side effect: xoá cookie app rồi đăng
 * xuất Casdoor. Dòng email bỏ hẳn khi rỗng, không in "Đang đăng nhập: ".
 */
export function privateDeniedPage({ copy, language, token }: Page, email: string | null) {
  const signedInAs = email
    ? `<p class="gate-email">${fillCopy(copy.denied_signed_in_as, { email })}</p>`
    : ''
  return landingShell(
    escapeHtml(copy.denied_title),
    `${signedInAs}
    <p class="gate-lead">${escapeHtml(copy.denied_lead)}</p>
    <form class="gate-form" method="post" action="/a/${escapeHtml(token)}/switch-account">
      <button class="gate-btn" type="submit"><span>${escapeHtml(copy.denied_switch_button)}</span>${ARROW_ICON}</button>
    </form>
    ${footer(copy)}`,
    language,
    ABOVE_TITLE,
    'gate'
  )
}

/** 503 — Redis lỗi hoặc secret thiếu. Fail CLOSED: không form, không nội dung, không nói vì sao. */
export function gateUnavailablePage({ copy, language }: Page) {
  return landingShell(
    escapeHtml(copy.gate_unavailable_title),
    `<p class="gate-lead">${escapeHtml(copy.gate_unavailable_lead)}</p>
    ${footer(copy)}`,
    language,
    ABOVE_TITLE,
    'gate'
  )
}

export type GoogleGateHint = 'none' | 'cancelled' | 'failed'

/**
 * [P2] M2.8 — 401, nút Google. Hai tiêu đề khác nhau cho `cancelled` (giữ tiêu đề mời) và `failed`
 * ("Chưa đăng nhập được") — proto `:1455-1460` ghi rõ. Dòng "email được ghi lại" đứng TRƯỚC nút.
 */
export function googleGatePage({ copy, language, token }: Page, hint: GoogleGateHint) {
  const title = hint === 'failed' ? copy.gate_google_failed_title : copy.gate_google_title
  const lead =
    hint === 'failed'
      ? `<p class="gate-lead">${escapeHtml(copy.gate_google_failed_lead)}</p>`
      : hint === 'cancelled'
        ? `<p class="gate-lead">${escapeHtml(copy.gate_google_cancelled)}</p>`
        : ''
  return landingShell(
    escapeHtml(title),
    `${lead}
    <p class="gate-lead">${escapeHtml(copy.gate_google_lead)}</p>
    <a class="gate-btn" href="/a/${escapeHtml(token)}/google">${GOOGLE_LOGO}<span>${escapeHtml(copy.gate_google_button)}</span></a>
    ${footer(copy)}`,
    language,
    ABOVE_TITLE,
    'gate'
  )
}
