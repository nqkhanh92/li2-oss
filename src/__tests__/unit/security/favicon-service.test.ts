import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * `getFavicon` là chỗ **máy chủ** đi lấy một tài nguyên theo URL người dùng nhập, nên nó mang đúng
 * rủi ro mà `checkFetchableUrl` tồn tại để chặn — cộng một rủi ro mà hàm đó **không** thấy được:
 * chuyển hướng. URL đầu tiên sạch không nói gì về chặng thứ hai.
 *
 * Mọi ca ở đây viết theo chiều **không lấy**, vì đó là chiều mất mát.
 */

const redisMock = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn() }))
vi.mock('@/infrastructure/cache/redis', () => ({ redis: redisMock }))

const logMock = vi.hoisted(() => ({
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}))
vi.mock('@/infrastructure/logging/logger', () => ({ logger: { child: () => logMock } }))

const { getFavicon } = await import('@/core/services/favicon.service')

/** Một phản hồi ảnh hợp lệ: ico 4 byte. Nội dung không quan trọng, header mới quan trọng. */
const imageResponse = (contentType = 'image/x-icon', bytes = 4) =>
  ({
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': contentType }),
    arrayBuffer: async () => new Uint8Array(bytes).buffer,
  }) as unknown as Response

const redirectTo = (location: string) =>
  ({
    ok: false,
    status: 302,
    headers: new Headers({ location }),
    arrayBuffer: async () => new ArrayBuffer(0),
  }) as unknown as Response

beforeEach(() => {
  vi.clearAllMocks()
  redisMock.get.mockResolvedValue(null)
  redisMock.set.mockResolvedValue('OK')
})

describe('getFavicon — chuyển hướng', () => {
  /**
   * Ca đắt nhất của cả file. `checkFetchableUrl` chỉ thấy URL **đầu tiên**; một site bên ngoài hợp
   * lệ chỉ cần trả `302 → 169.254.169.254` là lấy được khoá máy ảo nếu ta để `fetch` tự follow.
   */
  it('KHÔNG đi theo chuyển hướng tới địa chỉ nội bộ', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(redirectTo('http://169.254.169.254/latest/meta-data/'))
    vi.stubGlobal('fetch', fetchMock)

    expect(await getFavicon(new URL('https://example.com/trang'))).toBeNull()
    // Chỉ chặng ĐẦU được gọi; chặng nội bộ không bao giờ xảy ra.
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('KHÔNG đi theo chuyển hướng tới localhost, kể cả qua đường dẫn tương đối', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(redirectTo('http://127.0.0.1:3000/icon.png'))
    vi.stubGlobal('fetch', fetchMock)

    expect(await getFavicon(new URL('https://example.com'))).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('đi theo chuyển hướng tới địa chỉ công khai — đừng chặn quá tay', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(redirectTo('https://cdn.example.com/favicon.ico'))
      .mockResolvedValueOnce(imageResponse())
    vi.stubGlobal('fetch', fetchMock)

    const result = await getFavicon(new URL('https://example.com'))

    expect(result?.contentType).toBe('image/x-icon')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('vòng chuyển hướng không treo máy chủ — tối đa 3 lời gọi', async () => {
    const fetchMock = vi.fn().mockResolvedValue(redirectTo('https://example.com/vong'))
    vi.stubGlobal('fetch', fetchMock)

    expect(await getFavicon(new URL('https://example.com'))).toBeNull()
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(3)
  })
})

describe('getFavicon — loại nội dung', () => {
  /**
   * SVG là XML chạy script được. Phục vụ lại SVG của bên thứ ba **từ origin của mình** là cho họ
   * chạy mã trong origin của mình; `nosniff` + CSP ở route là lớp hai, lớp một là không nhận.
   */
  it('TỪ CHỐI image/svg+xml', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(imageResponse('image/svg+xml')))

    expect(await getFavicon(new URL('https://example.com'))).toBeNull()
  })

  it('TỪ CHỐI text/html — site trả trang 200 thay cho 404 là chuyện thường', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(imageResponse('text/html; charset=utf-8')))

    expect(await getFavicon(new URL('https://example.com'))).toBeNull()
  })

  it.each(['image/png', 'image/x-icon', 'image/webp', 'image/jpeg', 'image/gif'])(
    'nhận %s',
    async (ct) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(imageResponse(ct)))

      expect((await getFavicon(new URL('https://example.com')))?.contentType).toBe(ct)
    }
  )

  it('TỪ CHỐI thân quá 64 KB dù header không khai content-length', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(imageResponse('image/png', 64 * 1024 + 1)))

    expect(await getFavicon(new URL('https://example.com'))).toBeNull()
  })

  it('TỪ CHỐI thân rỗng — 0 byte không phải một ảnh', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(imageResponse('image/png', 0)))

    expect(await getFavicon(new URL('https://example.com'))).toBeNull()
  })
})

describe('getFavicon — cache', () => {
  it('khoá theo ORIGIN, không theo URL đầy đủ: hai link cùng site là một lời gọi', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(imageResponse()))

    await getFavicon(new URL('https://example.com/a?x=1'))
    await getFavicon(new URL('https://example.com/b#c'))

    const keys = redisMock.set.mock.calls.map((c) => c[0])
    expect(new Set(keys).size).toBe(1)
    expect(keys[0]).toBe('favicon:origin:https://example.com')
  })

  /** Nửa còn lại của yêu cầu "nhớ kết quả hỏng". Không có nó, site thiếu favicon bị gọi lại mãi. */
  it('GHI NHỚ cả kết quả hỏng, có TTL', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ETIMEDOUT')))

    expect(await getFavicon(new URL('https://example.com'))).toBeNull()

    const [key, value, mode, ttl] = redisMock.set.mock.calls[0]
    expect(key).toBe('favicon:origin:https://example.com')
    expect(value).toBe('miss')
    expect(mode).toBe('EX')
    expect(ttl).toBeGreaterThan(0)
  })

  it('cache "miss" trả về null mà KHÔNG gọi ra ngoài', async () => {
    redisMock.get.mockResolvedValue('miss')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    expect(await getFavicon(new URL('https://example.com'))).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('cache có ảnh trả về ảnh mà KHÔNG gọi ra ngoài', async () => {
    redisMock.get.mockResolvedValue(
      JSON.stringify({ contentType: 'image/png', b64: Buffer.from('abcd').toString('base64') })
    )
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const result = await getFavicon(new URL('https://example.com'))

    expect(result?.contentType).toBe('image/png')
    expect(result?.body.toString()).toBe('abcd')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  /**
   * Redis hỏng thì **vẫn phục vụ được ảnh**: hàm này chỉ đo và nhớ, không quyết quyền gì. Fail
   * closed ở đây sẽ biến một sự cố Redis thành một danh sách trống ô hình.
   */
  it('Redis hỏng KHÔNG làm hỏng việc lấy ảnh', async () => {
    redisMock.get.mockRejectedValue(new Error('ECONNREFUSED'))
    redisMock.set.mockRejectedValue(new Error('ECONNREFUSED'))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(imageResponse()))

    expect((await getFavicon(new URL('https://example.com')))?.contentType).toBe('image/x-icon')
  })
})

describe('getFavicon — đích của lời gọi', () => {
  it('lấy /favicon.ico của chính origin, KHÔNG qua dịch vụ bên thứ ba', async () => {
    const fetchMock = vi.fn().mockResolvedValue(imageResponse())
    vi.stubGlobal('fetch', fetchMock)

    await getFavicon(new URL('https://vnexpress.net/bai-viet?x=1'))

    // Một bản self-host không được gửi danh sách domain khách hàng cho Google chỉ vì một ô 44px.
    expect(fetchMock.mock.calls[0][0]).toBe('https://vnexpress.net/favicon.ico')
  })
})
