import { NextRequest, NextResponse } from 'next/server'

type NextRouteContext = { params: Record<string, string | string[]> }
type HandlerCtx<P> = { params: P; context?: any } // context optional so you can reuse with/without auth
type RouteHandler<P> = (req: NextRequest, ctx: HandlerCtx<P>) => Promise<NextResponse>

export const withCors = <P>(handler: RouteHandler<P>) => {
  return async (req: NextRequest, ctx: HandlerCtx<P>) => {
    // Handle preflight EARLY (no auth!)
    if (req.method === 'OPTIONS') {
      const res = new NextResponse(null, { status: 204 })
      return applyCorsHeaders(res, req.headers.get('origin'))
    }

    // Run actual handler
    const res = await handler(req, ctx)
    return applyCorsHeaders(res, req.headers.get('origin'))
  }
}

// Bản self-host chỉ cho `localhost` sẵn. Tên miền của bạn khai bằng `CORS_EXTRA_BASE_DOMAINS`
// (xem chú thích ngay dưới) — allowlist này có `Allow-Credentials: true`, nên mỗi mục là một
// tên miền được phép đọc dữ liệu đã đăng nhập.
const ALLOWED_BASE_DOMAINS = ['localhost']

/**
 * Tên miền cho phép **thêm**, đọc từ env, phân tách bằng dấu phẩy.
 *
 * Vì sao là env chứ không viết thẳng vào mảng trên: bản self-host chạy dưới một tên miền khác
 * khác với máy lập trình, và trang quản trị của nó không gọi được API nào qua trình duyệt nếu
 * origin đó không nằm trong allowlist — nghĩa là **không nghiệm thu được ở staging**, chỉ còn cách
 * thử thẳng trên prod.
 *
 * Nhưng viết thẳng tên miền vào mảng cứng là nới allowlist cho **mọi** bản cài, kể cả nơi tên
 * miền đó không dùng tới. Env thì mỗi môi trường tự khai phần của mình.
 *
 * Để trống là hành vi mặc định. Đây là allowlist có `Allow-Credentials: true`, nên mỗi mục thêm
 * vào là một tên miền được phép đọc dữ liệu đã đăng nhập — chỉ khai tên miền mình thật sự sở hữu.
 */
const extraBaseDomains = () =>
  (process.env.CORS_EXTRA_BASE_DOMAINS ?? '')
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean)
const ALLOWED_METHODS = 'GET,POST,PUT,DELETE,OPTIONS'
const ALLOWED_HEADERS =
  'Content-Type, Authorization, anon-id, X-Requested-With, Accept, Origin, Referer, User-Agent, x-api-key, x-forwarded-for, x-forwarded-host, host'

export function isAllowedOrigin(origin: string | null) {
  if (!origin) return false
  try {
    const url = new URL(origin)
    /**
     * So khớp trên `hostname` đã chuẩn hoá chữ thường, và phải là `h === d` hoặc kết thúc bằng
     * `.d` — KHÔNG dùng `includes`. `h.includes('li2.ai')` sẽ nhận cả `li2.ai.ke-gian.com`.
     */
    const h = url.hostname.toLowerCase()
    return [...ALLOWED_BASE_DOMAINS, ...extraBaseDomains()].some(
      (d) => h === d || h.endsWith(`.${d}`)
    )
  } catch {
    return false
  }
}

export function applyCorsHeaders(res: NextResponse, origin: string | null) {
  // Always set these
  res.headers.set('Access-Control-Allow-Methods', ALLOWED_METHODS)
  res.headers.set('Access-Control-Allow-Headers', ALLOWED_HEADERS)
  res.headers.set('Access-Control-Max-Age', '86400') // Cache preflight for 24 hours

  if (isAllowedOrigin(origin)) {
    res.headers.set('Access-Control-Allow-Origin', origin!) // echo the exact origin
    res.headers.set('Access-Control-Allow-Credentials', 'true')
    res.headers.set('Vary', 'Origin')
  } else {
    console.log(`CORS: Rejected origin: ${origin}`)
  }
  return res
}
