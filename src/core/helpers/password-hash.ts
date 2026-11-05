import 'server-only'

import { randomBytes, scrypt as scryptCallback, ScryptOptions, timingSafeEqual } from 'node:crypto'
import { logger } from '@/infrastructure/logging/logger'

/** Bọc tay thay `promisify`: overload của `scrypt` làm `promisify` mất tham số `options`. */
const scrypt = (password: string, salt: Buffer, keylen: number, options: ScryptOptions) =>
  new Promise<Buffer>((resolve, reject) =>
    scryptCallback(password, salt, keylen, options, (error, key) =>
      error ? reject(error) : resolve(key)
    )
  )

const log = logger.child({ module: 'password-hash' })

/**
 * Băm mật khẩu artifact bằng `crypto.scrypt` CÓ SẴN trong Node — không thêm dependency (spec R4).
 *
 * Vì sao không bcrypt/argon2: `bcryptjs` là ~60 kB cho một hàm và chưa có trong lockfile; `argon2`
 * là native binary theo platform, và `artifact-serve-import-graph.test.ts` tồn tại chính vì một
 * native module (`canvas`) từng làm MỌI request `/a/` 500 lúc load module. Đường public không được
 * phụ thuộc thêm binary nào. Vì sao không `createHash('sha256')` như `mcp-oauth.service.ts`: không
 * salt, không work factor — đó là hash cho token ngẫu nhiên 256 bit, không phải cho chuỗi người gõ.
 *
 * Tham số `N=2^14, r=8, p=5` là một bộ OWASP liệt kê; `128·N·r` = 16 MB < `maxmem` mặc định 32 MB.
 * Tham số NẰM TRONG CHUỖI lưu (`scrypt$14$8$5$<salt>$<key>`) để sau này tăng mà không phá hàng cũ:
 * `verifyPassword` đọc tham số từ chuỗi, không từ hằng.
 */
const SCRYPT_LOG_N = 14
const SCRYPT_R = 8
const SCRYPT_P = 5
const SALT_BYTES = 16
const KEY_BYTES = 64

/** Khoảng tham số chấp nhận khi ĐỌC một chuỗi cũ — chặn chuỗi hỏng đẩy scrypt lên vài GB RAM. */
const MAX_LOG_N = 20
const MAX_R = 32
const MAX_P = 16

export const PASSWORD_HASH_PREFIX = 'scrypt$'

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES)
  const key = await derive(plain, salt, SCRYPT_LOG_N, SCRYPT_R, SCRYPT_P)
  return [
    'scrypt',
    SCRYPT_LOG_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString('base64url'),
    key.toString('base64url'),
  ].join('$')
}

/**
 * `false` cho mọi thứ không phải "đúng mật khẩu": sai, chuỗi lưu dị dạng, tham số ngoài khoảng. Chuỗi
 * dị dạng được log ERROR — đó là dữ liệu hỏng trong DB, không phải người quét gõ sai — nhưng KHÔNG
 * throw: người quét không chịu lỗi của hàng.
 */
export async function verifyPassword(plain: string, stored: string | null): Promise<boolean> {
  const parsed = parseStored(stored)
  if (!parsed) {
    log.error({ storedPrefix: stored?.slice(0, 12) ?? null }, 'Artifact password hash is malformed')
    return false
  }

  const key = await derive(plain, parsed.salt, parsed.logN, parsed.r, parsed.p)
  if (key.byteLength !== parsed.key.byteLength) return false
  return timingSafeEqual(key, parsed.key)
}

function parseStored(stored: string | null) {
  if (!stored) return null
  const parts = stored.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return null

  const logN = Number(parts[1])
  const r = Number(parts[2])
  const p = Number(parts[3])
  if (!Number.isInteger(logN) || logN < 1 || logN > MAX_LOG_N) return null
  if (!Number.isInteger(r) || r < 1 || r > MAX_R) return null
  if (!Number.isInteger(p) || p < 1 || p > MAX_P) return null

  const salt = Buffer.from(parts[4], 'base64url')
  const key = Buffer.from(parts[5], 'base64url')
  if (salt.byteLength === 0 || key.byteLength === 0) return null

  return { logN, r, p, salt, key }
}

async function derive(plain: string, salt: Buffer, logN: number, r: number, p: number) {
  const N = 2 ** logN
  return scrypt(plain.normalize('NFC'), salt, KEY_BYTES, { N, r, p, maxmem: 128 * N * r * 2 })
}
