import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { destroySession, getCurrentUser } from '@/lib/auth/session'
import { activateLink, deactivateLink, listLinks, publicUrl } from '@/lib/links/service'

export const dynamic = 'force-dynamic'

/**
 * Bật/tắt link bằng Server Action.
 *
 * `<form>` HTML chỉ gửi được GET và POST, nên nếu nút này gọi REST thì phải bịa ra một quy ước
 * `_method=DELETE` — Server Action bỏ hẳn nhu cầu đó. `DELETE /api/links/<id>` vẫn còn cho người
 * gọi bằng script, và cả hai đường gọi cùng `deactivateLink`.
 */
async function toggle(formData: FormData) {
  'use server'

  // Kiểm đăng nhập BÊN TRONG action, không chỉ ở page. Server Action là một endpoint POST thật:
  // ai biết id của nó vẫn gọi được mà không đi qua phép kiểm ở lúc render trang.
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  // Kiểm dạng UUID trước khi vào SQL: Postgres báo `invalid input syntax for type uuid` thành
  // một exception, và một form bị sửa tay sẽ làm trang 500 thay vì không làm gì.
  const id = z.string().uuid().safeParse(formData.get('id'))
  if (!id.success) return

  if (String(formData.get('next') ?? '') === 'on') await activateLink(id.data)
  else await deactivateLink(id.data)

  revalidatePath('/links')
}

async function logout() {
  'use server'
  await destroySession()
  redirect('/login')
}

export default async function LinksPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const links = await listLinks({ limit: 200 })

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
          <h1>Link</h1>
          <span className="muted">{links.length} link</span>
          <span style={{ flex: 1 }} />
          <a className="btn primary" href="/links/new" style={{ color: 'var(--accent-text)' }}>
            Tạo link
          </a>
        </div>

        {links.length === 0 ? (
          <div className="card empty">
            Chưa có link nào. <a href="/links/new">Tạo link đầu tiên</a>.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Slug</th>
                <th>Đích</th>
                <th style={{ textAlign: 'right' }}>Lượt</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {links.map((link) => (
                <tr key={link.id} className={link.is_active ? undefined : 'off'}>
                  <td>
                    {/* Địa chỉ công khai lấy từ PUBLIC_BASE_URL, không hard-code domain nào. */}
                    <a href={publicUrl(link.slug)} target="_blank" rel="noreferrer noopener">
                      /{link.slug}
                    </a>
                    {link.is_active ? null : <span className="badge-off">đã tắt</span>}
                    {link.title ? <span className="truncate">{link.title}</span> : null}
                  </td>
                  <td>
                    {/* `rel="noreferrer"` để đích do người dùng nhập không nhận được Referer của
                        trang quản trị, và không chạm được `window.opener`. */}
                    {link.destination ? (
                      <a
                        className="truncate"
                        href={link.destination}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        {link.destination}
                      </a>
                    ) : (
                      <span className="truncate">artifact</span>
                    )}
                  </td>
                  <td className="num">{link.visit_count}</td>
                  <td className="actions">
                    <a className="btn btn-small" href={`/api/qr/${link.slug}?format=png`} download>
                      QR
                    </a>{' '}
                    <form action={toggle}>
                      <input type="hidden" name="id" value={link.id} />
                      <input type="hidden" name="next" value={link.is_active ? 'off' : 'on'} />
                      <button type="submit" className="btn-small">
                        {link.is_active ? 'Tắt' : 'Bật'}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <p className="muted" style={{ marginTop: 18 }}>
          Tắt link không xoá nó: QR đã in vẫn trỏ về đây, và số lượt truy cập được giữ lại. Bật lại
          lúc nào cũng được.
        </p>
      </main>
    </>
  )
}
