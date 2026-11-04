import { describe, expect, it } from 'vitest'
import { checkDestination } from '@/lib/links/destination'

describe('checkDestination — PoC open redirect từ báo cáo', () => {
  /**
   * Đây là PoC thật, không phải ví dụ dựng ra. Guard của bản thương mại là:
   *
   *     redirectTo.startsWith('/') && !redirectTo.startsWith('//')
   *
   * `/\evil.com` qua được: ký tự thứ hai là `\`, không phải `/`. Nhưng WHATWG URL coi `\` là
   * dấu phân cách path cho http/https, nên nó phân giải thành `//evil.com` → host ngoài.
   *
   * Test dưới chứng minh hai việc cùng lúc: `checkDestination` từ chối nó, VÀ phép phân giải
   * URL thật sự đưa nó ra ngoài (nên việc từ chối không phải thừa).
   */
  it('từ chối /\\evil.com', () => {
    const result = checkDestination('/\\evil.com')
    expect(result.ok).toBe(false)
  })

  it('chứng minh /\\evil.com thật sự phân giải ra host ngoài', () => {
    // Nếu assertion này một ngày đổi, nghĩa là hành vi WHATWG URL đã đổi — không phải
    // nghĩa là guard thừa.
    expect(new URL('/\\evil.com', 'https://link.noi-bo.test').hostname).toBe('evil.com')
  })

  it('từ chối cả biến thể gạch chéo trộn', () => {
    for (const raw of ['/\\/evil.com', '\\\\evil.com', '/\\\\evil.com', '\\/evil.com']) {
      expect(checkDestination(raw).ok, raw).toBe(false)
    }
  })
})

describe('checkDestination — scheme', () => {
  it('từ chối javascript:alert(1)', () => {
    const result = checkDestination('javascript:alert(1)')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('javascript:')
  })

  it('từ chối các scheme nguy hiểm khác', () => {
    const cases = [
      'data:text/html,<script>alert(1)</script>',
      'file:///etc/passwd',
      'vbscript:msgbox(1)',
      'ftp://example.com/x',
      'mailto:ai@do.test',
      'JAVASCRIPT:alert(1)', // chữ hoa cũng vậy — URL chuẩn hoá protocol về chữ thường
      'jAvAsCrIpT:alert(1)',
    ]
    for (const raw of cases) {
      expect(checkDestination(raw).ok, raw).toBe(false)
    }
  })

  it('nhận http và https', () => {
    expect(checkDestination('https://ok.com/x').ok).toBe(true)
    expect(checkDestination('http://ok.com/x').ok).toBe(true)
  })
})

describe('checkDestination — URL tương đối', () => {
  it('từ chối //evil.com', () => {
    expect(checkDestination('//evil.com').ok).toBe(false)
  })

  it('từ chối URL không có scheme', () => {
    for (const raw of ['evil.com', 'www.evil.com/path', '/duong-dan-noi-bo', 'ok.com:8080/x']) {
      expect(checkDestination(raw).ok, raw).toBe(false)
    }
  })
})

describe('checkDestination — nhận và chuẩn hoá', () => {
  it('nhận https://ok.com/x và trả URL đã chuẩn hoá', () => {
    const result = checkDestination('https://ok.com/x')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.normalized).toBe('https://ok.com/x')
  })

  it('giữ query string và fragment', () => {
    const result = checkDestination('https://ok.com/x?a=1&b=2#phan')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.normalized).toBe('https://ok.com/x?a=1&b=2#phan')
  })

  it('bỏ khoảng trắng hai đầu', () => {
    const result = checkDestination('  https://ok.com/x  ')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.normalized).toBe('https://ok.com/x')
  })

  it('nhận port và userinfo không làm đổi host', () => {
    const result = checkDestination('https://ok.com:8443/x')
    expect(result.ok).toBe(true)
    if (result.ok) expect(new URL(result.normalized).hostname).toBe('ok.com')
  })
})

describe('checkDestination — đầu vào biên', () => {
  it('từ chối chuỗi rỗng và chuỗi chỉ có khoảng trắng', () => {
    expect(checkDestination('').ok).toBe(false)
    expect(checkDestination('   ').ok).toBe(false)
    expect(checkDestination('\n\t ').ok).toBe(false)
  })

  it('từ chối URL dài quá 2048 ký tự', () => {
    const tooLong = `https://ok.com/${'a'.repeat(2048)}`
    expect(checkDestination(tooLong).ok).toBe(false)
    // Ngay dưới ngưỡng thì vẫn nhận.
    const justUnder = `https://ok.com/${'a'.repeat(2048 - 'https://ok.com/'.length)}`
    expect(justUnder).toHaveLength(2048)
    expect(checkDestination(justUnder).ok).toBe(true)
  })

  it('từ chối http:// không có hostname', () => {
    expect(checkDestination('http://').ok).toBe(false)
  })
})
