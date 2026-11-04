import { redirect } from 'next/navigation'
import { Link2 } from 'lucide-react'

import { getCurrentUser } from '@/lib/auth/session'
import { Card, CardContent } from '@/components/ui/card'
import { LoginForm } from '@/components/auth/login-form'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Đăng nhập — li2-oss' }

/**
 * Trang đăng nhập. Server Component mỏng: chỉ chặn người đã đăng nhập và dựng khung;
 * phần nhập liệu và hiển thị lỗi nằm ở `components/auth/login-form.tsx`.
 *
 * KHÔNG còn đọc `?error=` từ query string như bản trước. Lỗi giờ đến từ phản hồi của
 * `POST /api/auth/login`, nên không có đường nào cho người ngoài dựng một URL
 * `/login?error=<chữ-của-họ>` trông như thông báo chính thức — cổng phishing đó đóng hẳn
 * thay vì phải canh bằng một danh sách mã lỗi đóng.
 */
export default async function LoginPage() {
  if (await getCurrentUser()) redirect('/links')

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-primary text-primary-foreground">
            <Link2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">li2-oss</h1>
            <p className="mt-1 text-s text-slate-500">Short link, QR và artifact — tự host.</p>
          </div>
        </div>

        <Card>
          <CardContent className="p-6 pt-6">
            <LoginForm />
          </CardContent>
        </Card>

        <p className="mt-5 text-center text-xs text-slate-500">
          Tài khoản do người vận hành instance này tạo. Không có đăng ký tự do.
        </p>
      </div>
    </main>
  )
}
