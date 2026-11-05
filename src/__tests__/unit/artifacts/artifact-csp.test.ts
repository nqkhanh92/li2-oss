import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  ARTIFACT_COMMON_HEADERS,
  ARTIFACT_LANDING_CSP,
  artifactCsp,
  artifactGateCsp,
  OFFICE_VIEWER_ORIGIN,
} from '@/core/helpers/artifact-csp'
import { ARTIFACT_KIND_SPECS, ARTIFACT_UPLOAD_KINDS } from '@/core/types/artifact.type'

/**
 * The exact policy html has always been served with. Pinned as a literal, not rebuilt from the
 * source: the point is to notice if it changes, and a test that derives the value cannot.
 */
const HTML_CSP_AS_SHIPPED =
  "sandbox allow-scripts allow-popups allow-modals; default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: https:; font-src data: https:; connect-src 'none'; form-action 'none'; frame-ancestors 'self'; base-uri 'none'"

describe('artifactCsp', () => {
  it('html giữ NGUYÊN VĂN chuỗi đang chạy — không được tinh chỉnh', () => {
    expect(artifactCsp('html')).toBe(HTML_CSP_AS_SHIPPED)
  })

  it('chỉ html và markdown có sandbox; pdf, office, ảnh, video thì không', () => {
    // Hai kind này cùng ra một tài liệu HTML dựng từ nội dung người dùng. Số còn lại hoặc là dữ
    // liệu trơ (pdf, ảnh, video) hoặc là markup của chính li2 (trang nhúng Office viewer), nên
    // sandbox chỉ phá: nó vô hiệu hoá `frame-src` của Office và `media-src 'self'` của video.
    for (const kind of ['html', 'markdown'] as const)
      expect(artifactCsp(kind), `${kind} phải có sandbox`).toContain('sandbox')

    for (const kind of ARTIFACT_UPLOAD_KINDS.filter((k) => k !== 'html' && k !== 'markdown'))
      expect(artifactCsp(kind), `${kind} không được có sandbox`).not.toContain('sandbox')
  })

  it('sandbox trong CSP khớp đúng cờ sandboxed của bảng kind', () => {
    for (const kind of ARTIFACT_UPLOAD_KINDS)
      expect(artifactCsp(kind).includes('sandbox')).toBe(ARTIFACT_KIND_SPECS[kind].sandboxed)
  })

  it('mọi kind đều giữ frame-ancestors self — trang chi tiết nhúng route này trong iframe', () => {
    for (const kind of ARTIFACT_UPLOAD_KINDS)
      expect(artifactCsp(kind)).toContain("frame-ancestors 'self'")
  })

  /**
   * Without frame-src the Office iframe is a blank rectangle and CSP reports nothing we can see:
   * the failure is in Microsoft's frame, not ours.
   */
  it('chỉ kind đi qua Office viewer mới được nhúng origin đó', () => {
    // Trước 2026-10-24 test này viết `k !== 'slides'`, và nó vẫn XANH khi `document`/`sheet`
    // gia nhập office-viewer mà CSP của chúng thiếu `frame-src` — nó khẳng định đúng cái lỗi.
    const office = ARTIFACT_UPLOAD_KINDS.filter(
      (k) => ARTIFACT_KIND_SPECS[k].serveMode === 'office-viewer'
    )
    for (const kind of office)
      expect(artifactCsp(kind)).toContain(`frame-src ${OFFICE_VIEWER_ORIGIN}`)

    for (const kind of ARTIFACT_UPLOAD_KINDS.filter((k) => !office.includes(k)))
      expect(artifactCsp(kind)).not.toContain('frame-src')
  })

  it("video cho phép media-src 'self', và chỉ kind đó", () => {
    expect(artifactCsp('video')).toContain("media-src 'self'")

    for (const kind of ARTIFACT_UPLOAD_KINDS.filter((k) => k !== 'video'))
      expect(artifactCsp(kind)).not.toContain('media-src')
  })

  /**
   * §4.5 — pdf is the one kind served as a bare binary inline, so what renders it is the browser's
   * PDF viewer, not our markup. Without `object-src` it falls back to `default-src 'none'` and the
   * viewer is refused: a blank frame, and nothing in our logs, because the refusal happens inside
   * the browser. Every other kind renders a document we wrote, so none of them needs this.
   */
  it("pdf cho phép object-src 'self', và chỉ pdf", () => {
    expect(artifactCsp('pdf')).toContain("object-src 'self'")

    for (const kind of ARTIFACT_UPLOAD_KINDS.filter((k) => k !== 'pdf'))
      expect(artifactCsp(kind), `${kind} không cần object-src`).not.toContain('object-src')
  })

  /**
   * `media-src 'self'` and `frame-src <origin>` are both statements about an origin. In an opaque
   * origin — which is what `sandbox` creates — neither refers to anything, and the video or the
   * viewer dies with no error. This asserts the two can never appear together.
   */
  it('không kind nào vừa có sandbox vừa có chỉ thị phụ thuộc origin', () => {
    for (const kind of ARTIFACT_UPLOAD_KINDS) {
      const csp = artifactCsp(kind)
      if (!csp.includes('sandbox')) continue
      expect(csp).not.toContain('media-src')
      expect(csp).not.toContain('frame-src')
    }
  })
})

/**
 * R8 — trang cổng được POST về chính mình; bia mộ 410 thì không. Hai hằng cũ giữ NGUYÊN VĂN: nới
 * `ARTIFACT_LANDING_CSP` là nới luôn trang 410, nên spec chọn một hàm riêng.
 */
describe('artifactGateCsp — CSP riêng cho trang cổng', () => {
  const LANDING_CSP_AS_SHIPPED =
    "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; form-action 'none'; frame-ancestors 'self'; base-uri 'none'"

  it("ARTIFACT_LANDING_CSP giữ nguyên văn — bia mộ vẫn form-action 'none'", () => {
    expect(ARTIFACT_LANDING_CSP).toBe(LANDING_CSP_AS_SHIPPED)
  })

  it("artifactCsp(kind) không đổi: pdf/slides/video vẫn form-action 'none'", () => {
    for (const kind of ARTIFACT_UPLOAD_KINDS)
      expect(artifactCsp(kind)).toContain("form-action 'none'")
  })

  it("trang cổng có form-action 'self' và CHỈ khác landing ở chỉ thị đó", () => {
    expect(artifactGateCsp()).toBe(
      LANDING_CSP_AS_SHIPPED.replace("form-action 'none'", "form-action 'self'")
    )
  })

  it('không sandbox, không script-src — trang không có script', () => {
    expect(artifactGateCsp()).not.toContain('sandbox')
    expect(artifactGateCsp()).not.toContain('script-src')
    expect(artifactGateCsp('https://sso.example.test')).not.toContain('sandbox')
  })

  it("origin thêm vào đứng sau 'self' trong form-action, không chỗ nào khác", () => {
    const csp = artifactGateCsp('https://sso.example.test')
    expect(csp).toContain("form-action 'self' https://sso.example.test")
    expect(csp.split('https://sso.example.test')).toHaveLength(2)
  })

  it('không truyền gì → không có khoảng trắng thừa sau self', () => {
    expect(artifactGateCsp()).toContain("form-action 'self'; frame-ancestors")
  })
})

/**
 * §3 C1 — the dangerous boundary of this whole wave.
 *
 * Two CSP headers on one response are enforced as their intersection. While `next.config.mjs` also
 * emitted one for `/a/:path*`, it would pin `sandbox` onto every kind no matter what the route
 * handler returned — and no unit test could see it, because a test reads what the handler set.
 * This test reads the config file itself, which is the only way to catch it from here.
 */
describe('next.config.mjs không được đặt CSP cho /a/*', () => {
  const config = readFileSync(resolve(process.cwd(), 'next.config.mjs'), 'utf8')

  const artifactBlock = (() => {
    const start = config.indexOf("source: '/a/:path*'")
    expect(start, "không tìm thấy khối header của '/a/:path*'").toBeGreaterThan(-1)
    const headersStart = config.indexOf('headers: [', start)
    const end = config.indexOf('],', headersStart)
    expect(end, 'không tìm thấy điểm kết thúc của mảng headers').toBeGreaterThan(headersStart)
    return config.slice(start, end)
  })()

  it('khối /a/:path* không còn khoá Content-Security-Policy', () => {
    expect(artifactBlock).not.toContain('Content-Security-Policy')
  })

  it('không còn chuỗi sandbox nào sót lại trong config', () => {
    expect(config).not.toContain('sandbox allow-scripts')
  })

  it('vẫn giữ bốn header không phụ thuộc kind', () => {
    for (const key of Object.keys(ARTIFACT_COMMON_HEADERS)) expect(artifactBlock).toContain(key)
  })
})

/**
 * P1 do agent `eng-artifact` tìm ra, tôi đo lại: `document` và `sheet` gia nhập office-viewer
 * ngày 2026-10-24 nhưng điều kiện `frame-src` vẫn viết `kind === 'slides'`, nên CSP của chúng
 * chỉ có `default-src 'none'` và iframe Office bị chặn — trang hiện ra một khung TRẮNG.
 */
describe('frame-src bám theo serveMode, không bám theo tên kind', () => {
  it('MỌI kind dùng office-viewer đều có frame-src trỏ Office', () => {
    const officeKinds = ARTIFACT_UPLOAD_KINDS.filter(
      (k) => ARTIFACT_KIND_SPECS[k].serveMode === 'office-viewer'
    )
    // Chốt luôn là có ba, không phải một: nếu ai đó gỡ document/sheet khỏi office-viewer thì
    // test này phải nói ra chứ không im lặng pass với danh sách rỗng.
    expect(officeKinds).toEqual(['slides', 'document', 'sheet'])

    for (const kind of officeKinds)
      expect(artifactCsp(kind), `${kind} thiếu frame-src → iframe Office bị chặn`).toContain(
        'frame-src https://view.officeapps.live.com'
      )
  })

  it('kind KHÔNG dùng office-viewer thì không có frame-src', () => {
    for (const kind of ARTIFACT_UPLOAD_KINDS.filter(
      (k) => ARTIFACT_KIND_SPECS[k].serveMode !== 'office-viewer'
    ))
      expect(artifactCsp(kind)).not.toContain('frame-src https')
  })
})
