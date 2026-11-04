import { NextRequest, NextResponse } from 'next/server'
import { Readable } from 'node:stream'
import { queryOne, dbPool } from '@/lib/db'
import { clientIp, visitorHash } from '@/lib/analytics/visitor'
import { isActiveContent } from '@/lib/artifacts/mime'
import { openArtifactFile } from '@/lib/artifacts/storage'

/**
 * Phục vụ artifact công khai: `GET /a/<slug>`.
 *
 * Người dùng thường không gõ địa chỉ này — `app/[slug]/route.ts` rewrite nội bộ sang đây khi
 * `links.kind = 'artifact'`, nên thanh địa chỉ vẫn là `/<slug>`. Route vẫn để công khai vì rewrite
 * của Next yêu cầu một route thật nhận được request.
 *
 * Lượt xem được ghi Ở ĐÂY, không ở `/<slug>`: nhánh artifact của route kia `return` trước khi gọi
 * `recordVisit`. Đếm ở cả hai chỗ sẽ thành đếm đôi.
 */

// Có đọc đĩa và ghi DB, và kết quả phụ thuộc hàng `links`/`artifacts` lúc gọi.
export const dynamic = 'force-dynamic'
// `fs` và stream của Node — không chạy được trên edge runtime.
export const runtime = 'nodejs'

type ArtifactRow = {
  link_id: string
  is_active: boolean
  status: 'draft' | 'live' | 'removed'
  storage_path: string
  original_name: string
  mime_type: string
  expires_at: string | null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const normalized = slug.toLowerCase()

  const row = await queryOne<ArtifactRow>(
    `SELECT l.id AS link_id, l.is_active,
            a.status, a.storage_path, a.original_name, a.mime_type, a.expires_at
       FROM links l
       JOIN artifacts a ON a.link_id = l.id
      WHERE l.slug = $1`,
    [normalized]
  )

  // Không tồn tại, link bị tắt, và artifact chưa xuất bản đều trả cùng một 404 — phân biệt ba
  // trường hợp là cho người ngoài dò được slug nào đã từng tồn tại.
  if (!row || !row.is_active || row.status !== 'live') {
    return new NextResponse('Not found', { status: 404, headers: { 'cache-control': 'no-store' } })
  }

  // Quá hạn trả 410 chứ không 404: ở đây tiết lộ "từng có" là CHỦ Ý. Người quét một QR đã in trên
  // tờ rơi cần biết nội dung đã hết hạn, không phải tưởng mình quét sai.
  if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) {
    return new NextResponse('Nội dung này đã hết hạn.', {
      status: 410,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
    })
  }

  let opened
  try {
    opened = await openArtifactFile(row.storage_path)
  } catch {
    // Hàng DB còn nhưng tệp mất (volume bị xoá, hay `storage_path` bị sửa tay ra ngoài
    // STORAGE_DIR). Không để lộ lý do nào trong hai lý do đó.
    return new NextResponse('Not found', { status: 404, headers: { 'cache-control': 'no-store' } })
  }

  void recordVisit(row.link_id, request)

  return new NextResponse(Readable.toWeb(opened.stream) as ReadableStream, {
    status: 200,
    headers: serveHeaders(row.mime_type, row.original_name, opened.sizeBytes),
  })
}

/**
 * CSP cho nội dung "sống" (HTML, SVG) do người dùng tải lên.
 *
 * Không có header này thì mỗi tệp HTML tải lên là một lần XSS lưu trữ **trên chính domain của
 * instance** — script trong đó đọc được cookie phiên và gọi được mọi API bằng quyền của người đang
 * đăng nhập. Đây là rủi ro cố hữu của việc cho tải HTML lên, không phải một bug có thể vá chỗ khác.
 *
 * Từng chỉ thị làm gì:
 *
 * - `sandbox allow-scripts` — không có `allow-same-origin`, nên document chạy trong một origin mờ,
 *   KHÁC origin của instance. Script trong đó không với tới cookie, localStorage hay API của ta.
 *   `allow-scripts` + thiếu `allow-same-origin` là cặp đúng: bỏ `allow-same-origin` mới là phần
 *   bảo vệ, `allow-scripts` chỉ để artifact tương tác được.
 * - `default-src 'none'` + chỉ mở `data:` cho ảnh/font/style — **không có nguồn mạng nào**. Nghĩa
 *   là script bên trong không `fetch` ra ngoài được, nên dù có chạy cũng không rò dữ liệu đi đâu.
 *   Giá phải trả: artifact không nhúng được tài nguyên từ CDN. Đó là đánh đổi có ý thức.
 * - `base-uri 'none'`, `form-action 'none'` — chặn đổi gốc URL tương đối và chặn gửi form đi.
 */
const SANDBOX_CSP = [
  'sandbox allow-scripts',
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  'img-src data:',
  'font-src data:',
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ')

function serveHeaders(mime: string, originalName: string, sizeBytes: number): Headers {
  const headers = new Headers({
    'content-type': contentTypeFor(mime),
    'content-length': String(sizeBytes),
    // nosniff là bắt buộc ở MỌI loại, không chỉ HTML: không có nó, một tệp `.txt` chứa thẻ HTML
    // vẫn bị một số trình duyệt đoán lại thành `text/html` và render.
    'x-content-type-options': 'nosniff',
    'content-disposition': inlineDisposition(originalName),
    'referrer-policy': 'no-referrer',
    // Nội dung đổi được bằng cách xuất bản lại trên cùng slug, nên không cache lâu ở lớp chung.
    'cache-control': 'public, max-age=0, must-revalidate',
  })

  if (isActiveContent(mime)) {
    headers.set('content-security-policy', SANDBOX_CSP)
    // Cho trình duyệt cũ chưa đọc `frame-ancestors`.
    headers.set('x-frame-options', 'DENY')
  }

  return headers
}

function contentTypeFor(mime: string): string {
  // Văn bản không khai charset thì trình duyệt tự đoán, và đoán sai là tiếng Việt thành ký tự lạ.
  return mime.startsWith('text/') || mime === 'image/svg+xml' ? `${mime}; charset=utf-8` : mime
}

/**
 * `Content-Disposition: inline` kèm tên tệp để người dùng lưu về đúng tên gốc.
 *
 * Tên đi qua `encodeURIComponent` trong tham số `filename*` (RFC 5987) thay vì nhét thẳng vào
 * `filename="..."`: tên gốc có thể chứa dấu nháy kép hay ký tự ngoài ASCII (tiếng Việt), và cả hai
 * đều làm header sai cú pháp.
 */
function inlineDisposition(originalName: string): string {
  return `inline; filename*=UTF-8''${encodeURIComponent(originalName)}`
}

/**
 * Ghi lượt xem. KHÔNG `await` ở đường phục vụ — cùng lý do như `app/[slug]/route.ts`: người quét QR
 * không nên chờ một lần ghi analytics, và mất một dòng thống kê còn hơn mất một lần xem.
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
    // Im lặng theo chủ ý.
  }
}
