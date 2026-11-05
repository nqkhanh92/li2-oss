import { NextResponse } from 'next/server'

import { getFavicon } from '@/core/services/favicon.service'
import { checkFetchableUrl } from '@/core/helpers/safe-fetch-url'
import { compose } from '@/shared/lib/middlewares/compose'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { withRateLimit, RateLimitPresets } from '@/shared/lib/middlewares/with-rate-limit'

/**
 * Phục vụ lại favicon của trang đích từ domain của mình.
 *
 * Ba lớp, mỗi lớp một việc:
 * - `withAuth` — người lạ không dùng máy chủ này làm máy tải hộ.
 * - `withRateLimit` — người đã đăng nhập cũng không. Quota tính theo user (xem
 *   `defaultKeyGenerator`), và vì `getFavicon` cache theo origin nên một danh sách mở đi mở lại gần
 *   như không tiêu quota; chỉ origin **mới** mới tốn.
 * - `checkFetchableUrl` — URL do người dùng nhập, nên đích phải không nằm trong mạng nội bộ. Lớp
 *   này còn giá trị cả khi ai đó gỡ hai lớp trên: một người dùng hợp lệ vẫn không được phép lấy
 *   máy chủ làm bàn đạp.
 *
 * Trả **204** khi không có ảnh, không phải 404: đây là câu trả lời đúng ("không có biểu tượng"),
 * không phải một lỗi. `<img>` vẫn kích `onerror` nên giao diện lùi về ảnh thay thế như thường.
 */
export const GET = compose(
  withAuth,
  withRateLimit(RateLimitPresets.GENEROUS)
)(async (request: Request) => {
  const raw = new URL(request.url).searchParams.get('url')
  if (!raw) return NextResponse.json({ error: 'url is required' }, { status: 400 })

  const check = checkFetchableUrl(raw)
  // Không vọng lại URL: nó quay về nguyên văn là một đường phản chiếu.
  if (!check.ok) {
    return NextResponse.json({ error: 'url is not allowed', reason: check.reason }, { status: 400 })
  }

  const favicon = await getFavicon(check.url)
  if (!favicon) return new NextResponse(null, { status: 204 })

  return new NextResponse(favicon.body as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': favicon.contentType,
      /**
       * Byte từ máy chủ của người khác, phục vụ lại từ origin của mình. `nosniff` để trình duyệt
       * không tự đoán đây là HTML, và CSP `default-src 'none'` để kể cả khi nó bị đọc thành một
       * trang thì trang đó không tải hay chạy được gì.
       */
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      /**
       * Cache ở trình duyệt. Có cache Redis rồi, nhưng không có header này thì mỗi lần mở danh sách
       * vẫn là một lượt đi về máy chủ cho **từng** hàng.
       */
      'Cache-Control': 'private, max-age=86400',
    },
  })
})
