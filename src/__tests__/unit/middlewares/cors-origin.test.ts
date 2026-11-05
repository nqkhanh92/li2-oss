import { describe, it, expect, afterEach, vi } from 'vitest'
import { isAllowedOrigin } from '@/shared/lib/middlewares/with-cors'

/**
 * Allowlist CORS này đi kèm `Access-Control-Allow-Credentials: true`, nên mỗi origin được nhận là
 * một tên miền được phép **đọc dữ liệu đã đăng nhập** của người dùng. Sai một ly ở đây không phải
 * lỗi hiển thị.
 *
 * Trước 2026-10-27 file này **không có test nào**.
 */

afterEach(() => vi.unstubAllEnvs())

describe('isAllowedOrigin — danh sách cứng', () => {
  it('nhận localhost và mọi tên miền con của nó', () => {
    for (const o of ['http://localhost:3000', 'http://localhost', 'http://app.localhost:3000']) {
      expect(isAllowedOrigin(o)).toBe(true)
    }
  })

  /**
   * Bản self-host KHÔNG cho sẵn tên miền nào ngoài `localhost`. Đây là khác biệt có chủ ý so với
   * bản thương mại: allowlist cứng áp cho **mọi** bản cài, nên một tên miền của nhà cung cấp nằm
   * trong đó là cho phép nó đọc dữ liệu đã đăng nhập trên máy chủ của NGƯỜI KHÁC.
   */
  it('KHÔNG cho sẵn tên miền của nhà cung cấp', () => {
    for (const o of ['https://li2.ai', 'https://app.li2.ai', 'https://example.com']) {
      expect(isAllowedOrigin(o)).toBe(false)
    }
  })

  /**
   * Ca kinh điển: so khớp bằng `includes` sẽ nhận hết đám dưới đây. Tên miền phải khớp **đúng**
   * hoặc kết thúc bằng `.<tên miền>`.
   */
  it('TỪ CHỐI tên miền chỉ CHỨA chuỗi cho phép', () => {
    for (const o of [
      'https://li2.ai.ke-gian.com',
      'https://notli2.ai',
      'https://li2.ai.evil',
      'https://example.com.attacker.net',
      'https://xli2.ai',
    ]) {
      expect(isAllowedOrigin(o)).toBe(false)
    }
  })

  it('TỪ CHỐI origin rỗng, null, hoặc không phải URL', () => {
    for (const o of [null, '', 'khong-phai-url', 'localhost']) {
      expect(isAllowedOrigin(o as string | null)).toBe(false)
    }
  })

  it('không phân biệt chữ hoa thường ở hostname', () => {
    expect(isAllowedOrigin('http://APP.LOCALHOST:3000')).toBe(true)
  })
})

describe('isAllowedOrigin — mở rộng bằng env', () => {
  it('mặc định (env trống) KHÔNG nhận tên miền ngoài danh sách cứng', () => {
    expect(isAllowedOrigin('https://app.example.com')).toBe(false)
  })

  it('khai trong env thì nhận, gồm cả tên miền con', () => {
    vi.stubEnv('CORS_EXTRA_BASE_DOMAINS', 'example.com')
    expect(isAllowedOrigin('https://app.example.com')).toBe(true)
    expect(isAllowedOrigin('https://example.com')).toBe(true)
  })

  it('nhận nhiều tên miền, bỏ khoảng trắng và mục rỗng', () => {
    vi.stubEnv('CORS_EXTRA_BASE_DOMAINS', ' example.com , , example.test ')
    expect(isAllowedOrigin('https://example.com')).toBe(true)
    expect(isAllowedOrigin('https://b.example.test')).toBe(true)
  })

  /** Nới bằng env vẫn phải chịu đúng luật khớp của danh sách cứng. */
  it('env KHÔNG nới lỏng luật khớp — vẫn từ chối tên miền chỉ chứa chuỗi', () => {
    vi.stubEnv('CORS_EXTRA_BASE_DOMAINS', 'example.com')
    expect(isAllowedOrigin('https://example.com.ke-gian.com')).toBe(false)
  })

  it('env rác không làm nhận bừa', () => {
    vi.stubEnv('CORS_EXTRA_BASE_DOMAINS', ',,,   ,,')
    expect(isAllowedOrigin('https://app.example.com')).toBe(false)
    expect(isAllowedOrigin('http://localhost:3000')).toBe(true)
  })
})
