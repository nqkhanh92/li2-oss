import { describe, expect, it } from 'vitest'

import { ARTIFACT_LANDING_COPY } from '@/core/helpers/artifact-landing'
import {
  googleGatePage,
  lockedGatePage,
  passwordGatePage,
  privateDeniedPage,
  privateLoginPage,
  gateUnavailablePage,
} from '@/core/helpers/artifact-gate-pages'

/**
 * Giao diện trang cổng phải khớp trang mật khẩu của SHORT LINK do li2-be phục vụ
 * (`li2-be/src/templates/authentication.html`). Người quét một QR không biết cái nào do app phục vụ
 * và cái nào do li2-be — hai giao diện khác nhau trong cùng một luồng là hai sản phẩm khác nhau dưới
 * mắt họ. Ba thứ ở đây là ba thứ ĐO ĐƯỢC của theme đó, nên test giữ đúng ba thứ:
 *
 * - nền sáng + lớp chấm (màu và bước chấm, không chỉ "có background"),
 * - mascot robot nội tuyến (CSP `default-src 'none'` không tải nổi ảnh ngoài),
 * - nút đen `#000d27` có mũi tên.
 *
 * KHÔNG snapshot: một snapshot ở đây sẽ đỏ mỗi lần đổi một con số padding, và sẽ được "cập nhật" mà
 * không ai đọc — đúng kiểu test không chặn được gì.
 */
const page = { copy: ARTIFACT_LANDING_COPY.vi, language: 'vi' as const, token: 'a1b2c3d4e5f60718' }

const allGatePages = (): [string, string][] => [
  ['password', passwordGatePage(page, { kind: 'fresh' })],
  ['locked', lockedGatePage(page, 600)],
  ['private-login', privateLoginPage(page)],
  ['private-denied', privateDeniedPage(page, 'ai@do.com')],
  ['unavailable', gateUnavailablePage(page)],
  ['google', googleGatePage(page, 'none')],
]

describe('theme trang cổng artifact = theme trang mật khẩu short link', () => {
  it('trang mật khẩu có nền sáng + lớp chấm 20px đúng màu của li2-be', () => {
    const html = passwordGatePage(page, { kind: 'fresh' })

    expect(html).toContain('background-color: rgb(249, 251, 253)')
    expect(html).toContain('radial-gradient(#d0d5d5 2px, transparent 0)')
    expect(html).toContain('background-size: 100% 100%, 20px 20px')
  })

  it('trang mật khẩu có mascot robot NỘI TUYẾN, không ảnh ngoài', () => {
    const html = passwordGatePage(page, { kind: 'fresh' })

    expect(html).toContain('class="mascot"')
    expect(html).toContain('<svg class="mascot"')
    expect(html).not.toContain('<img')
    expect(html).not.toContain('http://www.w3.org/1999/xhtml')
  })

  it('nút submit là nút đen #000d27 có mũi tên, nhãn vẫn đi qua copy', () => {
    const html = passwordGatePage(page, { kind: 'fresh' })

    expect(html).toContain('background: #000d27')
    expect(html).toContain(
      `<button class="gate-btn" type="submit"><span>${ARTIFACT_LANDING_COPY.vi.gate_password_submit}</span><svg`
    )
    expect(html).toContain('M4.16675 9.99984H15.8334')
  })

  it('nhãn và ô nhập giữ nguyên hợp đồng selector mà test route + driver e2e bám vào', () => {
    const html = passwordGatePage(page, { kind: 'fresh' })

    expect(html).toContain('<label class="gate-label" for="password">')
    expect(html).toContain('class="gate-input" id="password"')
    expect(html).toContain('class="gate-form" method="post"')
  })

  /**
   * ⭐ Theme của li2-be chỉ có bản sáng. Một trang cổng tự lật sang nền đen theo thiết lập máy khách
   * trong khi trang short link bên cạnh vẫn trắng là đúng cái lệch mà lần đổi theme này sửa — nên
   * dark mode phải biến mất ở MỌI trang cổng, không chỉ trang mật khẩu.
   */
  it('⭐ không trang cổng nào còn dark mode, và trang nào cũng có mascot + khung .gate', () => {
    for (const [name, html] of allGatePages()) {
      expect(html, name).not.toContain('prefers-color-scheme')
      expect(html, name).toContain('class="mascot"')
      expect(html, name).toContain('<main class="shell gate">')
      expect(html, name).not.toContain('<script')
    }
  })

  it('font Be Vietnam Pro đứng đầu stack và không request webfont nào ra ngoài', () => {
    const html = passwordGatePage(page, { kind: 'fresh' })

    expect(html).toContain('font-family: "Be Vietnam Pro", system-ui')
    expect(html).not.toContain('fonts.googleapis.com')
    expect(html).not.toContain('@font-face')
  })
})
