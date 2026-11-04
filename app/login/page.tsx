import { redirect } from 'next/navigation'
import { authenticate, createSession, getCurrentUser } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

/**
 * Mã lỗi → thông điệp. Cố ý KHÔNG truyền thông điệp qua query string.
 *
 * Nếu nhận chuỗi tự do rồi in ra, bất kỳ ai cũng dựng được một URL `/login?error=<chữ-của-họ>`
 * trông như thông báo chính thức của hệ thống — đường vào cho phishing. Chỉ nhận mã từ danh
 * sách đóng này.
 */
const ERRORS: Record<string, string> = {
  invalid: 'Email hoặc mật khẩu không đúng.',
  missing: 'Nhập cả email và mật khẩu.',
}

/**
 * Đăng nhập bằng Server Action, không phải `fetch` từ client.
 *
 * Vì sao: form này chạy khi JavaScript tắt và không cần một dòng state nào ở client.
 * `POST /api/auth/login` vẫn tồn tại cho người gọi bằng script — cả hai đi qua `authenticate`,
 * không có nhánh xác thực thứ hai.
 */
async function login(formData: FormData) {
  'use server'

  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) redirect('/login?error=missing')

  const userId = await authenticate(email, password)
  if (!userId) redirect('/login?error=invalid')

  await createSession(userId)
  redirect('/links')
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  // Đã đăng nhập thì không có lý do gì để thấy form này.
  if (await getCurrentUser()) redirect('/links')

  const { error } = await searchParams
  const message = error ? ERRORS[error] : undefined

  return (
    <main className="page">
      <div className="card card-narrow">
        <h1>Đăng nhập</h1>
        <p className="muted" style={{ marginTop: 6, marginBottom: 20 }}>
          Tài khoản do người vận hành instance này tạo.
        </p>

        {message ? (
          <p className="alert" role="alert">
            {message}
          </p>
        ) : null}

        <form action={login}>
          <label className="field">
            <span>Email</span>
            <input type="email" name="email" autoComplete="username" required autoFocus />
          </label>

          <label className="field">
            <span>Mật khẩu</span>
            <input type="password" name="password" autoComplete="current-password" required />
          </label>

          <button type="submit" className="primary" style={{ width: '100%', marginTop: 6 }}>
            Đăng nhập
          </button>
        </form>
      </div>
    </main>
  )
}
