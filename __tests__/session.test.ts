import { describe, expect, it, vi } from 'vitest'

/**
 * Test thuần, KHÔNG cần Postgres.
 *
 * Ba mock dưới đây không phải để "qua được test" — chúng tách ba thứ không thuộc phạm vi của
 * phép kiểm này:
 *  - `server-only` throw khi được nạp ngoài môi trường react-server, và nó không liên quan gì
 *    tới token.
 *  - `next/headers` cần một request context; `createSession`/`destroySession` không được test ở
 *    đây (chúng cần DB), chỉ các hàm thuần.
 *  - `@/lib/db` là ranh giới DB.
 */
vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({ cookies: async () => new Map() }))
vi.mock('@/lib/db', () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
  pool: {},
}))

import {
  generateSessionToken,
  hashSessionToken,
  sessionCookieOptions,
  timingSafeEqualHex,
} from '@/lib/auth/session'

describe('generateSessionToken', () => {
  it('sinh giá trị khác nhau mỗi lần', () => {
    const tokens = new Set(Array.from({ length: 500 }, () => generateSessionToken()))
    // 500 lần gọi ra 500 giá trị khác nhau. Trùng một cái là CSPRNG hỏng hoặc có ai đó thay
    // `randomBytes` bằng một bộ đếm.
    expect(tokens.size).toBe(500)
  })

  it('mang đủ 32 byte entropy', () => {
    expect(Buffer.from(generateSessionToken(), 'base64url')).toHaveLength(32)
  })

  it('an toàn trong URL và cookie — không có ký tự cần escape', () => {
    for (let i = 0; i < 50; i++) {
      expect(generateSessionToken()).toMatch(/^[A-Za-z0-9_-]+$/)
    }
  })
})

describe('hashSessionToken', () => {
  it('KHÔNG trả lại chính token', () => {
    const token = generateSessionToken()
    // Đây là bất biến của schema (`sessions.token_hash` — "lưu hash, không lưu token"). Nếu hàm
    // này thành hàm đồng nhất thì rò bảng `sessions` là rò quyền mạo danh mọi người đang đăng nhập.
    expect(hashSessionToken(token)).not.toBe(token)
  })

  it('ra 64 ký tự hex (SHA-256)', () => {
    expect(hashSessionToken(generateSessionToken())).toMatch(/^[0-9a-f]{64}$/)
  })

  it('tiền định: cùng token ra cùng hash', () => {
    const token = generateSessionToken()
    expect(hashSessionToken(token)).toBe(hashSessionToken(token))
  })

  it('token khác ra hash khác', () => {
    expect(hashSessionToken('a')).not.toBe(hashSessionToken('b'))
  })

  it('không suy ra được token từ hash bằng cách so tiền tố', () => {
    const token = generateSessionToken()
    const hash = hashSessionToken(token)
    // Hash không được chứa token hay bất kỳ tiền tố đáng kể nào của nó.
    expect(hash).not.toContain(token.slice(0, 8))
  })
})

describe('timingSafeEqualHex', () => {
  const a = hashSessionToken('x')
  const b = hashSessionToken('y')

  it('bằng nhau thì true', () => {
    expect(timingSafeEqualHex(a, a)).toBe(true)
  })

  it('khác nhau thì false', () => {
    expect(timingSafeEqualHex(a, b)).toBe(false)
  })

  it('lệch độ dài thì false, không throw', () => {
    // `crypto.timingSafeEqual` THROW khi hai buffer lệch độ dài. Dùng nó mà không kiểm trước là
    // biến một cookie bị cắt ngắn thành một exception 500 ở mọi request.
    expect(() => timingSafeEqualHex(a, a.slice(0, 32))).not.toThrow()
    expect(timingSafeEqualHex(a, a.slice(0, 32))).toBe(false)
  })

  it('chuỗi rỗng thì false, không phải true', () => {
    expect(timingSafeEqualHex('', '')).toBe(false)
  })

  it('hex không hợp lệ thì false — cái bẫy Buffer.from cắt im lặng', () => {
    // `Buffer.from('zz', 'hex')` trả buffer RỖNG chứ không throw. Hai chuỗi rác khác nhau đều ra
    // buffer rỗng, và `timingSafeEqual(empty, empty)` là `true`. Không kiểm độ dài byte sau khi
    // decode thì hàm này nói "bằng nhau" cho hai giá trị không liên quan gì.
    expect(timingSafeEqualHex('zz', 'yy')).toBe(false)
    expect(timingSafeEqualHex('z'.repeat(64), 'y'.repeat(64))).toBe(false)
  })

  it('lệch ở byte đầu và lệch ở byte cuối cho cùng kết quả', () => {
    // Một phép so thoát sớm vẫn trả `false` cho cả hai, nên test này KHÔNG chứng minh được
    // constant-time — nó chỉ chốt phần hành vi quan sát được. Phần "đúng là timing-safe" được
    // chốt bằng test tĩnh ngay dưới.
    const base = 'a'.repeat(64)
    expect(timingSafeEqualHex(base, 'b' + base.slice(1))).toBe(false)
    expect(timingSafeEqualHex(base, base.slice(0, 63) + 'b')).toBe(false)
  })

  it('cài bằng crypto.timingSafeEqual, không phải ===', async () => {
    const { readFileSync } = await import('node:fs')
    const source = readFileSync(new URL('../lib/auth/session.ts', import.meta.url), 'utf8')
    // Test tĩnh, cố ý: tính chất "không rò thời gian" không quan sát được từ giá trị trả về, nên
    // phép kiểm duy nhất còn lại là ai đó đổi `timingSafeEqual` thành `===` thì test đỏ.
    expect(source).toContain('timingSafeEqual(ba, bb)')
  })
})

describe('sessionCookieOptions', () => {
  const opts = sessionCookieOptions(new Date(Date.now() + 1000))

  it('httpOnly — JavaScript của trang không đọc được token', () => {
    expect(opts.httpOnly).toBe(true)
  })

  it('sameSite lax — chặn CSRF mà vẫn giữ phiên khi đi từ link ngoài vào', () => {
    expect(opts.sameSite).toBe('lax')
  })

  it('path / — có hiệu lực cho cả `/<slug>` lẫn `/api`', () => {
    expect(opts.path).toBe('/')
  })

  it('secure tắt khi không phải production, để dev trên http://localhost đặt được cookie', () => {
    expect(opts.secure).toBe(process.env.NODE_ENV === 'production')
  })

  it('có hạn, không phải cookie phiên trình duyệt', () => {
    expect(opts.expires).toBeInstanceOf(Date)
  })
})
