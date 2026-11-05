import 'server-only'

/**
 * Copy for the landing pages `/a/<token>` builds — for `slides`, for `video`, and for the tombstone
 * page a removed artifact answers 410 with.
 *
 * DELIBERATELY NOT in `public/lang/*` and deliberately not going through i18next.
 *
 * `/a/<token>` is the one public, unauthenticated route in the app, and it already paid for this
 * lesson once: folding it into `ArtifactService` put `touchPointService` on its import path, which
 * pulled in `qr-code-styling` and the native `canvas` binary, and every request for a missing
 * artifact turned into a 500 (`artifact-serve.service.ts:11-21`). Pulling the i18next runtime onto
 * that path to render four strings would be the same trade.
 *
 * The cost is that `i18n-keys.test.ts` does not cover this record. A test in its place asserts
 * every language carries the same key set.
 */
export const ARTIFACT_LANDING_COPY = {
  vi: {
    download: 'Tải về',
    office_loading: 'Đang mở bằng Office viewer…',
    office_privacy:
      'Để hiển thị slide, Microsoft tải file này về. Không muốn vậy thì dùng nút Tải về.',
    video_unsupported: 'Trình duyệt này không phát được video. Bấm Tải về để xem.',
    removed_title: 'Nội dung này đã được gỡ',
    removed_body: 'Người đăng đã gỡ nội dung ở đường dẫn này xuống.',
    /**
     * The reason this page exists. It blocks the wrong conclusion the scanner is about to reach — "the
     * printed code is broken" — and the four more scans that follow it.
     */
    removed_reassure_strong: 'Mã QR của bạn không hỏng.',
    removed_reassure_body:
      'Bạn đã quét đúng. Hãy liên hệ nơi đặt mã này để nhận nội dung mới nhất.',
    /**
     * Deliberately WITHOUT the word "Li2": the brand is the text of an `<a>`, joined in the markup, so
     * it needs no key of its own per language. Both word orders allow the name at the end.
     */
    removed_footer: 'Đường dẫn này chạy trên',
    /**
     * 404 — DÙNG CHUNG cho "org sai", "slug sai", "artifact chưa xuất bản" và mọi đường lạ trên host
     * artifact. Một chữ khác nhau giữa các nguyên nhân là một oracle để dò xem artifact nào tồn tại,
     * nên câu này cố tình không nói gì về nội dung.
     */
    not_found_title: 'Không tìm thấy trang này',
    not_found_body:
      'Đường dẫn này có thể bị gõ sai, đã được đổi, hoặc chưa từng tồn tại. Hãy kiểm tra lại đường dẫn, hoặc hỏi nơi bạn nhận được nó.',
    /** Trang cổng (spec R11). `{n}`, `{m}`, `{email}` thay chuỗi RỒI escapeHtml toàn câu. */
    gate_password_title: 'Nội dung này cần mật khẩu',
    gate_password_lead: 'Người gửi link đã đặt mật khẩu. Nhập mật khẩu để xem.',
    gate_password_label: 'Mật khẩu',
    gate_password_submit: 'Xem nội dung',
    gate_password_wrong: 'Mật khẩu không đúng. Còn {n} lần thử.',
    gate_password_changed: 'Mật khẩu đã được đổi. Nhập mật khẩu mới.',
    gate_locked_title: 'Đã thử quá nhiều lần',
    gate_locked_lead: 'Thử lại sau {m} phút, hoặc hỏi người gửi link mật khẩu đúng.',
    gate_private_title: 'Nội dung này dành cho thành viên',
    gate_private_lead: 'Đăng nhập li2 để xem. Nếu bạn không có tài khoản li2, hỏi người gửi link.',
    gate_private_button: 'Đăng nhập li2',
    denied_title: 'Tài khoản của bạn không mở được nội dung này',
    denied_signed_in_as: 'Đang đăng nhập: {email}',
    denied_lead:
      'Nội dung này chỉ dành cho thành viên của tổ chức đã đăng nó. Hỏi người gửi link, hoặc đăng nhập bằng tài khoản khác.',
    denied_switch_button: 'Đăng nhập bằng tài khoản khác',
    /** Redis lỗi / secret thiếu → fail CLOSED, không lộ nội dung (PM chốt §9). */
    gate_unavailable_title: 'Chưa kiểm tra được',
    gate_unavailable_lead: 'Hệ thống đang bận. Tải lại trang và thử lại sau ít phút.',
    /** [P2] Google. "được ghi lại" là câu người xem phải thấy TRƯỚC khi bấm. */
    gate_google_title: 'Đăng nhập để xem nội dung này',
    gate_google_lead: 'Người gửi link yêu cầu đăng nhập. Email của bạn được ghi lại cho người gửi.',
    gate_google_button: 'Tiếp tục với Google',
    gate_google_cancelled:
      'Bạn đã dừng việc đăng nhập. Nội dung này chỉ xem được sau khi đăng nhập.',
    gate_google_failed_title: 'Chưa đăng nhập được',
    gate_google_failed_lead: 'Thử lại giúp nhé. Nếu vẫn vậy, hỏi người gửi link.',
  },
  en: {
    download: 'Download',
    office_loading: 'Opening with Office viewer…',
    office_privacy:
      'To display these slides, Microsoft downloads this file. Use Download instead if you would rather it did not.',
    video_unsupported: 'This browser cannot play the video. Use Download to watch it.',
    removed_title: 'This content has been taken down',
    removed_body: 'Whoever published it has removed the content at this link.',
    removed_reassure_strong: 'Your QR code is not broken.',
    removed_reassure_body:
      'You scanned it correctly. Ask whoever placed this code for the latest content.',
    removed_footer: 'This link runs on',
    not_found_title: 'Page not found',
    not_found_body:
      'This link may have been mistyped, may have changed, or may never have existed. Check the address, or ask whoever gave it to you.',
    gate_password_title: 'This content needs a password',
    gate_password_lead: 'Whoever shared this link set a password. Enter it to continue.',
    gate_password_label: 'Password',
    gate_password_submit: 'View content',
    gate_password_wrong: 'That password is not right. {n} tries left.',
    gate_password_changed: 'The password has changed. Enter the new one.',
    gate_locked_title: 'Too many tries',
    gate_locked_lead:
      'Try again in {m} minutes, or ask whoever shared the link for the right password.',
    gate_private_title: 'This content is for members',
    gate_private_lead:
      'Sign in to li2 to view it. If you do not have a li2 account, ask whoever shared the link.',
    gate_private_button: 'Sign in to li2',
    denied_title: 'Your account cannot open this',
    denied_signed_in_as: 'Signed in as: {email}',
    denied_lead:
      'This content is only for members of the organization that published it. Ask whoever shared the link, or sign in with a different account.',
    denied_switch_button: 'Sign in with a different account',
    gate_unavailable_title: 'Could not check right now',
    gate_unavailable_lead: 'The system is busy. Reload the page and try again in a few minutes.',
    gate_google_title: 'Sign in to view this content',
    gate_google_lead:
      'Whoever shared this link requires a sign-in. Your email address is recorded for them.',
    gate_google_button: 'Continue with Google',
    gate_google_cancelled: 'You stopped the sign-in. This content only opens after you sign in.',
    gate_google_failed_title: 'Sign-in did not work',
    gate_google_failed_lead: 'Try again. If it keeps failing, ask whoever shared the link.',
  },
} as const

export type ArtifactLandingLanguage = keyof typeof ARTIFACT_LANDING_COPY
export type ArtifactLandingCopy = (typeof ARTIFACT_LANDING_COPY)[ArtifactLandingLanguage]

const DEFAULT_LANGUAGE: ArtifactLandingLanguage = 'vi'

/**
 * Picks a language from `Accept-Language`, defaulting to Vietnamese.
 *
 * Only the primary subtag is read and quality values are ignored: with two languages, ranking them
 * properly buys nothing a `startsWith` does not, and a public route should do as little parsing of
 * attacker-supplied headers as it can get away with.
 */
export function landingLanguageFor(acceptLanguage: string | null): ArtifactLandingLanguage {
  const preferred = acceptLanguage
    ?.split(',')
    .map((part) => part.split(';')[0]?.trim().toLowerCase())
    .find((tag) => tag && Object.keys(ARTIFACT_LANDING_COPY).some((lang) => tag.startsWith(lang)))

  const language = (Object.keys(ARTIFACT_LANDING_COPY) as ArtifactLandingLanguage[]).find((lang) =>
    preferred?.startsWith(lang)
  )

  return language ?? DEFAULT_LANGUAGE
}

/**
 * ONE decision, read two ways. `/a/<token>` needs the language NAME as well as the copy, for
 * `<html lang>` — and the two must come from the same call, or we reproduce the bug this split fixes:
 * `lang="vi"` hardcoded on a page whose text is English, just somewhere else.
 *
 * Returns the SAME object identity as `ARTIFACT_LANDING_COPY[…]`, not a copy. A test compares with
 * `toBe`; do not "improve" this into a spread.
 */
export function landingCopyFor(acceptLanguage: string | null): ArtifactLandingCopy {
  return ARTIFACT_LANDING_COPY[landingLanguageFor(acceptLanguage)]
}

/**
 * Escapes text for interpolation into HTML.
 *
 * The artifact name is typed by a user and lands in a document served from li2's own origin — which
 * is precisely the origin the `sandbox` on `html` exists to protect, and which these landing pages
 * do NOT sandbox. A name like `</title><script>` would be script execution on li2's origin.
 *
 * Both quote forms are escaped so the same function is safe inside an attribute.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Nội suy `{n}`, `{m}`, `{email}` rồi escape TOÀN CÂU — số và email là dữ liệu, câu là template.
 * Thứ tự này là cố ý: escape trước rồi nội suy sẽ để một email chứa `<` đi thẳng vào HTML.
 */
export function fillCopy(template: string, values: Record<string, string | number>): string {
  const filled = Object.entries(values).reduce(
    (text, [key, value]) => text.split(`{${key}}`).join(String(value)),
    template
  )
  return escapeHtml(filled)
}
