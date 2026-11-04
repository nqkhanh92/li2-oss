import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { destroySession, getCurrentUser } from '@/lib/auth/session'
import { createLink } from '@/lib/links/service'

export const dynamic = 'force-dynamic'

/**
 * Mã lỗi → thông điệp, cùng lý do như ở `app/login/page.tsx`: không in chuỗi tự do lấy từ URL.
 *
 * Hệ quả phải chấp nhận: lỗi của `checkDestination` và lỗi "slug đã có người dùng" đều gộp về
 * một trong hai mã dưới đây, nên người dùng không thấy đúng câu mà service trả về. Đổi lại là
 * không có đường in chữ của người ngoài lên trang quản trị. Khi cần chi tiết hơn thì thêm mã,
 * đừng mở lại cổng cho chuỗi tự do.
 */
const ERRORS: Record<string, string> = {
  slug: 'Slug không hợp lệ hoặc đã có người dùng. Chỉ chữ thường, số, `_`, `-`; ' +
    'bắt đầu bằng chữ hoặc số.',
  destination: 'URL đích không hợp lệ. Cần http:// hoặc https:// và một hostname.',
}

async function create(formData: FormData) {
  'use server'

  // Server Action là một endpoint POST thật — kiểm đăng nhập ở đây, không chỉ ở lúc render.
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const result = await createLink({
    slug: String(formData.get('slug') ?? ''),
    destination: String(formData.get('destination') ?? ''),
    title: String(formData.get('title') ?? ''),
    createdBy: user.id,
  })

  if (!result.ok) {
    // Phân loại thô theo nội dung lỗi của service. Đủ để người dùng biết sửa ô nào.
    redirect(`/links/new?error=${result.error.includes('Slug') ? 'slug' : 'destination'}`)
  }

  revalidatePath('/links')
  redirect('/links')
}

async function logout() {
  'use server'
  await destroySession()
  redirect('/login')
}

export default async function NewLinkPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { error } = await searchParams
  const message = error ? ERRORS[error] : undefined

  return (
    <>
      <header className="topbar">
        <a className="brand" href="/links">
          li2-oss
        </a>
        <span className="spacer" />
        <span className="muted">{user.display_name || user.email}</span>
        <form action={logout}>
          <button type="submit" className="btn-small">
            Đăng xuất
          </button>
        </form>
      </header>

      <main className="page">
        <div className="page-head">
          <h1>Tạo link</h1>
          <span style={{ flex: 1 }} />
          <a className="btn btn-small" href="/links">
            Huỷ
          </a>
        </div>

        {message ? (
          <p className="alert" role="alert">
            {message}
          </p>
        ) : null}

        <div className="card" style={{ maxWidth: 560 }}>
          <form action={create}>
            <label className="field">
              <span>URL đích</span>
              {/* `type="url"` để trình duyệt bắt lỗi rõ ràng trước khi gửi. Phép kiểm thật vẫn ở
                  server (`checkDestination`) — validation của trình duyệt là tiện lợi, không phải
                  kiểm soát. */}
              <input
                type="url"
                name="destination"
                placeholder="https://example.com/trang-dich"
                required
                autoFocus
              />
            </label>

            <label className="field">
              <span>Slug (không bắt buộc)</span>
              <input
                type="text"
                name="slug"
                maxLength={64}
                pattern="[A-Za-z0-9][A-Za-z0-9_\-]*"
                placeholder="để trống để sinh tự động"
              />
              <p className="hint">
                Để trống thì hệ thống sinh 7 ký tự. Slug không sửa được sau khi tạo — đổi nó là làm
                mọi QR đã in trỏ vào hư không.
              </p>
            </label>

            <label className="field">
              <span>Tiêu đề (không bắt buộc)</span>
              <input type="text" name="title" maxLength={200} placeholder="để nhận ra trong bảng" />
            </label>

            <button type="submit" className="primary" style={{ marginTop: 6 }}>
              Tạo link
            </button>
          </form>
        </div>
      </main>
    </>
  )
}
