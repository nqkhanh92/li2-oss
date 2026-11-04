import { NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticate, createSession } from '@/lib/auth/session'
import { checkLoginRate, clearLoginRate } from '@/lib/auth/rate-limit'
import { clientIp } from '@/lib/analytics/visitor'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(1).max(1024),
})

/**
 * Một thông điệp duy nhất cho mọi kiểu sai: email không có, mật khẩu sai, body sai định dạng.
 *
 * Phân biệt chúng là cho người ngoài liệt kê được email nào có tài khoản. Phần "thời gian phản
 * hồi cũng không được khác nhau" nằm ở `authenticate` trong `lib/auth/session.ts`.
 */
const LOGIN_FAILED = 'Email hoặc mật khẩu không đúng.'

export async function POST(request: Request) {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body phải là JSON.' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    // Không trả chi tiết zod ở đây: "email sai định dạng" vs "thiếu password" cũng là thông tin.
    return NextResponse.json({ error: LOGIN_FAILED }, { status: 401 })
  }

  // Hạn mức TRƯỚC khi gọi `authenticate` — `authenticate` tốn ~100ms scrypt và cố ý chạy cả khi
  // email không tồn tại, nên không chặn ở đây thì ai cũng buộc được máy chủ tính scrypt.
  const rateKey = clientIp(new Headers(request.headers), process.env.TRUSTED_PROXY === 'true') ?? 'unknown'
  const verdict = checkLoginRate(rateKey)
  if (!verdict.allowed) {
    return NextResponse.json(
      { error: 'Thử quá nhiều lần. Đợi một lát rồi thử lại.' },
      { status: 429, headers: { 'Retry-After': String(verdict.retryAfterSec) } }
    )
  }

  const userId = await authenticate(parsed.data.email, parsed.data.password)
  if (!userId) return NextResponse.json({ error: LOGIN_FAILED }, { status: 401 })

  // Xoá bộ đếm khi thành công: người gõ sai 9 lần rồi đúng lần 10 không nên bị khoá 15 phút.
  clearLoginRate(rateKey)
  await createSession(userId)

  return NextResponse.json({ ok: true })
}
