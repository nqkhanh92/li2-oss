import { beforeEach, describe, expect, it, vi } from 'vitest'

const logError = vi.fn()
vi.mock('@/infrastructure/logging/logger', () => ({
  logger: { child: () => ({ error: (...args: any[]) => logError(...args), warn: vi.fn(), info: vi.fn() }) },
}))

import { hashPassword, verifyPassword, PASSWORD_HASH_PREFIX } from '@/core/helpers/password-hash'

beforeEach(() => vi.clearAllMocks())

/**
 * R4 — scrypt của Node, không dependency. Hợp đồng chuỗi lưu: `scrypt$<logN>$<r>$<p>$<salt>$<key>`,
 * tham số nằm trong chuỗi để tăng sau này mà không phá hàng cũ.
 */
describe('hashPassword / verifyPassword', () => {
  it('round-trip: đúng mật khẩu → true, sai → false', async () => {
    const stored = await hashPassword('Abcdefgh1')
    expect(await verifyPassword('Abcdefgh1', stored)).toBe(true)
    expect(await verifyPassword('Abcdefgh2', stored)).toBe(false)
    expect(await verifyPassword('', stored)).toBe(false)
  })

  it('chuỗi lưu có đúng định dạng và tham số 14/8/5 — A4 grep `scrypt$%`', async () => {
    const stored = await hashPassword('Abcdefgh1')
    expect(stored.startsWith(PASSWORD_HASH_PREFIX)).toBe(true)
    const parts = stored.split('$')
    expect(parts).toHaveLength(6)
    expect(parts.slice(0, 4)).toEqual(['scrypt', '14', '8', '5'])
    // base64url: không '+', '/', '='
    expect(parts[4]).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(parts[5]).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('hai lần băm cùng mật khẩu ra hai chuỗi khác — có salt', async () => {
    const [a, b] = await Promise.all([hashPassword('Abcdefgh1'), hashPassword('Abcdefgh1')])
    expect(a).not.toBe(b)
    expect(await verifyPassword('Abcdefgh1', a)).toBe(true)
    expect(await verifyPassword('Abcdefgh1', b)).toBe(true)
  })

  it('tham số đọc từ CHUỖI, không từ hằng: chuỗi cũ với logN khác vẫn verify được', async () => {
    const stored = await hashPassword('Abcdefgh1')
    // Dựng một chuỗi với tham số nhẹ hơn bằng chính hàm — mô phỏng hàng cũ sau khi hằng tăng.
    const { scryptSync } = await import('node:crypto')
    const salt = Buffer.from('0123456789abcdef')
    const key = scryptSync('Abcdefgh1', salt, 64, { N: 2 ** 10, r: 4, p: 1 })
    const legacy = ['scrypt', 10, 4, 1, salt.toString('base64url'), key.toString('base64url')].join('$')

    expect(await verifyPassword('Abcdefgh1', legacy)).toBe(true)
    expect(await verifyPassword('Abcdefgh1', stored)).toBe(true)
  })

  it.each([
    null,
    '',
    'bcrypt$2b$10$abc',
    'scrypt$14$8$5$onlyfive',
    'scrypt$x$8$5$c2FsdA$a2V5',
    'scrypt$99$8$5$c2FsdA$a2V5',
    'scrypt$14$8$5$$a2V5',
    'plain-text-password',
  ])('chuỗi lưu dị dạng %s → false + log ERROR, không throw', async (stored) => {
    await expect(verifyPassword('Abcdefgh1', stored as any)).resolves.toBe(false)
    expect(logError).toHaveBeenCalled()
  })

  it('Unicode: cùng chuỗi ở hai dạng chuẩn hoá vẫn khớp (NFC)', async () => {
    const stored = await hashPassword('mật khẩu 123')
    expect(await verifyPassword('mật khẩu 123'.normalize('NFD'), stored)).toBe(true)
  })

  it('một lần băm dưới 400 ms trên máy dev — p=5 không thành vector DoS CPU khi đã có khoá 3 lần', async () => {
    const started = performance.now()
    await hashPassword('Abcdefgh1')
    expect(performance.now() - started).toBeLessThan(400)
  })
})
