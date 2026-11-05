import { describe, expect, it } from 'vitest'

import {
  ARTIFACT_LANDING_COPY,
  escapeHtml,
  fillCopy,
  landingCopyFor,
  landingLanguageFor,
} from '@/core/helpers/artifact-landing'

const LANGUAGES = Object.keys(ARTIFACT_LANDING_COPY) as (keyof typeof ARTIFACT_LANDING_COPY)[]

/**
 * §8 — this copy lives outside `public/lang/*` on purpose, so that `/a/<token>` never pulls the
 * i18next runtime onto the one public unauthenticated path in the app. The cost is that
 * `i18n-keys.test.ts` cannot see it. This describe block is what stands in its place.
 */
describe('ARTIFACT_LANDING_COPY — thay cho i18n-keys.test.ts', () => {
  it('có đủ hai ngôn ngữ', () => {
    expect(LANGUAGES.sort()).toEqual(['en', 'vi'])
  })

  it('mọi ngôn ngữ có CÙNG tập khoá — thiếu một khoá là một chỗ trống trên trang', () => {
    const [first, ...rest] = LANGUAGES.map((lang) => Object.keys(ARTIFACT_LANDING_COPY[lang]).sort())
    for (const keys of rest) expect(keys).toEqual(first)
  })

  it('không khoá nào rỗng ở bất kỳ ngôn ngữ nào', () => {
    for (const lang of LANGUAGES)
      for (const [key, value] of Object.entries(ARTIFACT_LANDING_COPY[lang]))
        expect(value.trim(), `${lang}.${key}`).not.toBe('')
  })

  /** The privacy line is the one the user agreed to show; losing it silently is the failure. */
  it('dòng quyền riêng tư của Office nêu đích danh Microsoft ở cả hai ngôn ngữ', () => {
    for (const lang of LANGUAGES)
      expect(ARTIFACT_LANDING_COPY[lang].office_privacy).toContain('Microsoft')
  })

  /**
   * Câu trấn an là LÝ DO trang bia mộ tồn tại: nó chặn đúng kết luận sai mà người quét sắp rút ra
   * ("QR in lỗi", rồi quét lại bốn năm lần). Mất nó thì trang vẫn chạy mà vô nghĩa, và không test nào
   * khác thấy — nên nó được chốt ở đây, ở cả hai ngôn ngữ.
   */
  it('câu "QR không hỏng" có ở cả hai ngôn ngữ và nói về QR', () => {
    expect(ARTIFACT_LANDING_COPY.vi.removed_reassure_strong).toContain('QR')
    expect(ARTIFACT_LANDING_COPY.en.removed_reassure_strong).toContain('QR')
  })

  /**
   * `removed_footer` cố ý KHÔNG chứa chữ "Li2": tên thương hiệu là nội dung của `<a>`, nối trong
   * markup, nên không cần một khoá riêng cho mỗi ngôn ngữ. Trật tự từ của cả vi lẫn en cho phép đặt
   * tên ở cuối câu.
   */
  it('dòng chân trang không tự chứa tên thương hiệu', () => {
    for (const lang of LANGUAGES)
      expect(ARTIFACT_LANDING_COPY[lang].removed_footer.toLowerCase()).not.toContain('li2')
  })

  /** R11/R13: câu người xem Google phải thấy TRƯỚC khi bấm — email của họ được ghi lại. */
  it('[P2] gate_google_lead nói rõ email được ghi lại, cả hai ngôn ngữ', () => {
    expect(ARTIFACT_LANDING_COPY.vi.gate_google_lead).toContain('ghi lại')
    expect(ARTIFACT_LANDING_COPY.en.gate_google_lead.toLowerCase()).toContain('recorded')
  })

  it('placeholder {n} {m} {email} có mặt ở cả hai ngôn ngữ của đúng khoá', () => {
    for (const lang of LANGUAGES) {
      expect(ARTIFACT_LANDING_COPY[lang].gate_password_wrong).toContain('{n}')
      expect(ARTIFACT_LANDING_COPY[lang].gate_locked_lead).toContain('{m}')
      expect(ARTIFACT_LANDING_COPY[lang].denied_signed_in_as).toContain('{email}')
    }
  })

  it('trang cổng không hiện con số 7 ngày cho người quét', () => {
    for (const lang of LANGUAGES)
      for (const [key, value] of Object.entries(ARTIFACT_LANDING_COPY[lang]))
        if (key.startsWith('gate_')) expect(value, `${lang}.${key}`).not.toMatch(/7 ngày|7 days|một tuần|a week/i)
  })
})

describe('fillCopy — nội suy rồi escape toàn câu', () => {
  it('thay {n} và escape kết quả', () => {
    expect(fillCopy('Còn {n} lần', { n: 2 })).toBe('Còn 2 lần')
  })

  it('⭐ email chứa thẻ không thoát ra được — escape SAU khi nội suy', () => {
    expect(fillCopy('Đang đăng nhập: {email}', { email: '<img src=x onerror=alert(1)>' })).toBe(
      'Đang đăng nhập: &lt;img src=x onerror=alert(1)&gt;'
    )
  })

  it('placeholder lặp được thay hết; placeholder không có giá trị giữ nguyên', () => {
    expect(fillCopy('{n}/{n} {x}', { n: 1 })).toBe('1/1 {x}')
  })
})

/**
 * Tách khỏi `landingCopyFor` vì `/a/<token>` cần CHÍNH tên ngôn ngữ cho `<html lang>`. Điều phải chốt
 * là hai hàm không bao giờ tách đôi quyết định — nếu tách, ta lặp lại đúng lỗi `lang="vi"` ghi cứng
 * trên một trang tiếng Anh, chỉ ở chỗ khác.
 */
describe('landingLanguageFor', () => {
  it.each([
    [null, 'vi'],
    ['en', 'en'],
    ['en-US,en;q=0.9', 'en'],
    ['fr', 'vi'],
    ['ja-JP', 'vi'],
    ['', 'vi'],
  ] as [string | null, keyof typeof ARTIFACT_LANDING_COPY][])('%s → %s', (header, expected) => {
    expect(landingLanguageFor(header)).toBe(expected)
  })

  it('⭐ landingCopyFor luôn là copy của ĐÚNG ngôn ngữ landingLanguageFor chọn', () => {
    for (const header of [null, 'en', 'vi', 'en-GB,en;q=0.9', 'ja-JP', '', ';;;', '*', 'q=0.9'])
      expect(landingCopyFor(header)).toBe(ARTIFACT_LANDING_COPY[landingLanguageFor(header)])
  })
})

describe('landingCopyFor', () => {
  it('không có Accept-Language → tiếng Việt', () => {
    expect(landingCopyFor(null)).toBe(ARTIFACT_LANDING_COPY.vi)
  })

  it.each([
    ['en', 'en'],
    ['en-GB,en;q=0.9', 'en'],
    ['EN-US', 'en'],
    ['vi-VN,vi;q=0.9,en;q=0.8', 'vi'],
    ['ja-JP', 'vi'],
    ['', 'vi'],
    ['   ', 'vi'],
  ] as [string, keyof typeof ARTIFACT_LANDING_COPY][])('%s → %s', (header, expected) => {
    expect(landingCopyFor(header)).toBe(ARTIFACT_LANDING_COPY[expected])
  })

  /** A public route parses as little attacker-supplied header as it can; it must not throw. */
  it('header dị dạng không làm ném lỗi', () => {
    for (const header of [';;;', 'q=0.9', ',,,', 'en;;q', '*'])
      expect(() => landingCopyFor(header)).not.toThrow()
  })
})

describe('escapeHtml', () => {
  it.each([
    ['<script>', '&lt;script&gt;'],
    ['a & b', 'a &amp; b'],
    ['"quoted"', '&quot;quoted&quot;'],
    ["it's", 'it&#39;s'],
    ['Báo cáo quý 4', 'Báo cáo quý 4'],
  ])('%s → %s', (input, expected) => {
    expect(escapeHtml(input)).toBe(expected)
  })

  /** `&` first, or the escapes escape each other's output. */
  it('không escape hai lần: & phải được xử lý trước', () => {
    expect(escapeHtml('&lt;')).toBe('&amp;lt;')
  })

  it('thoát được cả kiểu phá thuộc tính lẫn kiểu phá thẻ', () => {
    expect(escapeHtml('" onerror="alert(1)')).not.toContain('"')
    expect(escapeHtml('</title><script>')).not.toContain('<')
  })
})
