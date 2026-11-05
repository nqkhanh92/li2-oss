import { NextResponse } from 'next/server'

import { withAdmin } from '@/shared/lib/middlewares/with-admin'
import { withCors } from '@/shared/lib/middlewares/with-cors'
import { getUserActivityByDay } from '@/core/services/admin-stats.service'
import { resolveDateRange } from '@/core/helpers/admin-stats/date-series'
import { logger } from '@/infrastructure/logging/logger'

const log = logger.child({ module: 'admin-stats' })

export const dynamic = 'force-dynamic'

/**
 * `GET /api/admin/stats/user-activity-by-day?from=YYYY-MM-DD&to=YYYY-MM-DD`
 *
 * Cho biểu đồ của Inside admin (`admin.li2.ai`), **khác origin** với app — nên `withAdmin` bọc
 * sẵn `withCors`, và `withAuth` vốn đã nhận `Authorization: Bearer` chứ không chỉ cookie
 * (`shared/lib/auth/session.ts:24`). Không cần cơ chế xác thực mới.
 *
 * Trả **đủ mọi ngày** trong khoảng, kể cả ngày bằng 0, tăng dần theo `date`, inclusive hai đầu.
 * Thiếu tham số thì lùi về 30 ngày gần nhất.
 */
/**
 * Preflight phải được export RIÊNG, không dựa vào `withCors` bọc `GET`.
 *
 * Next.js tự sinh một handler `OPTIONS` khi route không export nó, và handler tự sinh đó trả
 * `204` kèm `allow: GET, HEAD, OPTIONS` **không có header CORS nào** — nhánh preflight bên trong
 * `withCors` không bao giờ chạy vì Next chưa từng gọi vào module theo phương thức ấy.
 *
 * Đo thật trên LiHi trước khi sửa: `OPTIONS` từ `Origin: https://admin.li2.ai` trả 204 mà thiếu
 * `Access-Control-Allow-Origin`, nghĩa là trình duyệt của Inside sẽ chặn lời gọi — dù phía máy
 * chủ không có lỗi nào và `curl` thường vẫn chạy ngon.
 *
 * Không gắn auth ở đây: preflight **không** mang theo thông tin xác thực, nên đòi hỏi nó là tự
 * chặn chính mình. `withCors` trả sớm trước khi chạm handler.
 */
export const OPTIONS = withCors(async () => new NextResponse(null, { status: 204 }))

export const GET = withAdmin(async (request) => {
  const params = new URL(request.url).searchParams
  const range = resolveDateRange(params.get('from'), params.get('to'))

  try {
    const data = await getUserActivityByDay(range)
    return NextResponse.json({ data, range: { from: range.from, to: range.to } })
  } catch (error) {
    log.error({ error, range }, 'user-activity-by-day failed')
    return NextResponse.json({ error: 'Could not load activity statistics' }, { status: 500 })
  }
})
