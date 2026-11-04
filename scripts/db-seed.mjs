#!/usr/bin/env node
/**
 * Tạo tài khoản admin đầu tiên.
 *
 * Dùng:
 *   yarn db:seed                                      # sinh mật khẩu ngẫu nhiên, in ra một lần
 *   yarn db:seed ban@cua-ban.com                      # chỉ định email
 *   SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... yarn db:seed
 *   docker compose exec web node scripts/db-seed.mjs  # khi chạy bằng Docker
 *
 * KHÔNG có mật khẩu mặc định trong file này. Một mật khẩu mặc định trong repo là một mật khẩu
 * mà mọi bản cài đều dùng, và nó sẽ sống sót qua mọi lời nhắc "đổi ngay".
 */

import { randomBytes, scrypt as scryptCb } from 'node:crypto'
import { promisify } from 'node:util'
import { pathToFileURL } from 'node:url'
import pg from 'pg'

const scrypt = promisify(scryptCb)

/**
 * ⚠ BẢN NHÂN BẢN CÓ CHỦ Ý của `hashPassword` trong `lib/auth/password.ts`.
 *
 * Vì sao nhân bản: file kia là TypeScript, và một script `.mjs` chạy bằng `node` trần không
 * import TypeScript được. Các cách khác đều tệ hơn ở bản v1 — thêm `tsx`/`ts-node` là thêm một
 * dep chỉ để seed một hàng; `--experimental-strip-types` cần Node >= 22.6 trong khi
 * `package.json` khai `node >= 20`.
 *
 * ⚠ SỬA MỘT CHỖ LÀ PHẢI SỬA CẢ HAI. Tham số (N, r, p, keylen, độ dài salt) và định dạng chuỗi
 * `scrypt$N$r$p$salt_b64$hash_b64` phải khớp từng ký tự, nếu không tài khoản seed sẽ không đăng
 * nhập được và lỗi sẽ hiện ra dưới dạng "sai mật khẩu" — thông điệp dẫn người ta đi tìm sai chỗ.
 *
 * Việc giữ đồng bộ không dựa vào lời nhắc này: `__tests__/password.test.ts` băm bằng hàm dưới
 * đây rồi kiểm bằng `verifyPassword` của lib. Hai bên lệch tham số hay lệch định dạng thì test
 * đó đỏ ngay. Đó là lý do hàm này được `export`.
 */
const N = 2 ** 15
const R = 8
const P = 1
const KEY_LEN = 32
const SALT_LEN = 16

export async function hashPasswordStandalone(plain) {
  if (plain.length === 0) throw new Error('Mật khẩu rỗng')
  const salt = randomBytes(SALT_LEN)
  const key = await scrypt(plain, salt, KEY_LEN, { N, r: R, p: P, maxmem: 64 * 1024 * 1024 })
  return ['scrypt', N, R, P, salt.toString('base64'), key.toString('base64')].join('$')
}

// Email mặc định dùng domain `example.com` — RFC 2606 dành riêng cho tài liệu, nên nó không
// phải địa chỉ của ai cả. Đổi nó là việc đầu tiên sau khi đăng nhập được.
const DEFAULT_EMAIL = 'admin@example.com'

// 24 byte base64url ≈ 32 ký tự. Đủ để không ai đoán, và vẫn copy-paste được.
function generatePassword() {
  return randomBytes(24).toString('base64url')
}

function fail(message) {
  console.error(`\n✗ ${message}\n`)
  process.exit(1)
}

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    fail(
      'DATABASE_URL chưa được đặt.\n' +
        '  Chạy ngoài Docker: sao chép .env.example thành .env rồi điền DATABASE_URL.\n' +
        '  Chạy trong Docker: docker compose exec web node scripts/db-seed.mjs'
    )
  }

  const email = (process.argv[2] ?? process.env.SEED_ADMIN_EMAIL ?? DEFAULT_EMAIL).trim().toLowerCase()
  if (!email.includes('@')) fail(`"${email}" không giống một địa chỉ email.`)

  const givenPassword = process.argv[3] ?? process.env.SEED_ADMIN_PASSWORD
  const password = givenPassword && givenPassword.length > 0 ? givenPassword : generatePassword()
  const generated = password !== givenPassword

  if (givenPassword && givenPassword.length < 12) {
    fail('Mật khẩu ngắn hơn 12 ký tự. Đặt dài hơn, hoặc bỏ tham số để script tự sinh.')
  }

  const client = new pg.Client({ connectionString })
  try {
    await client.connect()
  } catch (error) {
    fail(
      `Không kết nối được Postgres: ${error.message}\n` +
        '  Container db đã healthy chưa?  docker compose ps'
    )
  }

  try {
    const existing = await client.query('SELECT id, is_admin FROM users WHERE email = $1', [email])
    if (existing.rowCount > 0) {
      // Không ghi đè. Một script seed âm thầm đổi mật khẩu của tài khoản đang dùng là cách
      // nhanh nhất để khoá chính mình ra ngoài.
      console.log(`\nℹ Tài khoản ${email} đã tồn tại — không thay đổi gì.`)
      console.log('  Muốn tài khoản khác: yarn db:seed email-khac@cua-ban.com')
      console.log('  Quên mật khẩu: v1 chưa có luồng đặt lại (xem docs/ROADMAP.md). Tạm thời')
      console.log('  tạo một admin mới bằng email khác rồi xoá hàng cũ.')
      return
    }

    const passwordHash = await hashPasswordStandalone(password)
    await client.query(
      `INSERT INTO users (email, password_hash, display_name, is_admin)
       VALUES ($1, $2, $3, true)`,
      [email, passwordHash, 'Admin']
    )
  } catch (error) {
    // 42P01 = undefined_table.
    if (error.code === '42P01') {
      fail(
        'Bảng `users` chưa tồn tại — schema chưa được áp.\n' +
          '  Chạy `yarn db:init` trước, rồi seed lại.'
      )
    }
    fail(`Tạo tài khoản thất bại: ${error.message}${error.code ? ` (SQLSTATE ${error.code})` : ''}`)
  } finally {
    await client.end().catch(() => {})
  }

  console.log('\n✓ Đã tạo tài khoản admin.')
  console.log(`  Email:    ${email}`)

  if (generated) {
    // In ĐÚNG MỘT LẦN. Mật khẩu này không được lưu ở đâu khác ngoài bản băm trong DB, nên
    // không có cách nào đọc lại nó sau khi cửa sổ terminal này đóng.
    console.log(`  Mật khẩu: ${password}`)
    console.log('\n  ⚠ Mật khẩu trên được sinh ngẫu nhiên và CHỈ IN MỘT LẦN. Lưu nó lại ngay,')
    console.log('    rồi đổi sau khi đăng nhập lần đầu. Không có cách nào in lại.')
    console.log('    Nó cũng đang nằm trong lịch sử terminal của bạn — xoá nếu máy này không riêng.')
  } else {
    console.log('  Mật khẩu: (giá trị bạn đã truyền vào — không in lại ở đây)')
    console.log('\n  ⚠ Mật khẩu vừa truyền qua tham số dòng lệnh hoặc biến môi trường nằm trong')
    console.log('    lịch sử shell và trong `ps`. Đổi mật khẩu sau khi đăng nhập là việc nên làm.')
  }

  console.log('\n  Đăng nhập tại PUBLIC_BASE_URL của bạn (mặc định http://localhost:3000).')
}

// Chỉ chạy khi được gọi trực tiếp. `__tests__/password.test.ts` import file này để kiểm định
// dạng hash, và việc import đó không được phép mở kết nối DB nào.
const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href

if (invokedDirectly) await main()
