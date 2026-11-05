import 'server-only'
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { query, queryOne } from '@/lib/db'
import { verifyPassword } from '@/lib/auth/password'

/**
 * Phiên đăng nhập bằng cookie + bảng `sessions`.
 *
 * Vì sao không phải JWT: JWT không thu hồi được. Đăng xuất một JWT nghĩa là chờ nó hết hạn, hoặc
 * nuôi một danh sách thu hồi — tức là vẫn cần bảng DB, chỉ thêm một lớp ký. Bảng `sessions` là
 * lớp đó mà không cần ký gì: `DELETE` một hàng là phiên chết ngay.
 *
 * Vì sao không phải Casdoor (bản thương mại dùng): hai tài khoản trùng email ở đó gây vòng lặp
 * redirect, và nó mang theo `CASDOOR_MASTER_PASSWORD`. ADR-001 đã chốt bỏ.
 */

const COOKIE_NAME = 'li2_session'
const TTL_DAYS = 30
const TTL_MS = TTL_DAYS * 24 * 60 * 60 * 1000
const TOKEN_BYTES = 32

export type CurrentUser = {
  id: string
  email: string
  display_name: string | null
  is_admin: boolean
}

/**
 * Băm token phiên bằng SHA-256 một vòng — và đó là ĐÚNG ở đây, khác với mật khẩu.
 *
 * Mật khẩu có entropy thấp (người đặt), nên cần một hàm dẫn khoá có chi phí (scrypt, xem
 * `lib/auth/password.ts`). Token phiên là 32 byte từ CSPRNG = 256 bit entropy; không có từ điển
 * nào để dò, nên thêm chi phí scrypt chỉ làm mỗi request chậm 100ms mà không tăng an toàn.
 *
 * Điều cần ở đây là: giá trị nằm trong DB không dùng lại được để mạo danh. SHA-256 cho đúng điều đó.
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * So hai chuỗi hex bí mật trong thời gian không phụ thuộc nội dung.
 *
 * Ghi thẳng cho người đọc sau: lớp phòng vệ CHÍNH ở đây là token được băm TRƯỚC khi đi vào SQL,
 * nên bí mật thô không bao giờ tới DB và không có phép so nào trên nó. Hàm này là lớp thứ hai,
 * dùng ở `getCurrentUser` để đối chiếu hash tính từ cookie với hash lấy từ hàng — nó bắt được
 * trường hợp câu truy vấn bị sửa thành khớp lỏng (vd `LIKE`, hay quên điều kiện) trong tương lai.
 */
export function timingSafeEqualHex(a: string, b: string): boolean {
  // Hai chuỗi hex đúng định dạng và cùng độ dài thì cùng độ dài byte. Lệch độ dài không phải
  // bí mật (ai cũng biết hash SHA-256 dài 64 ký tự), nên thoát sớm ở đây không rò gì.
  if (a.length !== b.length || a.length === 0) return false
  const ba = Buffer.from(a, 'hex')
  const bb = Buffer.from(b, 'hex')
  // `Buffer.from(_, 'hex')` cắt im lặng ở ký tự không hợp lệ, nên phải kiểm lại độ dài byte:
  // không kiểm thì 'zz' và 'yy' đều ra buffer rỗng và timingSafeEqual coi là bằng nhau.
  if (ba.length !== bb.length || ba.length === 0) return false
  return timingSafeEqual(ba, bb)
}

/** Token thô để đặt vào cookie. Tách riêng để test được mà không cần DB. */
export function generateSessionToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url')
}

/**
 * Cookie phiên có nên gắn cờ `Secure` không.
 *
 * Mặc định: **có** ở production. Nhưng `COOKIE_SECURE=false` tắt được, và đây là một ca dùng
 * thật chứ không phải cửa sau:
 *
 * Một instance tự host rất hay chạy **HTTP trên mạng riêng** — LAN, Tailscale, WireGuard. Ở đó
 * cờ `Secure` làm trình duyệt **vứt cookie**, và triệu chứng là *"đăng nhập trả 200 nhưng vẫn
 * thấy trang login"* — gần như không ai đoán ra nguyên nhân. (Trên `localhost` thì vẫn chạy, vì
 * trình duyệt coi localhost là origin tin cậy — nên lỗi chỉ hiện khi mở từ máy khác, đúng lúc
 * người ta tưởng đã cài xong.)
 *
 * ⚠ Tắt `Secure` nghĩa là cookie phiên đi qua mạng dưới dạng không mã hoá. Chỉ làm vậy trên mạng
 * bạn tin. Đường đúng vẫn là đặt HTTPS trước app (Caddy, nginx, hay `tailscale serve`).
 */
function cookieSecure(): boolean {
  if (process.env.COOKIE_SECURE === 'false') return false
  if (process.env.COOKIE_SECURE === 'true') return true
  return process.env.NODE_ENV === 'production'
}

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: cookieSecure(),
    path: '/',
    expires: expiresAt,
  }
}

/**
 * Tạo phiên: lưu HASH vào DB, đặt token THÔ vào cookie.
 *
 * Phải gọi từ route handler hoặc server action — `cookies().set()` không chạy được trong Server
 * Component (Next không cho sửa header sau khi đã bắt đầu render).
 */
export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = generateSessionToken()
  const expiresAt = new Date(Date.now() + TTL_MS)

  await query(
    `INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)`,
    [hashToken(token), userId, expiresAt.toISOString()]
  )

  // Dọn phiên đã hết hạn của chính người này. Làm ở đây thay vì cron: mỗi lần đăng nhập là một
  // lần dọn, nên bảng không phình mà không cần thêm hạ tầng lịch biểu nào.
  await query(`DELETE FROM sessions WHERE user_id = $1 AND expires_at <= now()`, [userId])

  const jar = await cookies()
  jar.set(COOKIE_NAME, token, sessionCookieOptions(expiresAt))

  return { token, expiresAt }
}

/**
 * Người đang đăng nhập, hoặc `null`.
 *
 * ⚠ Hàm này được import ở nơi khác (vd `app/api/artifacts/route.ts`). Giữ nguyên tên và hình
 * dạng trả về `{ id, email, display_name, is_admin } | null`.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const jar = await cookies()
  const token = jar.get(COOKIE_NAME)?.value
  if (!token) return null

  const expected = hashToken(token)

  const row = await queryOne<CurrentUser & { token_hash: string }>(
    `SELECT u.id, u.email, u.display_name, u.is_admin, s.token_hash
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1
        AND s.expires_at > now()`,
    [expected]
  )
  if (!row) return null

  // Lớp phòng vệ thứ hai, xem comment ở `timingSafeEqualHex`.
  if (!timingSafeEqualHex(row.token_hash, expected)) return null

  return {
    id: row.id,
    email: row.email,
    display_name: row.display_name,
    is_admin: row.is_admin,
  }
}

/** Xoá hàng `sessions` theo hash rồi xoá cookie. Thiếu một trong hai là đăng xuất không trọn. */
export async function destroySession(): Promise<void> {
  const jar = await cookies()
  const token = jar.get(COOKIE_NAME)?.value

  if (token) {
    await query(`DELETE FROM sessions WHERE token_hash = $1`, [hashToken(token)])
  }

  jar.delete(COOKIE_NAME)
}

// ───────────────────────────────────────────────────────────────── xác thực mật khẩu

/**
 * Một hash scrypt hợp lệ nhưng không thuộc về ai, sinh lúc nạp module.
 *
 * Vì sao cần: nếu email không tồn tại mà ta trả lời ngay, thời gian phản hồi của "email sai" sẽ
 * ngắn hơn "mật khẩu sai" khoảng 100ms (chi phí scrypt). Chênh đó đủ để người ngoài liệt kê được
 * email nào có tài khoản — tức là trả cùng một thông điệp lỗi vẫn vô ích.
 *
 * Cùng N/r/p với `lib/auth/password.ts` nên chi phí tính toán bằng đúng trường hợp thật.
 */
const FAKE_PASSWORD_HASH = [
  'scrypt',
  2 ** 15,
  8,
  1,
  randomBytes(16).toString('base64'),
  randomBytes(32).toString('base64'),
].join('$')

/**
 * Kiểm email + mật khẩu. Trả `userId` hoặc `null`.
 *
 * ⚠ Đây là đường xác thực DUY NHẤT. Cả Server Action ở `app/login/page.tsx` và
 * `POST /api/auth/login` đều gọi hàm này. Lý do không copy logic sang hai chỗ: hai bản copy của
 * một phép kiểm mật khẩu sẽ lệch nhau ở lần sửa thứ hai, và bản bị quên là bản còn lỗ.
 *
 * KHÔNG phân biệt "không có email" với "sai mật khẩu" ở giá trị trả về — người gọi không có cách
 * nào vô tình rò ra sự khác biệt đó.
 */
export async function authenticate(email: string, password: string): Promise<string | null> {
  // `lower(email)` nên không dùng index UNIQUE trên `email` — chấp nhận được vì bản single-tenant
  // có vài hàng `users`. Đổi lại: tài khoản seed bằng "Admin@..." vẫn đăng nhập được, thay vì gặp
  // "sai mật khẩu" mà không hiểu vì sao.
  const user = await queryOne<{ id: string; password_hash: string }>(
    `SELECT id, password_hash FROM users WHERE lower(email) = lower($1)`,
    [email]
  )

  const okPassword = await verifyPassword(password, user?.password_hash ?? FAKE_PASSWORD_HASH)

  if (!user || !okPassword) return null
  return user.id
}

export const SESSION_COOKIE_NAME = COOKIE_NAME
export const SESSION_TTL_DAYS = TTL_DAYS
export { hashToken as hashSessionToken }
