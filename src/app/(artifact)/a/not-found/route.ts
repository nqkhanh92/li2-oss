import { NextRequest } from 'next/server'
import { artifactNotFoundResponse } from '@/core/helpers/artifact-not-found'

/**
 * Trang 404 của host artifact, dưới dạng route handler Node — KHÔNG render trong `middleware.ts`.
 *
 * Lý do: middleware của Next chạy trên edge runtime, còn cả chuỗi `notFoundPage` → `landingShell` →
 * `ARTIFACT_LANDING_COPY` nằm sau `import 'server-only'`, và `artifact-gate-pages.ts` còn kéo theo
 * `@/core/types/artifact.type`. Gói `server-only` được giải khác nhau theo điều kiện bundle của từng
 * layer, nên nạp nó vào bundle edge là đặt cược vào một chi tiết nội bộ của Next mà không test nào ở
 * repo này chứng minh được (unit test chạy trên Node, không phải edge — nó sẽ xanh kể cả khi bundle
 * edge vỡ lúc build). Middleware `rewrite` sang đây đổi lại được hai thứ chắc chắn: bundle edge
 * không thêm một import nào, và 404 của middleware với 404 của `/a/s/<org>/<slug>` chạy CÙNG một
 * dòng code — nên chúng giống nhau từng byte theo cấu trúc, không phải theo kỷ luật.
 *
 * Rewrite giữ nguyên URL trên thanh địa chỉ và lấy status từ route đích, nên khách vẫn thấy đường dẫn
 * họ đã gõ và vẫn nhận 404.
 *
 * Đường này cũng mở trên app host và trả đúng trang đó. Không sao: nó không nói gì về artifact nào.
 * Nó nằm dưới `/a/` nên đã được loại khỏi matcher của middleware — không có vòng lặp rewrite.
 */
async function notFound(request: NextRequest) {
  return artifactNotFoundResponse(request.headers.get('accept-language'))
}

/**
 * MỌI method, không chỉ GET. Middleware rewrite về đây bất kể method, và một route chỉ export `GET`
 * sẽ trả 405 cho một POST vào đường lạ — tức là đổi mã trạng thái của một đường không tồn tại, và
 * nói cho người gõ biết rằng ở đây có một route thật.
 */
export const GET = notFound
export const HEAD = notFound
export const POST = notFound
export const PUT = notFound
export const PATCH = notFound
export const DELETE = notFound
export const OPTIONS = notFound

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
