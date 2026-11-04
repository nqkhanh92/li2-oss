import { NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticate, createSession } from '@/lib/auth/session'

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

  const userId = await authenticate(parsed.data.email, parsed.data.password)
  if (!userId) return NextResponse.json({ error: LOGIN_FAILED }, { status: 401 })

  await createSession(userId)

  return NextResponse.json({ ok: true })
}
