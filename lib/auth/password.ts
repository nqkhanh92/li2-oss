import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from 'node:crypto'

/**
 * Bọc `scrypt` thành promise bằng tay thay vì `promisify`.
 *
 * `promisify` chọn overload đầu tiên của `scrypt` (3 tham số, không có `options`), nên truyền
 * `{ N, r, p }` làm TypeScript báo "Expected 3 arguments, but got 4". Lỗi này **không** hiện ra
 * khi chạy `vitest` — vitest không type-check — mà chỉ hiện lúc `next build`. Đó là lý do bước
 * build phải nằm trong quy trình, không chỉ bước test.
 */
function scrypt(
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(password, salt, keylen, options, (err, derived) => {
      if (err) reject(err)
      else resolve(derived)
    })
  })
}

/**
 * Băm mật khẩu bằng scrypt. Dùng cho CẢ tài khoản người dùng VÀ mật khẩu bảo vệ link.
 *
 * Vì sao không phải một vòng SHA-256: báo cáo đánh giá bản thương mại tìm thấy ba bundle secret
 * dẫn khoá bằng **một vòng SHA-256 không salt**, và mật khẩu short link được lưu **bản rõ** ở ba
 * lớp. Hai lỗi đó cùng một gốc — coi "băm" là một phép biến đổi chuỗi chứ không phải một hàm
 * dẫn khoá có chi phí. scrypt có chi phí, và nó nằm trong `node:crypto` nên không thêm dep nào.
 *
 * N=2^15 là mức cho đăng nhập tương tác: ~100ms trên máy hiện đại, đủ chậm để brute-force offline
 * thành đắt, đủ nhanh để người dùng không chờ.
 */
const N = 2 ** 15
const R = 8
const P = 1
const KEY_LEN = 32
const SALT_LEN = 16

export async function hashPassword(plain: string): Promise<string> {
  if (plain.length === 0) throw new Error('Mật khẩu rỗng')
  const salt = randomBytes(SALT_LEN)
  const key = (await scrypt(plain, salt, KEY_LEN, { N, r: R, p: P, maxmem: 64 * 1024 * 1024 }))
  return ['scrypt', N, R, P, salt.toString('base64'), key.toString('base64')].join('$')
}

/**
 * So mật khẩu. Trả `false` cho mọi dạng hỏng (chuỗi sai định dạng, tham số không phải số) thay vì
 * throw — người gọi là đường đăng nhập, và một exception ở đó dễ thành thông điệp lỗi phân biệt
 * được "sai định dạng" với "sai mật khẩu".
 */
export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  // Tách bằng destructuring thay vì đánh chỉ số: với `noUncheckedIndexedAccess`, `parts[4]` có
  // kiểu `string | undefined`, và trình biên dịch đúng — một chuỗi hỏng cho ra đúng tình huống đó.
  const [scheme, rawN, rawR, rawP, rawSalt, rawHash] = stored.split('$')
  if (scheme !== 'scrypt') return false
  if (
    rawN === undefined ||
    rawR === undefined ||
    rawP === undefined ||
    rawSalt === undefined ||
    rawHash === undefined
  ) {
    return false
  }

  const n = Number(rawN)
  const r = Number(rawR)
  const p = Number(rawP)
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) return false
  if (n < 2 || r < 1 || p < 1) return false
  // Chặn tham số do kẻ tấn công đặt để buộc máy chủ tính một phép scrypt khổng lồ.
  if (n > 2 ** 20 || r > 32 || p > 16) return false

  let salt: Buffer
  let expected: Buffer
  try {
    salt = Buffer.from(rawSalt, 'base64')
    expected = Buffer.from(rawHash, 'base64')
  } catch {
    return false
  }
  if (expected.length === 0) return false

  let actual: Buffer
  try {
    actual = (await scrypt(plain, salt, expected.length, {
      N: n,
      r,
      p,
      maxmem: 128 * 1024 * 1024,
    }))
  } catch {
    return false
  }

  // Độ dài phải khớp trước khi timingSafeEqual, vì nó throw nếu lệch.
  if (actual.length !== expected.length) return false
  return timingSafeEqual(actual, expected)
}
