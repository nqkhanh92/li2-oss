import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const getLiveContentByToken = vi.fn()
const resolveTargetByToken = vi.fn()
const getBytes = vi.fn()
const createOfficeViewerUrl = vi.fn()

vi.mock('@/core/services/artifact-serve.service', () => ({
  artifactServeService: {
    getLiveContentByToken: (...args: any[]) => getLiveContentByToken(...args),
    resolveTargetByToken: (...args: any[]) => resolveTargetByToken(...args),
    getBytes: (...args: any[]) => getBytes(...args),
    createOfficeViewerUrl: (...args: any[]) => createOfficeViewerUrl(...args),
  },
}))

/**
 * Cổng được mock ở ranh giới service: route chỉ dịch verdict → status/trang. Logic verdict có test
 * riêng (`artifact-gate.service.test.ts`). `ArtifactGateUnavailableError` phải là CÙNG class route
 * import — nên nó được định nghĩa trong factory và test lấy lại từ module đã mock.
 */
const evaluateGate = vi.fn()
const readLock = vi.fn()
const recordFailure = vi.fn()
const clearFailures = vi.fn()
vi.mock('@/core/services/artifact-gate.service', () => {
  class ArtifactGateUnavailableError extends Error {}
  return {
    ArtifactGateUnavailableError,
    artifactGateService: {
      evaluateGate: (...args: any[]) => evaluateGate(...args),
      readLock: (...args: any[]) => readLock(...args),
      recordFailure: (...args: any[]) => recordFailure(...args),
      clearFailures: (...args: any[]) => clearFailures(...args),
    },
  }
})
// scrypt thật tốn ~100 ms mỗi lần; hợp đồng băm có test riêng. Ở đây chỉ cần "đúng" hay "sai".
vi.mock('@/core/helpers/password-hash', () => ({
  verifyPassword: async (plain: string, stored: string | null) =>
    stored === 'scrypt$stored' && plain === 'Abcdefgh1',
}))

import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/(artifact)/a/[token]/route'
import { ArtifactGateUnavailableError } from '@/core/services/artifact-gate.service'
import { ARTIFACT_FORMATS } from '@/core/types/artifact.type'

const TOKEN = 'abcdef0123456789'

const call = (token: string, headers: Record<string, string> = {}) =>
  GET(new NextRequest(`https://app.li2.ai/a/${token}`, { headers }), { params: { token } })

const post = (
  token: string,
  body: string | null,
  headers: Record<string, string> = { 'content-type': 'application/x-www-form-urlencoded' }
) =>
  POST(new NextRequest(`https://app.li2.ai/a/${token}`, { method: 'POST', body, headers }), {
    params: { token },
  })

const target = (over: Record<string, unknown> = {}) => ({
  id: 'artifact-1',
  serveToken: TOKEN,
  kind: 'html',
  storagePath: `org/artifact-1.html`,
  contentType: 'text/html; charset=utf-8',
  name: 'Landing page',
  sizeBytes: 14,
  access: { mode: 'public', passwordHash: null, accessVersion: 1, organizationId: 'org-1' },
  ...over,
})

const passwordTarget = (over: Record<string, unknown> = {}) =>
  target({
    access: {
      mode: 'password',
      passwordHash: 'scrypt$stored',
      accessVersion: 2,
      organizationId: 'org-1',
    },
    ...over,
  })

/**
 * Route giờ hỏi `resolveTargetByToken`, hàm trả một trong ba outcome. Hai helper này giữ cho mỗi test
 * chỉ nói điều nó quan tâm, thay vì lặp lại hình dạng của union ở hai chục chỗ.
 */
const serving = (t: ReturnType<typeof target>) =>
  resolveTargetByToken.mockResolvedValue({ outcome: 'live', target: t })
const missing = () => resolveTargetByToken.mockResolvedValue({ outcome: 'not-found' })
const removed = () => resolveTargetByToken.mockResolvedValue({ outcome: 'removed' })

const contentTypeOf = (extension: string) =>
  ARTIFACT_FORMATS.find((f) => f.extension === extension)!.contentType

beforeEach(() => {
  vi.clearAllMocks()
  process.env.ARTIFACT_VIEWER_SECRET = 'test-secret-'.repeat(4)
  evaluateGate.mockResolvedValue({ kind: 'allow' })
  readLock.mockResolvedValue({ locked: false, count: 0, retryAfterSeconds: 0 })
  clearFailures.mockResolvedValue(undefined)
})

describe('GET /a/[token] — chung cho mọi kind', () => {
  it('404 bất cứ khi nào service không có gì để phục vụ', async () => {
    // malformed token, unknown token, a draft, and a kind with no serve mode are ONE answer here
    missing()
    for (const token of ['nope', TOKEN]) expect((await call(token)).status).toBe(404)
  })

  it('giao toàn bộ việc tra cứu cho service — route không chạm repository', async () => {
    missing()
    await call(TOKEN)
    expect(resolveTargetByToken).toHaveBeenCalledWith(TOKEN)
  })

  it('bốn header không phụ thuộc kind có mặt ở mọi serve mode', async () => {
    const cases = [
      [
        target(),
        () => getLiveContentByToken.mockResolvedValue({ body: 'x', contentType: 'text/html' }),
      ],
      [target({ kind: 'pdf' }), () => getBytes.mockResolvedValue(Buffer.from([0x25]))],
      [
        target({ kind: 'slides' }),
        () => createOfficeViewerUrl.mockResolvedValue('https://s/u?token=t'),
      ],
      [target({ kind: 'video' }), () => undefined],
    ] as const

    for (const [t, arrange] of cases) {
      vi.clearAllMocks()
      serving(t)
      arrange()

      const res = await call(TOKEN)

      expect(res.status, `${t.kind} phải 200`).toBe(200)
      expect(res.headers.get('cache-control')).toBe('no-store')
      expect(res.headers.get('x-content-type-options')).toBe('nosniff')
      expect(res.headers.get('x-robots-tag')).toBe('noindex, nofollow')
      expect(res.headers.get('referrer-policy')).toBe('no-referrer')
      expect(res.headers.get('content-security-policy')).toBeTruthy()
    }
  })
})

describe('inline-html — đường đi cũ, không được đổi', () => {
  it('phục vụ artifact live kèm đủ header bảo mật', async () => {
    serving(target())
    getLiveContentByToken.mockResolvedValue({
      body: '<h1>hello</h1>',
      contentType: 'text/html; charset=utf-8',
    })

    const res = await call(TOKEN)

    expect(res.status).toBe(200)
    expect(await res.text()).toBe('<h1>hello</h1>')
    expect(res.headers.get('content-type')).toBe('text/html; charset=utf-8')

    const csp = res.headers.get('content-security-policy')!
    expect(csp).toContain('sandbox allow-scripts allow-popups allow-modals')
    // the load-bearing omission: with allow-same-origin the artifact could read dashboard cookies
    expect(csp).not.toContain('allow-same-origin')
    expect(csp).toContain("default-src 'none'")
    expect(csp).toContain("connect-src 'none'")
    expect(csp).toContain("form-action 'none'")
    expect(csp).toContain("frame-ancestors 'self'")
    expect(csp).toContain("base-uri 'none'")
  })

  it('404 khi đọc nội dung thất bại, không 500', async () => {
    serving(target())
    getLiveContentByToken.mockResolvedValue(null)
    expect((await call(TOKEN)).status).toBe(404)
  })
})

describe('inline-binary — PDF', () => {
  const PDF = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d])

  beforeEach(() => {
    serving(target({ kind: 'pdf', contentType: contentTypeOf('.pdf'), storagePath: 'org/a.pdf' }))
    getBytes.mockResolvedValue(PDF)
  })

  it('trả đúng từng byte với Content-Type thật của file', async () => {
    const res = await call(TOKEN)

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/pdf')
    expect(Buffer.compare(Buffer.from(await res.arrayBuffer()), PDF)).toBe(0)
    expect(res.headers.get('content-length')).toBe(String(PDF.byteLength))
  })

  it('Content-Disposition là inline — trình duyệt mở, không tải về', async () => {
    expect((await call(TOKEN)).headers.get('content-disposition')).toBe('inline')
  })

  /**
   * sandbox puts the response in an opaque origin, which is what makes Chrome decline to open its
   * built-in PDF viewer. It also protects nothing here: an `application/pdf` response creates no
   * HTML document and runs none of our script.
   */
  it('CSP KHÔNG có sandbox', async () => {
    expect((await call(TOKEN)).headers.get('content-security-policy')).not.toContain('sandbox')
  })

  it('404 khi không đọc được byte', async () => {
    getBytes.mockResolvedValue(null)
    expect((await call(TOKEN)).status).toBe(404)
  })
})

describe('office-viewer — PowerPoint', () => {
  const SIGNED = 'https://supa.example.test/storage/v1/object/sign/a/b.pptx?token=abc.def&x=1'

  beforeEach(() => {
    serving(
      target({ kind: 'slides', contentType: contentTypeOf('.pptx'), storagePath: 'org/a.pptx' })
    )
    createOfficeViewerUrl.mockResolvedValue(SIGNED)
  })

  it('trả trang landing HTML của li2, không phải byte của file', async () => {
    const res = await call(TOKEN)

    expect(res.headers.get('content-type')).toBe('text/html; charset=utf-8')
    expect(await res.text()).toContain('<!DOCTYPE html>')
  })

  /**
   * The signed URL carries its own `?token=`. Concatenated raw, that query merges into embed.aspx's
   * own and Microsoft receives a truncated URL — a blank frame, no error we can see.
   */
  it('src của iframe đã encodeURIComponent signed URL', async () => {
    const html = await (await call(TOKEN)).text()

    expect(html).toContain(`src=${encodeURIComponent(SIGNED)}`)
    // the raw '?token=' must never appear as a second query parameter of embed.aspx
    expect(html).not.toContain('embed.aspx?src=https://supa')
  })

  it('CSP cho phép đúng origin của Office viewer và không có sandbox', async () => {
    const csp = (await call(TOKEN)).headers.get('content-security-policy')!

    expect(csp).toContain('frame-src https://view.officeapps.live.com')
    expect(csp).not.toContain('sandbox')
  })

  /** An iframe on another origin cannot report failure back, so the button can never wait for it. */
  it('nút Tải về có mặt ngay trong HTML đầu tiên', async () => {
    expect(await (await call(TOKEN)).text()).toContain(`href="/a/${TOKEN}/download"`)
  })

  it('nói rõ Microsoft tải file về — không giấu', async () => {
    expect(await (await call(TOKEN)).text()).toContain('Microsoft')
  })

  it('404 khi không ký được URL, không rò lỗi storage ra ngoài', async () => {
    createOfficeViewerUrl.mockResolvedValue(null)
    expect((await call(TOKEN)).status).toBe(404)
  })

  /**
   * The name is typed by a user and rendered into a document on li2's own origin — the origin that
   * `sandbox` protects for `html` and that this page deliberately does not sandbox.
   */
  it('escape tên artifact — tên chứa thẻ không thoát ra được', async () => {
    serving(target({ kind: 'slides', name: '</title><script>alert(1)</script>' }))

    const html = await (await call(TOKEN)).text()

    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
  })
})

describe('video-landing', () => {
  beforeEach(() => {
    serving(target({ kind: 'video', contentType: contentTypeOf('.mp4'), storagePath: 'org/a.mp4' }))
  })

  it('trả trang landing với <video> trỏ vào route byte có Range', async () => {
    const html = await (await call(TOKEN)).text()

    expect(html).toContain('<video')
    expect(html).toContain(`src="/a/${TOKEN}/file"`)
    expect(html).toContain('type="video/mp4"')
  })

  /** `media-src 'self'` only means anything because the page is not in an opaque origin. */
  it("CSP có media-src 'self' và KHÔNG có sandbox", async () => {
    const csp = (await call(TOKEN)).headers.get('content-security-policy')!

    expect(csp).toContain("media-src 'self'")
    expect(csp).not.toContain('sandbox')
  })

  it('không đọc byte nào để dựng trang landing', async () => {
    await call(TOKEN)
    expect(getBytes).not.toHaveBeenCalled()
  })

  it('có nút Tải về', async () => {
    expect(await (await call(TOKEN)).text()).toContain(`href="/a/${TOKEN}/download"`)
  })
})

describe('ngôn ngữ trang landing', () => {
  beforeEach(() => serving(target({ kind: 'video' })))

  it('mặc định tiếng Việt khi không có Accept-Language', async () => {
    expect(await (await call(TOKEN)).text()).toContain('Tải về')
  })

  it('chọn tiếng Anh khi Accept-Language ưu tiên en', async () => {
    const html = await (await call(TOKEN, { 'accept-language': 'en-GB,en;q=0.9' })).text()
    expect(html).toContain('Download')
    expect(html).not.toContain('Tải về')
  })

  it('ngôn ngữ lạ rơi về tiếng Việt', async () => {
    expect(await (await call(TOKEN, { 'accept-language': 'ja-JP' })).text()).toContain('Tải về')
  })

  /**
   * ⭐ `<html lang>` phải đi theo cùng quyết định với phần chữ. `landingShell` từng ghi cứng
   * `lang="vi"` trong khi copy đã chọn theo `Accept-Language` — một trang tiếng Anh tự khai là tiếng
   * Việt với mọi screen reader và mọi lời mời dịch của trình duyệt. Không test thì nó quay lại.
   */
  it('⭐ trang video cũng đổi <html lang> theo header, không ghi cứng vi', async () => {
    expect(await (await call(TOKEN, { 'accept-language': 'en-GB,en;q=0.9' })).text()).toContain(
      '<html lang="en">'
    )
    expect(await (await call(TOKEN)).text()).toContain('<html lang="vi">')
  })

  it('⭐ trang office-viewer cũng vậy', async () => {
    serving(target({ kind: 'slides' }))
    createOfficeViewerUrl.mockResolvedValue('https://s/u?token=t')

    expect(await (await call(TOKEN, { 'accept-language': 'en' })).text()).toContain(
      '<html lang="en">'
    )
  })
})

/**
 * 410 — trang bia mộ. Hợp đồng HTTP công khai của một nội dung đã gỡ.
 */
describe('410 — nội dung đã gỡ', () => {
  beforeEach(() => removed())

  it('⭐ status là 410, không 404, không 200', async () => {
    expect((await call(TOKEN)).status).toBe(410)
  })

  /** Chính chuỗi tiêu chí nghiệm thu A5 tìm trên LiHi. */
  it('body chứa "đã được gỡ"', async () => {
    expect(await (await call(TOKEN)).text()).toContain('đã được gỡ')
  })

  /**
   * ⭐ Khối trấn an là lý do trang này tồn tại — nó chặn đúng kết luận sai mà người quét sắp rút ra.
   * Thiếu nó thì trang chạy mà vô nghĩa, và không test nào khác thấy.
   */
  it('⭐ body chứa "Mã QR của bạn không hỏng"', async () => {
    expect(await (await call(TOKEN)).text()).toContain('Mã QR của bạn không hỏng')
  })

  /**
   * ⭐ A6, phép đo spec gọi là dễ bỏ sót nhất: nhầm chỗ này thì MỌI token sai trả 410 và trang nói dối
   * rằng từng có nội dung ở đó.
   */
  it('⭐ token bịa vẫn 404, không 410', async () => {
    missing()
    expect((await call(TOKEN)).status).toBe(404)
  })

  it('CSP là policy landing: default-src none, không sandbox, không frame/media/object-src', async () => {
    const csp = (await call(TOKEN)).headers.get('content-security-policy')!

    expect(csp).toContain("default-src 'none'")
    expect(csp).toContain("style-src 'unsafe-inline'")
    expect(csp).not.toContain('sandbox')
    expect(csp).not.toContain('frame-src')
    expect(csp).not.toContain('media-src')
    expect(csp).not.toContain('object-src')
  })

  it('bốn header không phụ thuộc kind vẫn có mặt — đừng để Google index bia mộ', async () => {
    const res = await call(TOKEN)

    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('x-robots-tag')).toBe('noindex, nofollow')
    expect(res.headers.get('referrer-policy')).toBe('no-referrer')
    expect(res.headers.get('content-type')).toBe('text/html; charset=utf-8')
  })

  /** ⭐ A9. */
  it('⭐ Accept-Language: en → <html lang="en"> VÀ nội dung tiếng Anh', async () => {
    const html = await (await call(TOKEN, { 'accept-language': 'en-US,en;q=0.9' })).text()

    expect(html).toContain('<html lang="en">')
    expect(html).toContain('taken down')
    expect(html).toContain('Your QR code is not broken.')
    expect(html).not.toContain('đã được gỡ')
  })

  it('⭐ không có Accept-Language → <html lang="vi">', async () => {
    expect(await (await call(TOKEN)).text()).toContain('<html lang="vi">')
  })

  /**
   * Tên artifact đã gỡ là thông tin của org, người quét không có việc gì phải biết — và nó cũng là
   * chuỗi người dùng nhập duy nhất trên trang này. Bỏ nó đi là bỏ luôn một lớp rủi ro.
   *
   * Và không `<script>`: CSP không có `script-src` nào, nên một thẻ script ở đây là code chết cộng
   * thêm một lời mời.
   */
  it('không chứa tên artifact, và không có <script>', async () => {
    const html = await (await call(TOKEN)).text()

    expect(html).not.toContain('Landing page')
    expect(html).not.toContain('<script')
  })

  /** Logo và icon phải là SVG nội tuyến: `default-src 'none'` không tải được ảnh ngoài hay webfont. */
  it('logo và icon là <svg> nội tuyến, không ảnh ngoài', async () => {
    const html = await (await call(TOKEN)).text()

    expect(html).toContain('<svg')
    expect(html).not.toContain('<img')
    expect(html).toContain('>li2<')
  })

  /** Nhận diện Li2 là một dòng chữ nhỏ cuối trang, không phải nút kêu gọi. */
  it('nhận diện Li2 là link chữ, không phải nút CTA', async () => {
    const html = await (await call(TOKEN)).text()

    expect(html).toContain('href="https://li2.ai"')
    expect(html).toContain('class="gone-foot"')
    expect(html).not.toContain('class="download"')
  })

  it('không đọc byte nào và không ký URL nào để dựng trang này', async () => {
    await call(TOKEN)

    expect(getBytes).not.toHaveBeenCalled()
    expect(getLiveContentByToken).not.toHaveBeenCalled()
    expect(createOfficeViewerUrl).not.toHaveBeenCalled()
  })
})

/**
 * R3/R6/R7 — GET đứng trước cổng. Verdict → mã + trang; không trang nào có tên artifact hay <script>.
 */
describe('GET /a/[token] — cổng', () => {
  beforeEach(() => serving(passwordTarget()))

  it('allow → phục vụ như cũ, và cổng được hỏi với request + target', async () => {
    getLiveContentByToken.mockResolvedValue({ body: '<h1>ok</h1>', contentType: 'text/html' })
    const res = await call(TOKEN)
    expect(res.status).toBe(200)
    expect(evaluateGate).toHaveBeenCalledWith(
      expect.any(NextRequest),
      expect.objectContaining({ id: 'artifact-1' })
    )
  })

  it('⭐ A5: password-required → 401, form POST action tường minh, label, không script, CSP form-action self, lang vi', async () => {
    evaluateGate.mockResolvedValue({ kind: 'password-required', hint: 'none' })
    const res = await call(TOKEN, { 'accept-language': 'vi' })
    const html = await res.text()

    expect(res.status).toBe(401)
    expect(html).toContain('Nội dung này cần mật khẩu')
    expect(html).toContain(`<form class="gate-form" method="post" action="/a/${TOKEN}"`)
    expect(html).toContain('<label class="gate-label" for="password"')
    expect(html).toContain('name="password"')
    expect(html).toContain('autocomplete="current-password"')
    expect(html).toContain('minlength="8"')
    expect(html).not.toContain('<script')
    expect(html).not.toContain('Landing page')
    expect(html).not.toContain('Còn')
    expect(res.headers.get('content-security-policy')).toContain("form-action 'self'")
    expect(res.headers.get('content-security-policy')).not.toContain('sandbox')
    expect(res.headers.get('content-type')).toBe('text/html; charset=utf-8')
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(html).toContain('<html lang="vi">')
    expect(getLiveContentByToken).not.toHaveBeenCalled()
  })

  it('A15: Accept-Language en → trang tiếng Anh', async () => {
    evaluateGate.mockResolvedValue({ kind: 'password-required', hint: 'none' })
    const html = await (await call(TOKEN, { 'accept-language': 'en' })).text()
    expect(html).toContain('<html lang="en">')
    expect(html).toContain('This content needs a password')
  })

  it('A10: hint changed → "Mật khẩu đã được đổi"', async () => {
    evaluateGate.mockResolvedValue({ kind: 'password-required', hint: 'changed' })
    const html = await (await call(TOKEN)).text()
    expect(html).toContain('Mật khẩu đã được đổi. Nhập mật khẩu mới.')
    expect(html).toContain('<form')
  })

  it('⭐ locked → 429, Retry-After, "{m} phút" làm tròn lên, KHÔNG ô nhập', async () => {
    evaluateGate.mockResolvedValue({ kind: 'locked', retryAfterSeconds: 421 })
    const res = await call(TOKEN)
    const html = await res.text()
    expect(res.status).toBe(429)
    expect(res.headers.get('retry-after')).toBe('421')
    expect(html).toContain('Đã thử quá nhiều lần')
    expect(html).toContain('Thử lại sau 8 phút')
    expect(html).not.toContain('<input')
    expect(html).not.toContain('<form')
  })

  it('locked với TTL rất nhỏ → tối thiểu 1 phút', async () => {
    evaluateGate.mockResolvedValue({ kind: 'locked', retryAfterSeconds: 3 })
    expect(await (await call(TOKEN)).text()).toContain('Thử lại sau 1 phút')
  })

  it('⭐ A13: private-login → 401 + href /auth/login?redirect_to=%2Fa%2F<token>', async () => {
    evaluateGate.mockResolvedValue({ kind: 'private-login' })
    const res = await call(TOKEN)
    const html = await res.text()
    expect(res.status).toBe(401)
    // Tuyệt đối khi NEXT_PUBLIC_APP_BASE_URL có (host artifact không route /auth), tương đối khi không.
    const origin = process.env.NEXT_PUBLIC_APP_BASE_URL
      ? new URL(process.env.NEXT_PUBLIC_APP_BASE_URL).origin
      : ''
    expect(html).toContain(`href="${origin}/auth/login?redirect_to=%2Fa%2F${TOKEN}"`)
    expect(html).toContain('Nội dung này dành cho thành viên')
    expect(html).not.toContain('<form')
  })

  it('⭐ A13: private-denied → 403, email escape, form POST switch-account, CSP cho phép origin Casdoor', async () => {
    evaluateGate.mockResolvedValue({ kind: 'private-denied', email: 'a<b>@x.vn' })
    const res = await call(TOKEN)
    const html = await res.text()
    expect(res.status).toBe(403)
    expect(html).toContain('Tài khoản của bạn không mở được nội dung này')
    expect(html).toContain('Đang đăng nhập: a&lt;b&gt;@x.vn')
    expect(html).not.toContain('a<b>@x.vn')
    expect(html).toContain(
      `<form class="gate-form" method="post" action="/a/${TOKEN}/switch-account"`
    )
    expect(html).toContain('Đăng nhập bằng tài khoản khác')
    // vitest.setup: NEXT_PUBLIC_CASDOOR_APP_URL = http://localhost:8000
    expect(res.headers.get('content-security-policy')).toContain(
      "form-action 'self' http://localhost:8000"
    )
  })

  it('private-denied không email → không có dòng "Đang đăng nhập"', async () => {
    evaluateGate.mockResolvedValue({ kind: 'private-denied', email: null })
    expect(await (await call(TOKEN)).text()).not.toContain('Đang đăng nhập')
  })

  it('[P2] google-required → 401, nút /a/<token>/google, dòng "được ghi lại", logo SVG', async () => {
    evaluateGate.mockResolvedValue({ kind: 'google-required', hint: 'none' })
    const res = await call(TOKEN)
    const html = await res.text()
    expect(res.status).toBe(401)
    expect(html).toContain(`href="/a/${TOKEN}/google"`)
    expect(html).toContain('Email của bạn được ghi lại')
    expect(html).toContain('Đăng nhập để xem nội dung này')
    expect(html).toContain('#4285F4')
  })

  it('[P2] A23: hint cancelled giữ tiêu đề mời; hint failed đổi tiêu đề', async () => {
    evaluateGate.mockResolvedValue({ kind: 'google-required', hint: 'cancelled' })
    let html = await (await call(TOKEN)).text()
    expect(html).toContain('Bạn đã dừng việc đăng nhập')
    expect(html).toContain('<h1>Đăng nhập để xem nội dung này</h1>')

    evaluateGate.mockResolvedValue({ kind: 'google-required', hint: 'failed' })
    html = await (await call(TOKEN)).text()
    expect(html).toContain('<h1>Chưa đăng nhập được</h1>')
    expect(html).toContain('Thử lại giúp nhé')
  })

  it('unavailable → 503 "Chưa kiểm tra được", không form, không nội dung', async () => {
    evaluateGate.mockResolvedValue({ kind: 'unavailable' })
    const res = await call(TOKEN)
    const html = await res.text()
    expect(res.status).toBe(503)
    expect(html).toContain('Chưa kiểm tra được')
    expect(html).not.toContain('<form')
    expect(getLiveContentByToken).not.toHaveBeenCalled()
  })

  it('⭐ A12: removed thắng cổng — 410 bia mộ không form, cổng không được hỏi', async () => {
    removed()
    const res = await call(TOKEN)
    expect(res.status).toBe(410)
    expect(await res.text()).not.toContain('<form')
    expect(evaluateGate).not.toHaveBeenCalled()
  })

  it('mọi trang cổng mang đủ 4 header chung', async () => {
    for (const verdict of [
      { kind: 'password-required', hint: 'none' },
      { kind: 'locked', retryAfterSeconds: 60 },
      { kind: 'private-login' },
      { kind: 'private-denied', email: 'x@y.z' },
      { kind: 'unavailable' },
    ]) {
      evaluateGate.mockResolvedValue(verdict)
      const res = await call(TOKEN)
      expect(res.headers.get('cache-control')).toBe('no-store')
      expect(res.headers.get('x-content-type-options')).toBe('nosniff')
      expect(res.headers.get('x-robots-tag')).toBe('noindex, nofollow')
      expect(res.headers.get('referrer-policy')).toBe('no-referrer')
    }
  })
})

/**
 * R6 — POST /a/<token>: cổng mật khẩu thật. 3 sai → khoá 10 phút theo token; Redis lỗi → 503.
 */
describe('POST /a/[token] — cổng mật khẩu', () => {
  beforeEach(() => serving(passwordTarget()))

  it('token sai dạng / không hàng → 404', async () => {
    missing()
    expect((await post('nope', 'password=x')).status).toBe(404)
    expect((await post(TOKEN, 'password=x')).status).toBe(404)
  })

  it('⭐ A12: removed → 410 bia mộ, không form, không đụng Redis', async () => {
    removed()
    const res = await post(TOKEN, 'password=x')
    expect(res.status).toBe(410)
    expect(await res.text()).not.toContain('<form')
    expect(readLock).not.toHaveBeenCalled()
  })

  it.each(['public', 'private', 'google'])('mode %s → 405 Allow: GET', async (mode) => {
    serving(
      target({ access: { mode, passwordHash: null, accessVersion: 1, organizationId: 'org-1' } })
    )
    const res = await post(TOKEN, 'password=x')
    expect(res.status).toBe(405)
    expect(res.headers.get('allow')).toBe('GET')
    expect(readLock).not.toHaveBeenCalled()
  })

  it('⭐ A6 đang khoá → 429 ngay, không verify, không INCR', async () => {
    readLock.mockResolvedValue({ locked: true, count: 3, retryAfterSeconds: 540 })
    const res = await post(TOKEN, 'password=Abcdefgh1')
    expect(res.status).toBe(429)
    expect(res.headers.get('retry-after')).toBe('540')
    expect(recordFailure).not.toHaveBeenCalled()
    expect(res.headers.get('set-cookie')).toBeNull()
  })

  it('⭐ A6 sai lần 1 → 401 + "Còn 2 lần thử", ô input có class bad', async () => {
    recordFailure.mockResolvedValue({ locked: false, count: 1, retryAfterSeconds: 0 })
    const res = await post(TOKEN, 'password=sai1')
    const html = await res.text()
    expect(res.status).toBe(401)
    expect(html).toContain('Mật khẩu không đúng. Còn 2 lần thử.')
    expect(html).toContain('class="gate-input bad"')
    expect(html).toContain('<form')
    expect(recordFailure).toHaveBeenCalledWith(TOKEN)
    expect(res.headers.get('set-cookie')).toBeNull()
  })

  it('A6 sai lần 2 → "Còn 1 lần thử"', async () => {
    recordFailure.mockResolvedValue({ locked: false, count: 2, retryAfterSeconds: 0 })
    expect(await (await post(TOKEN, 'password=sai2')).text()).toContain('Còn 1 lần thử')
  })

  it('⭐ A6 sai lần 3 → 429 trang khoá, Retry-After ≤ 600, không <input>', async () => {
    recordFailure.mockResolvedValue({ locked: true, count: 3, retryAfterSeconds: 600 })
    const res = await post(TOKEN, 'password=sai3')
    const html = await res.text()
    expect(res.status).toBe(429)
    expect(Number(res.headers.get('retry-after'))).toBeLessThanOrEqual(600)
    expect(html).toContain('Đã thử quá nhiều lần')
    expect(html).not.toContain('<input')
  })

  it('body không phải form / thiếu trường → coi là sai, vẫn đếm', async () => {
    recordFailure.mockResolvedValue({ locked: false, count: 1, retryAfterSeconds: 0 })
    expect(
      (await post(TOKEN, '{"password":"Abcdefgh1"}', { 'content-type': 'application/json' })).status
    ).toBe(401)
    expect((await post(TOKEN, 'other=x')).status).toBe(401)
    expect(recordFailure).toHaveBeenCalledTimes(2)
  })

  it('⭐ A7 đúng → 303 Location /a/<token>, Set-Cookie artifact_viewer Path=/a/<token> Max-Age=604800 HttpOnly Secure Lax, DEL bộ đếm', async () => {
    const res = await post(TOKEN, 'password=Abcdefgh1')
    expect(res.status).toBe(303)
    expect(res.headers.get('location')).toBe(`/a/${TOKEN}`)
    const cookie = res.headers.get('set-cookie')!
    expect(cookie).toMatch(/^artifact_viewer=[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+;/)
    expect(cookie).toContain(`Path=/a/${TOKEN}`)
    expect(cookie).toContain('Max-Age=604800')
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('Secure')
    expect(cookie).toContain('SameSite=lax')
    expect(cookie).not.toContain('Domain=')
    expect(clearFailures).toHaveBeenCalledWith(TOKEN)
    expect(recordFailure).not.toHaveBeenCalled()
  })

  describe('địa chỉ công khai <ARTIFACT_LINK_URL>/<org_slug>/<slug>', () => {
    const withPublic = (mode: 'public' | 'password' | 'private' | 'google' = 'public') => {
      resolveTargetByToken.mockResolvedValue({
        outcome: 'live',
        target: target({
          publicPath: '/khanhqns-organization/bao-gia',
          access: {
            mode,
            passwordHash: mode === 'password' ? 'scrypt$stored' : null,
            accessVersion: 1,
            organizationId: 'org-1',
          },
        }),
      })
    }
    const saved = process.env.ARTIFACT_LINK_URL
    beforeEach(() => {
      process.env.ARTIFACT_LINK_URL = 'https://artifact.li2.link'
      evaluateGate.mockResolvedValue({ kind: 'allow' })
    })
    afterEach(() => {
      if (saved === undefined) delete process.env.ARTIFACT_LINK_URL
      else process.env.ARTIFACT_LINK_URL = saved
    })

    it('điều hướng cấp cao nhất tới /a/<token> (Sec-Fetch-Dest: document) → 302 sang địa chỉ công khai, giữ query', async () => {
      withPublic('public')
      const res = await GET(
        new NextRequest(`https://app.li2.ai/a/${TOKEN}?uid=u1`, {
          headers: { 'sec-fetch-dest': 'document' },
        }),
        { params: { token: TOKEN } }
      )
      expect(res.status).toBe(302)
      expect(res.headers.get('location')).toBe(
        'https://artifact.li2.link/khanhqns-organization/bao-gia?uid=u1'
      )
      expect(res.headers.get('cache-control')).toBe('no-store')
    })

    it('iframe/fetch/curl (không Sec-Fetch-Dest document) → vẫn phục vụ tại /a/<token>', async () => {
      withPublic('public')
      expect((await call(TOKEN, { 'sec-fetch-dest': 'iframe' })).status).toBe(200)
      expect((await call(TOKEN)).status).toBe(200)
    })

    it('đã có cookie viewer → không đổi host (xem tại app, không bắt nhập lại)', async () => {
      withPublic('password')
      const res = await call(TOKEN, { 'sec-fetch-dest': 'document', cookie: 'artifact_viewer=abc' })
      expect(res.status).toBe(200)
    })

    it.each(['private', 'google'] as const)(
      'chế độ %s → không chuyển hướng (cookie đặt trên app host)',
      async (mode) => {
        withPublic(mode)
        expect((await call(TOKEN, { 'sec-fetch-dest': 'document' })).status).toBe(200)
      }
    )

    it('không có ARTIFACT_LINK_URL → không chuyển hướng', async () => {
      delete process.env.ARTIFACT_LINK_URL
      withPublic('public')
      expect((await call(TOKEN, { 'sec-fetch-dest': 'document' })).status).toBe(200)
    })

    it('publicPath null (artifact không có slug/org) → không chuyển hướng', async () => {
      resolveTargetByToken.mockResolvedValue({
        outcome: 'live',
        target: target({ publicPath: null }),
      })
      expect((await call(TOKEN, { 'sec-fetch-dest': 'document' })).status).toBe(200)
    })
  })

  describe('qua short link (li2-be proxy, X-Artifact-Public-Path)', () => {
    beforeEach(() => evaluateGate.mockResolvedValue({ kind: 'password-required', hint: 'none' }))

    it('GET cổng mật khẩu có header hợp lệ → form vẫn POST /a/<token> nhưng mang hidden return_to=/<slug>', async () => {
      const res = await call(TOKEN, {
        'accept-language': 'vi',
        'x-artifact-public-path': '/w4-demo_1.2',
      })
      const html = await res.text()
      expect(res.status).toBe(401)
      expect(html).toContain(`<form class="gate-form" method="post" action="/a/${TOKEN}"`)
      expect(html).toContain('<input type="hidden" name="return_to" value="/w4-demo_1.2" />')
    })

    it.each(['//evil.example', '/a/b', '/slug?x=1', 'slug', '/-x', '/' + 'z'.repeat(130), '/x<y'])(
      'header %s không phải một slug → không có return_to',
      async (bad) => {
        const res = await call(TOKEN, { 'x-artifact-public-path': bad })
        expect(await res.text()).not.toContain('return_to')
      }
    )

    it('không có header → không có return_to (hành vi cũ nguyên vẹn)', async () => {
      expect(await (await call(TOKEN)).text()).not.toContain('return_to')
    })

    it('POST đúng kèm return_to hợp lệ → 303 Location /<slug>, cookie Path=/<slug>', async () => {
      const res = await post(TOKEN, 'password=Abcdefgh1&return_to=%2Fw4-demo')
      expect(res.status).toBe(303)
      expect(res.headers.get('location')).toBe('/w4-demo')
      const cookie = res.headers.get('set-cookie')!
      expect(cookie).toContain('Path=/w4-demo')
      expect(cookie).toContain('HttpOnly')
      expect(cookie).not.toContain('Domain=')
    })

    it('POST đúng kèm return_to → HAI cookie: Path=/<slug> cho trang và Path=/a/<token> cho /file, /download', async () => {
      const res = await post(TOKEN, 'password=Abcdefgh1&return_to=%2Fw4-demo')
      const cookies = res.headers.getSetCookie()
      expect(cookies).toHaveLength(2)
      expect(
        cookies.some((c) => c.startsWith('artifact_viewer=') && c.includes(`Path=/a/${TOKEN}`))
      ).toBe(true)
      expect(
        cookies.some((c) => c.startsWith('artifact_viewer=') && c.includes('Path=/w4-demo'))
      ).toBe(true)
    })

    it('không return_to → đúng MỘT cookie Path=/a/<token> (hành vi cũ)', async () => {
      const res = await post(TOKEN, 'password=Abcdefgh1')
      expect(res.headers.getSetCookie()).toHaveLength(1)
    })

    it('cổng private: nút đăng nhập là URL TUYỆT ĐỐI về app (host artifact không route /auth)', async () => {
      evaluateGate.mockResolvedValue({ kind: 'private-login' })
      const res = await call(TOKEN, { 'x-artifact-public-path': '/w4-demo' })
      const html = await res.text()
      const origin = process.env.NEXT_PUBLIC_APP_BASE_URL
        ? new URL(process.env.NEXT_PUBLIC_APP_BASE_URL).origin
        : ''
      expect(origin, 'test này cần NEXT_PUBLIC_APP_BASE_URL để chứng minh URL tuyệt đối').not.toBe(
        ''
      )
      expect(html).toContain(`href="${origin}/auth/login?redirect_to=%2Fa%2F${TOKEN}"`)
    })

    it('POST đúng kèm return_to lạ (open redirect) → bỏ, về /a/<token>', async () => {
      const res = await post(
        TOKEN,
        'password=Abcdefgh1&return_to=' + encodeURIComponent('//evil.example/x')
      )
      expect(res.headers.get('location')).toBe(`/a/${TOKEN}`)
      expect(res.headers.get('set-cookie')).toContain(`Path=/a/${TOKEN}`)
    })

    it('POST sai kèm return_to → form lỗi vẫn giữ return_to để lần sau quay về /<slug>', async () => {
      recordFailure.mockResolvedValueOnce({ locked: false, count: 1 })
      const res = await post(TOKEN, 'password=saisai12&return_to=%2Fw4-demo')
      expect(res.status).toBe(401)
      expect(await res.text()).toContain(
        '<input type="hidden" name="return_to" value="/w4-demo" />'
      )
    })
  })

  it('cookie mang m=password và v=access_version của target', async () => {
    const res = await post(TOKEN, 'password=Abcdefgh1')
    const jwt = res.headers.get('set-cookie')!.split(';')[0].split('=')[1]
    const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString())
    expect(payload).toMatchObject({ purpose: 'artifact-viewer', tok: TOKEN, m: 'password', v: 2 })
  })

  it('⭐ A19 Redis lỗi khi đọc khoá → 503, không Set-Cookie, không verify', async () => {
    readLock.mockRejectedValue(new ArtifactGateUnavailableError('down'))
    const res = await post(TOKEN, 'password=Abcdefgh1')
    expect(res.status).toBe(503)
    expect(await res.text()).toContain('Chưa kiểm tra được')
    expect(res.headers.get('set-cookie')).toBeNull()
  })

  it('A19 Redis lỗi khi ghi lần sai → 503 (fail closed), không 401 form', async () => {
    recordFailure.mockRejectedValue(new ArtifactGateUnavailableError('down'))
    const res = await post(TOKEN, 'password=sai')
    expect(res.status).toBe(503)
    expect(await res.text()).not.toContain('<form')
  })

  it('⭐ secret thiếu → 503 kể cả khi mật khẩu đúng, bộ đếm KHÔNG bị xoá', async () => {
    delete process.env.ARTIFACT_VIEWER_SECRET
    const res = await post(TOKEN, 'password=Abcdefgh1')
    expect(res.status).toBe(503)
    expect(res.headers.get('set-cookie')).toBeNull()
    expect(clearFailures).not.toHaveBeenCalled()
  })

  it('trang 401/429/503 của POST không có tên artifact và không script', async () => {
    recordFailure.mockResolvedValue({ locked: false, count: 1, retryAfterSeconds: 0 })
    const html = await (await post(TOKEN, 'password=sai')).text()
    expect(html).not.toContain('Landing page')
    expect(html).not.toContain('<script')
  })

  it('A15: ngôn ngữ trang 401 theo Accept-Language của POST', async () => {
    recordFailure.mockResolvedValue({ locked: false, count: 1, retryAfterSeconds: 0 })
    const html = await (
      await post(TOKEN, 'password=sai', {
        'content-type': 'application/x-www-form-urlencoded',
        'accept-language': 'en',
      })
    ).text()
    expect(html).toContain('That password is not right. 2 tries left.')
  })
})

/**
 * Cả ba route công khai phải có `fetchCache = 'force-no-store'`.
 *
 * VÌ SAO CÓ TEST NÀY: thiếu nó thì **artifact đã xoá vẫn được phục vụ**. Đo trên LiHi 30/09 —
 * hàng, object và touch point đều đã mất, UI báo đã xoá, mà `/a/<token>` vẫn trả 200 kèm đủ nội
 * dung gốc, vì Next ghi response fetch của PostgREST xuống Data Cache **trên đĩa** theo URL, và
 * URL đó mang `serve_token=eq.<token>`. `docker restart` không xoá; chỉ container filesystem mới.
 *
 * `dynamic = 'force-dynamic'` KHÔNG thay được: nó quyết định cách route render, không quyết định
 * `fetch` bên trong có tra Data Cache hay không.
 *
 * Test này đọc **source**, không import route — `fetchCache` là route segment config mà Next đọc
 * lúc build, nên trong vitest nó chỉ là một biến export, và một test import rồi kiểm giá trị sẽ
 * xanh y hệt kể cả khi Next bỏ qua nó. Đọc source là cách trung thực nhất trong CI; bằng chứng
 * thật sự nó hoạt động phải là một request sau một lần xoá thật trên deployment thật.
 */
describe('route công khai phải tắt fetch Data Cache', () => {
  const ROUTES = [
    'src/app/(artifact)/a/[token]/route.ts',
    'src/app/(artifact)/a/[token]/file/route.ts',
    'src/app/(artifact)/a/[token]/download/route.ts',
    // [P2] cả hai đều tự resolve token (một qua `state`), nên cùng phải tắt Data Cache.
    'src/app/(artifact)/a/[token]/google/route.ts',
    'src/app/(artifact)/a/google/callback/route.ts',
  ]

  it.each(ROUTES)('%s có fetchCache force-no-store', (relative) => {
    const source = readFileSync(resolve(__dirname, '../../../..', relative), 'utf8')
    expect(source).toMatch(/export const fetchCache = 'force-no-store'/)
  })

  it('quét ra đúng 5 route — rỗng thì test này vô nghĩa', () => {
    expect(ROUTES).toHaveLength(5)
    for (const r of ROUTES)
      expect(existsSync(resolve(__dirname, '../../../..', r)), `thiếu file ${r}`).toBe(true)
  })
})
