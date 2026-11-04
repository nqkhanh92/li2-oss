import { NextRequest, NextResponse } from 'next/server'
import { queryOne } from '@/lib/db'
import { parseQrFormat, publicLinkUrl, qrPng, qrSvg } from '@/lib/qr/generate'

/**
 * `GET /api/qr/<slug>?format=png|svg&width=512&margin=2&dark=%23000000&light=%23ffffff`
 *
 * Nội dung QR là `${PUBLIC_BASE_URL}/<slug>` — xem `publicLinkUrl`. Không hard-code domain nào ở
 * đây: một mặc định trỏ tới domain của người khác sẽ sinh ra QR in sẵn trỏ sai chỗ, và QR đã in thì
 * không sửa được.
 *
 * Route này KHÔNG yêu cầu đăng nhập, có chủ ý: nó chỉ mã hoá một địa chỉ công khai mà ai cũng đã
 * biết, và trang công khai của link cần nhúng được ảnh QR. Nhưng nó chỉ trả QR cho slug **đã tồn
 * tại** — nếu không, đây thành máy sinh ảnh miễn phí cho bất kỳ chuỗi nào.
 */

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const normalized = slug.toLowerCase()

  const link = await queryOne<{ id: string }>('SELECT id FROM links WHERE slug = $1', [normalized])
  if (!link) {
    return new NextResponse('Not found', { status: 404, headers: { 'cache-control': 'no-store' } })
  }

  // Link bị tắt vẫn có QR: QR đã in trên vật thật không gỡ về được, và người vận hành cần tải lại
  // đúng cái mã đó để đối chiếu. Việc link tắt được xử ở `/<slug>` (trả 404).

  const url = request.nextUrl
  const user = {
    width: numberParam(url.searchParams.get('width')),
    margin: numberParam(url.searchParams.get('margin')),
    dark: url.searchParams.get('dark') ?? undefined,
    light: url.searchParams.get('light') ?? undefined,
  }

  let target: string
  try {
    target = publicLinkUrl(normalized)
  } catch {
    // PUBLIC_BASE_URL chưa đặt. Đây là lỗi cấu hình của người vận hành, không phải của người gọi.
    return new NextResponse('PUBLIC_BASE_URL chưa được cấu hình trên instance này.', {
      status: 500,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  }

  const format = parseQrFormat(url.searchParams.get('format'))
  const filename = `qr-${normalized}.${format}`

  if (format === 'svg') {
    const svg = await qrSvg(target, user)
    return new NextResponse(svg, { status: 200, headers: qrHeaders('image/svg+xml', filename) })
  }

  const png = await qrPng(target, user)
  return new NextResponse(new Uint8Array(png), {
    status: 200,
    headers: qrHeaders('image/png', filename),
  })
}

/** `null` khi tham số thiếu hoặc không phải số — `resolveQrOptions` sẽ dùng mặc định máy chủ. */
function numberParam(raw: string | null): number | undefined {
  if (!raw) return undefined
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) ? parsed : undefined
}

function qrHeaders(mime: string, filename: string): Headers {
  return new Headers({
    'content-type': mime === 'image/svg+xml' ? `${mime}; charset=utf-8` : mime,
    // SVG do CHÚNG TA sinh (không phải do người dùng tải lên) nên nội dung đã biết trước, không cần
    // CSP sandbox như `/a/<slug>`. Vẫn giữ nosniff vì nó không mất gì.
    'x-content-type-options': 'nosniff',
    'content-disposition': `inline; filename="${filename}"`,
    // QR của một slug là hàm thuần của slug + tham số, nên cache được lâu.
    'cache-control': 'public, max-age=86400',
  })
}
