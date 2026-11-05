import { NextResponse } from 'next/server'

import { withAdmin } from '@/shared/lib/middlewares/with-admin'
import { withCors } from '@/shared/lib/middlewares/with-cors'
import { listConversations } from '@/core/services/admin-conversations.service'
import { parseConversationListQuery } from '@/core/helpers/admin-stats/conversation-query'
import { logger } from '@/infrastructure/logging/logger'

const log = logger.child({ module: 'admin-conversations' })

export const dynamic = 'force-dynamic'

/** Preflight phải export RIÊNG — Next tự sinh `OPTIONS` không kèm header CORS nào. */
export const OPTIONS = withCors(async () => new NextResponse(null, { status: 204 }))

/**
 * `GET /api/admin/agent-conversations` — danh sách hội thoại với trợ lý AI, cho trang
 * "AI Conversations" của Inside admin. Một hàng là một phiên.
 *
 * Tham số: `page`, `limit`, `organization_id`, `sort_by`, `sort_order`, `start_date`, `end_date`,
 * `has_tool_errors`.
 *
 * ⛔ KHÔNG có `search`, khác `/api/admin/artifacts`. Trường văn bản duy nhất tìm được là
 * `agent_sessions.title`, mà `title` là tin nhắn đầu tiên cắt thô — một ô tìm kiếm trên nó là cách
 * dò nội dung hội thoại mà không cần đọc nội dung. Lọc theo org dùng `organization_id`, chính xác
 * hơn và không dò được gì.
 *
 * Hình dạng trả về **một lớp**, khớp `/api/admin/artifacts`: `{ data: [...], total, page, limit }`.
 * Có `page`/`limit` để bên gọi đối chiếu cái mình **nhận** với cái mình **xin** — tham số bị chuẩn
 * hoá thì nhìn ra ngay thay vì tưởng dữ liệu sai.
 *
 * ⚠ Endpoint này **không trả** nội dung tin nhắn, `title`, `status`, hay `input`/`output` của lời
 * gọi tool. Chỉ số đếm và metadata. Xem `MESSAGE_COLUMNS` và `SESSION_COLUMNS` trong service.
 */
export const GET = withAdmin(async (request) => {
  const params = parseConversationListQuery(new URL(request.url).searchParams)

  try {
    const { data, total } = await listConversations(params)
    return NextResponse.json({
      data,
      total,
      page: params.page,
      limit: params.limit,
    })
  } catch (error) {
    log.error({ error, params }, 'admin conversations listing failed')
    return NextResponse.json({ error: 'Could not load conversations' }, { status: 500 })
  }
})
