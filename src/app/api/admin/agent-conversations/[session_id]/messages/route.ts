import { NextResponse } from 'next/server'

import { withAdmin } from '@/shared/lib/middlewares/with-admin'
import { withCors } from '@/shared/lib/middlewares/with-cors'
import { getConversationMessages } from '@/core/services/admin-conversation-detail.service'
import { parseConversationDetailQuery } from '@/core/helpers/admin-stats/conversation-detail-query'
import { logger } from '@/infrastructure/logging/logger'

const log = logger.child({ module: 'admin-conversation-detail' })

export const dynamic = 'force-dynamic'

/** Preflight phải export RIÊNG — Next tự sinh `OPTIONS` không kèm header CORS nào. */
export const OPTIONS = withCors(async () => new NextResponse(null, { status: 204 }))

/**
 * `GET /api/admin/agent-conversations/[session_id]/messages` — tin nhắn của MỘT phiên, cho trang
 * "AI Agent Health" của Inside admin.
 *
 * Tham số: `page`, `limit` (mặc định 100, trần 500). Tin sắp theo `seq` tăng dần.
 *
 * ✅ Endpoint này **CÓ** trả `content` — chủ sản phẩm đã đồng ý cho admin đọc nội dung hội thoại.
 * Đây là ca ngược với endpoint danh sách, nơi `content` bị chặn.
 *
 * ⛔ Nhưng **KHÔNG** trả `agent_tool_calls.input`/`output`: `input` của
 * `publish_draft_artifact` chứa mật khẩu artifact ở dạng bản rõ, tức một thứ mà chính chủ artifact
 * đã không xem lại được. Xem `ConversationToolCall` trong service.
 */
export const GET = withAdmin<{ session_id: string }>(async (request, { params }) => {
  const query = parseConversationDetailQuery(new URL(request.url).searchParams)

  try {
    const detail = await getConversationMessages(params.session_id, query)

    /**
     * 404 cho cả "không có phiên đó" và "id sai định dạng". Gộp hai ca là có chủ đích: phân biệt
     * chúng là nói cho người gọi biết id nào **có thật** trong hệ thống, và đây là endpoint đọc
     * được hội thoại của mọi org — cùng lý lẽ với `getOrCreateSession`, nơi id không khớp được xử
     * lặng lẽ thay vì báo lỗi.
     */
    if (!detail) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    return NextResponse.json({
      session: detail.session,
      data: detail.messages,
      total: detail.total,
      page: query.page,
      limit: query.limit,
    })
  } catch (error) {
    log.error({ error, sessionId: params.session_id, query }, 'admin conversation detail failed')
    return NextResponse.json({ error: 'Could not load conversation' }, { status: 500 })
  }
})
