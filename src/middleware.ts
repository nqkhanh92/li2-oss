import { NextRequest, NextResponse } from 'next/server'
import { casdoor_middleware } from './shared/lib/casdoor/middleware'

/**
 * Host artifact (`ARTIFACT_LINK_URL`, vd `artifact.li2.link`) là mặt công khai của artifact, không
 * phải app: không đăng nhập, không trang quản trị. Trên host đó chỉ hai hình dạng URL được phục vụ:
 *  - `/<org_slug>/<slug>` → rewrite sang `/a/s/<org_slug>/<slug>` (URL trên thanh địa chỉ giữ nguyên);
 *  - `/a/*` → đi thẳng (form mật khẩu, `/file`, `/download`, `/google`) — matcher bên dưới đã loại
 *    nên middleware không chạy cho chúng.
 * Mọi đường khác trên host artifact → 404 có theme (rewrite sang `/a/not-found`), không rơi vào
 * casdoor_middleware (sẽ redirect sang login của app, lộ trang đăng nhập dưới host công khai).
 */
export async function middleware(request: NextRequest) {
  const artifactHost = hostOf(process.env.ARTIFACT_LINK_URL)
  const host = (request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '').split(
    ':'
  )[0]
  if (artifactHost && host === artifactHost) {
    const m = request.nextUrl.pathname.match(
      /^\/([a-z0-9][a-z0-9_-]{0,127})\/([a-z0-9][a-z0-9_-]{0,127})\/?$/i
    )
    if (m) {
      const url = request.nextUrl.clone()
      url.pathname = `/a/s/${m[1]}/${m[2]}`
      return NextResponse.rewrite(url)
    }
    /**
     * 404 có theme, render bởi route handler Node `/a/not-found` chứ không bởi middleware này.
     *
     * Middleware chạy trên edge runtime; `notFoundPage` → `landingShell` nằm sau `import 'server-only'`
     * và kéo theo `@/core/types/artifact.type`. Nạp chuỗi đó vào bundle edge là đặt cược vào cách Next
     * giải `server-only` cho layer edge — một thứ chỉ vỡ lúc build, không unit test nào ở đây bắt được
     * (test chạy trên Node). Rewrite đổi lại hai thứ chắc chắn: bundle edge không thêm import nào, và
     * 404 ở đây dùng CÙNG một dòng code với 404 của `/a/s/<org>/<slug>` — nên hai trang giống nhau
     * từng byte theo cấu trúc, điều mà việc chống dò org/slug phụ thuộc vào.
     *
     * `search` bị xoá: trang không đọc query, và giữ lại chỉ là một chuỗi do khách điều khiển đi sâu
     * hơn mà không ai cần. `/a/not-found` đã nằm ngoài matcher nên không có vòng lặp rewrite.
     */
    const notFoundUrl = request.nextUrl.clone()
    notFoundUrl.pathname = '/a/not-found'
    notFoundUrl.search = ''
    return NextResponse.rewrite(notFoundUrl)
  }

  const spaces = request.nextUrl.pathname.match(/^\/org\/([^/]+)\/spaces(\/.*)?$/)
  if (spaces) {
    /**
     * Dựng URL MỚI chứ không `nextUrl.clone()`: bản clone mang theo dấu `/` cuối của đường vào,
     * nên `/org/x/spaces/` sẽ đi tới `/org/x/short-links/` và Next lại chuyển hướng thêm một lần
     * nữa để bỏ dấu đó. Test bắt được; đọc code thì không.
     *
     * Dựng mới cũng bỏ luôn `search`: query của trang cũ không có nghĩa ở trang đích.
     */
    return NextResponse.redirect(new URL(`/org/${spaces[1]}/short-links`, request.url))
  }

  return casdoor_middleware(request)
}

/**
 * Spaces bị **ẩn khỏi giao diện** — chốt chủ sản phẩm 2026-10-28, sau khi đo trên production.
 *
 * Ba quyết định liên tiếp về cùng một thứ, ghi đủ vì chúng trông mâu thuẫn:
 * 1. 2026-10-23 — ẩn Spaces khỏi sidebar, **giữ route sống** để link cũ và bookmark không chết.
 * 2. 2026-10-28 (sáng) — bỏ nút "Move to space" dựa trên LiHi (`collections = 0`). SAI: prod có
 *    **32 collection, 44 touch point** đang dùng.
 * 3. 2026-10-28 (sau khi biết con số đó) — **vẫn ẩn, và ẩn hẳn**: nút đã bỏ thì giữ bỏ, route
 *    `/spaces` chuyển hướng về danh sách gộp.
 *
 * ⚠ Dữ liệu `collections` **KHÔNG đụng tới**. 44 touch point có `collection_id` vẫn nằm trong
 * danh sách gộp như mọi hàng khác — danh sách không lọc theo `collection_id` trừ khi người dùng
 * yêu cầu, nên ẩn Spaces không giấu một hàng nào.
 *
 * Chặn ở middleware chứ không ở từng `page.tsx`: ba trang dưới `/spaces` cộng mọi đường con, một
 * chỗ chặn được hết, và không trang nào có thể lọt vì ai đó thêm file mới.
 */

function hostOf(url: string | undefined): string | null {
  if (!url) return null
  try {
    return new URL(url).hostname
  } catch {
    return null
  }
}

export const config = {
  matcher: [
    /**
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images/, lang/, pattern/
     * - api/public/*
     * - api/auth/*
     * - a/* (artifact serving — public by design; see below)
     * - .well-known/* (see below)
     * - static file extensions (svg, png, jpg, jpeg, gif, webp, json)
     *
     * ⚠️ `.well-known` is excluded because the MCP OAuth discovery documents live at the origin ROOT
     * — RFC 8414/9728 clients derive those URLs from the origin and do not probe sub-paths, so they
     * cannot be moved under `/api` where the `api` exclusion above would already cover them. Left
     * matched, an anonymous discovery request falls through `casdoor_middleware` to its final branch
     * and is answered with a redirect to `/auth/login`: the client gets HTML instead of JSON and
     * discovery dies with nothing in the logs to explain it. Skipping middleware entirely also spares
     * every discovery fetch a `getSession()` — which resolves the Casdoor public key — on a document
     * that is public by definition.
     *
     * ⚠️ `a/` is excluded HERE and must never be added to `publicPath` in
     * `shared/lib/casdoor/middleware.ts`: that list is tested with `request.url.includes(path)`, a
     * substring match over the WHOLE url, so an entry as short as `/a/` would mark essentially every
     * authenticated route public. Dropping the path out of the matcher is the only safe way to make
     * artifact serving anonymous.
     */
    '/((?!_next/static|_next/image|favicon.ico|images/|lang/|pattern/|api|a/|\\.well-known|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json)$).*)',
  ],
}
