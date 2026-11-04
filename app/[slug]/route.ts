import { NextRequest, NextResponse } from 'next/server'
import { queryOne, dbPool } from '@/lib/db'
import { checkDestination } from '@/lib/links/destination'
import { clientIp, visitorHash } from '@/lib/analytics/visitor'
import { GET as serveArtifact } from '@/app/a/[slug]/route'

/**
 * Đường giải short link. `GET /<slug>` → 302 tới `destination`, hoặc phục vụ artifact.
 *
 * ★ Đây là file thay thế TOÀN BỘ một service Go 188 file.
 *
 * Trong bản thương mại, redirect chỉ tồn tại ở `li2-be` (Go): `li2-app` không có route nào giải
 * short link — đo bằng `git ls-files 'src/app' | grep '\[slug\]'`, chỉ ra đúng một route serve
 * artifact. Hệ quả là `li2-be` thành hạ tầng bắt buộc, và nó mang theo: 12 UUID khách hàng
 * hard-code, mật khẩu bản rõ trong cookie, bot detection là một dòng `strings.Contains(ua,
 * "axios")`, 3 test trên 188 file, và một `panic` lúc đọc config làm bản clone không boot được.
 *
 * Không có gì trong việc giải một short link cần một service riêng. 70 dòng này làm đủ.
 */

// Luôn chạy động: có ghi DB, và kết quả phụ thuộc hàng `links` lúc gọi.
export const dynamic = 'force-dynamic'

type LinkRow = {
  id: string
  kind: 'redirect' | 'artifact'
  destination: string | null
  is_active: boolean
  password_hash: string | null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  // Chuẩn hoá trước khi tra: slug trong DB luôn chữ thường (CHECK constraint ở schema.sql).
  const normalized = slug.toLowerCase()

  const link = await queryOne<LinkRow>(
    `SELECT id, kind, destination, is_active, password_hash
       FROM links WHERE slug = $1`,
    [normalized]
  )

  // Không tìm thấy VÀ bị tắt trả về cùng một 404. Phân biệt hai trường hợp là cho người ngoài
  // dò được slug nào đã từng tồn tại.
  if (!link || !link.is_active) {
    return new NextResponse('Not found', { status: 404 })
  }

  if (link.password_hash) {
    // v1 chưa có trang nhập mật khẩu; chặn thay vì để lọt. Xem docs/ROADMAP.md.
    return new NextResponse('Link này cần mật khẩu. Tính năng chưa có trong v1.', { status: 401 })
  }

  if (link.kind === 'artifact') {
    // Uỷ quyền cho handler artifact bằng cách GỌI HÀM, không rewrite.
    //
    // ⚠ Bản đầu dùng `NextResponse.rewrite(new URL('/a/...'))` và nó trả 500 lúc chạy thật:
    // *"NextResponse.rewrite() was used in a app route handler, this is not currently supported"*.
    // Rewrite chỉ dùng được trong `middleware.ts`, và middleware thì không tra DB được (pg không
    // chạy trên edge runtime) nên không biết slug này là artifact hay redirect.
    //
    // Route handler là một hàm async thường, nên gọi nó trực tiếp vừa đúng vừa rẻ hơn rewrite:
    // một vòng request, và địa chỉ trên thanh URL vẫn là `/<slug>` như hợp đồng công khai.
    //
    // Lỗi này KHÔNG bị `yarn test` hay `yarn build` bắt — chỉ hiện khi mở một artifact thật.
    return serveArtifact(request, { params: Promise.resolve({ slug: normalized }) })
  }

  if (!link.destination) {
    return new NextResponse('Link hỏng: thiếu URL đích', { status: 500 })
  }

  // Kiểm LẠI lúc redirect, không chỉ lúc lưu. Hàng trong DB có thể đã được sửa bằng psql,
  // bằng một migration, hay bằng một bug ở đường ghi. Guard ở đường đọc là guard cuối.
  const checked = checkDestination(link.destination)
  if (!checked.ok) {
    return new NextResponse('Link hỏng: URL đích không hợp lệ', { status: 500 })
  }

  void recordVisit(link.id, request)

  return NextResponse.redirect(checked.normalized, 302)
}

/**
 * Ghi lượt truy cập. Cố ý KHÔNG `await` ở đường redirect — người dùng không nên chờ một lần ghi
 * analytics. Lỗi được bắt và bỏ qua: mất một dòng thống kê còn hơn mất một lần redirect.
 */
async function recordVisit(linkId: string, request: NextRequest) {
  try {
    const trustProxy = process.env.TRUSTED_PROXY === 'true'
    const secret = process.env.SESSION_SECRET ?? ''
    const ip = clientIp(request.headers, trustProxy)
    const country = request.headers.get('cf-ipcountry')

    await dbPool().query('SELECT record_visit($1, $2, $3, $4, $5)', [
      linkId,
      visitorHash(ip, secret),
      request.headers.get('user-agent')?.slice(0, 512) ?? null,
      request.headers.get('referer')?.slice(0, 512) ?? null,
      country && /^[A-Z]{2}$/.test(country) ? country : null,
    ])
  } catch {
    // Im lặng theo chủ ý. Nếu cần biết, bật log ở lớp ngoài — không để một lỗi analytics
    // làm 500 một redirect đang hoạt động.
  }
}
