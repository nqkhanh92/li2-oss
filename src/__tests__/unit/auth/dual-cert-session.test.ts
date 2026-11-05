import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as jose from 'jose'
import {
  TEST_INSIDE_CERT_BASE64,
  TEST_INSIDE_KEY_PEM,
} from '@/__tests__/utils/inside-test-cert'

/**
 * `getSession` chấp nhận token của Inside — nhưng CHỈ token của Inside.
 *
 * Token Inside ký bằng một cert khác (`cert-built-in`) vì Inside là một ứng dụng Casdoor khác.
 * Không có tầng này thì mọi lời gọi từ `admin.li2.ai` trả 401 ở ngay bước chữ ký.
 *
 * ⚠ Test ký token THẬT bằng cặp khoá RSA thật, không mock `jwtVerify`. Mock cái hàm đang kiểm thì
 * test chỉ chứng minh mock chạy — và đây là cửa vào của **mọi** route có `withAuth`, nên nó phải
 * được kiểm bằng mật mã thật.
 */

const PRIMARY_CLIENT = 'primary-client-id'
const INSIDE_CLIENT = 'inside-client-id'

let primary: jose.GenerateKeyPairResult
let insideKey: jose.CryptoKey
let stranger: jose.GenerateKeyPairResult

const sign = async (signer: jose.GenerateKeyPairResult | jose.CryptoKey, claims: Record<string, unknown>) =>
  new jose.SignJWT({ id: 'user-1', email: 'a@b.c', ...claims })
    .setProtectedHeader({ alg: 'RS256' })
    .setSubject('user-1')
    .setExpirationTime('1h')
    .sign(('privateKey' in (signer as any) ? (signer as any).privateKey : signer) as jose.CryptoKey)

/** Nạp lại module để mỗi ca đọc env mới và bỏ cache khoá. */
const loadSession = async () => {
  vi.resetModules()
  vi.doMock('@/shared/lib/auth', () => ({
    getPublicKey: async () => primary.publicKey,
  }))
  vi.doMock('next/headers', () => ({
    cookies: async () => ({ get: () => undefined }),
    headers: async () => ({ get: () => null }),
  }))
  return (await import('@/shared/lib/auth/session')).getSession
}

const requestWith = (token: string) =>
  ({
    cookies: { get: () => undefined },
    headers: { get: (k: string) => (k === 'Authorization' ? `Bearer ${token}` : null) },
  }) as any

beforeEach(async () => {
  primary = await jose.generateKeyPair('RS256')
  insideKey = (await jose.importPKCS8(TEST_INSIDE_KEY_PEM, 'RS256')) as jose.CryptoKey
  stranger = await jose.generateKeyPair('RS256')
  vi.stubEnv('CASDOOR_INSIDE_BASE64_CERT', TEST_INSIDE_CERT_BASE64)
  vi.stubEnv('CASDOOR_INSIDE_CLIENT_ID', INSIDE_CLIENT)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('getSession — cert chính', () => {
  it('nhận token ký bằng cert chính, không cần audience nào', async () => {
    const getSession = await loadSession()
    const token = await sign(primary, { aud: [PRIMARY_CLIENT] })
    await expect(getSession(requestWith(token))).resolves.toMatchObject({
      id: 'user-1',
      email: 'a@b.c',
    })
  })
})

describe('getSession — cert phụ của Inside', () => {
  it('nhận token Inside đúng chữ ký VÀ đúng audience', async () => {
    const getSession = await loadSession()
    const token = await sign(insideKey, { aud: [INSIDE_CLIENT] })
    await expect(getSession(requestWith(token))).resolves.toMatchObject({ id: 'user-1' })
  })

  it('nhận cả khi audience nằm ở azp thay vì aud', async () => {
    const getSession = await loadSession()
    const token = await sign(insideKey, { azp: INSIDE_CLIENT })
    await expect(getSession(requestWith(token))).resolves.toMatchObject({ id: 'user-1' })
  })

  /**
   * Ca quan trọng nhất của cả file. `cert-built-in` dùng chung với `app-built-in` của Casdoor,
   * nên đúng chữ ký KHÔNG chứng minh token đến từ Inside. Thiếu kiểm audience là mở toàn bộ
   * route `withAuth` cho mọi ứng dụng dùng cert mặc định.
   */
  it('TỪ CHỐI token đúng chữ ký phụ nhưng SAI audience', async () => {
    const getSession = await loadSession()
    const token = await sign(insideKey, { aud: ['mot-app-khac-dung-chung-cert'] })
    await expect(getSession(requestWith(token))).resolves.toBeNull()
  })

  it('TỪ CHỐI token đúng chữ ký phụ nhưng KHÔNG có audience nào', async () => {
    const getSession = await loadSession()
    const token = await sign(insideKey, {})
    await expect(getSession(requestWith(token))).resolves.toBeNull()
  })
})

describe('getSession — từ chối', () => {
  it('token ký bằng khoá lạ → null, dù audience đúng', async () => {
    const getSession = await loadSession()
    const token = await sign(stranger, { aud: [INSIDE_CLIENT] })
    await expect(getSession(requestWith(token))).resolves.toBeNull()
  })

  it('token rác → null', async () => {
    const getSession = await loadSession()
    await expect(getSession(requestWith('khong-phai-jwt'))).resolves.toBeNull()
  })

  it('không token → null', async () => {
    const getSession = await loadSession()
    const req = { cookies: { get: () => undefined }, headers: { get: () => null } } as any
    await expect(getSession(req)).resolves.toBeNull()
  })

  it('token Inside ĐÃ HẾT HẠN → null', async () => {
    const getSession = await loadSession()
    const token = await new jose.SignJWT({ id: 'user-1', aud: [INSIDE_CLIENT] })
      .setProtectedHeader({ alg: 'RS256' })
      .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
      .sign(insideKey)
    await expect(getSession(requestWith(token))).resolves.toBeNull()
  })
})

describe('getSession — thiếu cấu hình thì tắt hẳn cert phụ (fail closed)', () => {
  it('thiếu CLIENT_ID → từ chối token Inside, dù cert đúng', async () => {
    vi.stubEnv('CASDOOR_INSIDE_CLIENT_ID', '')
    const getSession = await loadSession()
    const token = await sign(insideKey, { aud: [INSIDE_CLIENT] })
    await expect(getSession(requestWith(token))).resolves.toBeNull()
  })

  it('thiếu CERT → từ chối token Inside', async () => {
    vi.stubEnv('CASDOOR_INSIDE_BASE64_CERT', '')
    const getSession = await loadSession()
    const token = await sign(insideKey, { aud: [INSIDE_CLIENT] })
    await expect(getSession(requestWith(token))).resolves.toBeNull()
  })

  it('cert phụ hỏng (không giải mã được) KHÔNG làm vỡ đường chính', async () => {
    vi.stubEnv('CASDOOR_INSIDE_BASE64_CERT', 'day-khong-phai-base64-cua-cert')
    const getSession = await loadSession()
    const token = await sign(primary, {})
    await expect(getSession(requestWith(token))).resolves.toMatchObject({ id: 'user-1' })
  })

  it('không cấu hình gì cả → hành vi y như trước khi có tính năng này', async () => {
    vi.stubEnv('CASDOOR_INSIDE_BASE64_CERT', '')
    vi.stubEnv('CASDOOR_INSIDE_CLIENT_ID', '')
    const getSession = await loadSession()
    await expect(getSession(requestWith(await sign(primary, {})))).resolves.toMatchObject({
      id: 'user-1',
    })
    await expect(getSession(requestWith(await sign(insideKey, {})))).resolves.toBeNull()
  })
})

/**
 * Hai tầng phòng thủ, và tầng dưới phải được khoá RIÊNG.
 *
 * Kiểm nghịch phát hiện: bỏ điều kiện client-id khỏi `getInsidePublicKey` mà 13 ca trên **vẫn
 * xanh hết**, vì tầng audience đã chặn thay. Hành vi đúng, nhưng bộ test không chứng minh được
 * tầng dưới còn tồn tại — và nếu mai này ai nới tầng audience thì tầng dưới đã âm thầm biến mất
 * từ lâu mà không ai hay.
 */
describe('getInsidePublicKey — tầng phòng thủ thứ hai, khoá riêng', () => {
  const loadCertModule = async () => {
    vi.resetModules()
    return import('@/shared/lib/auth/inside-cert')
  }

  it('thiếu CLIENT_ID thì KHÔNG nạp khoá, dù cert hợp lệ', async () => {
    vi.stubEnv('CASDOOR_INSIDE_CLIENT_ID', '')
    const m = await loadCertModule()
    expect(m.isInsideCertConfigured()).toBe(false)
    await expect(m.getInsidePublicKey()).resolves.toBeNull()
  })

  it('đủ cả hai thì nạp được khoá', async () => {
    const m = await loadCertModule()
    expect(m.isInsideCertConfigured()).toBe(true)
    await expect(m.getInsidePublicKey()).resolves.not.toBeNull()
  })

  it('cert hỏng → null, không ném', async () => {
    vi.stubEnv('CASDOOR_INSIDE_BASE64_CERT', 'rac')
    const m = await loadCertModule()
    await expect(m.getInsidePublicKey()).resolves.toBeNull()
  })
})
