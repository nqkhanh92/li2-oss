import { NextResponse } from 'next/server'
import { destroySession } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

/**
 * Chỉ POST, không GET. Đăng xuất bằng GET nghĩa là một `<img src="/api/auth/logout">` trên trang
 * bất kỳ đủ để đăng xuất người đang đọc — vô hại nhưng vẫn là CSRF.
 *
 * `destroySession` xoá cả hàng DB và cookie, nên nó an toàn khi gọi lại: không có phiên thì
 * không làm gì và vẫn trả 200.
 */
export async function POST() {
  await destroySession()
  return NextResponse.json({ ok: true })
}
