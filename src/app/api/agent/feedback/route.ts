import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { logger } from '@/infrastructure/logging/logger'
import { withAgentAuth } from '@/shared/lib/middlewares/with-agent-auth'
import { agentChatRepository } from '@/core/repositories/agent-chat.repository'

const log = logger.child({ service: 'agent-feedback-route' })

/**
 * `POST /api/agent/feedback` — ghi 👍/👎 cho một lượt trả lời.
 *
 * ★ VÌ SAO TỒN TẠI. Nút 👍/👎 đã nằm trong giao diện từ trước (`feedback-buttons.tsx`), và
 * `use-agent-chat-transport.ts:500-512` vẫn gửi tới `${NEXT_PUBLIC_LI2_AI_BASE_URL}/feedback` —
 * đó là endpoint của li2-ai, dịch vụ Python nay không còn. Nên từ lúc chuyển sang vòng lặp
 * TypeScript, bấm 👍 là gửi vào hư không: 404, và code client lặng lẽ bỏ đánh dấu vừa tô.
 *
 * Người dùng bấm, thấy nút sáng lên rồi tắt, và **không có gì báo là nó không được lưu**. Một
 * đường phản hồi im lặng còn tệ hơn không có đường nào — vì nó khiến người ta tưởng đã góp ý.
 *
 * ⛔ `201` CHỨ KHÔNG PHẢI `200`. `sendFeedback` kiểm đúng `res?.status === 201` và coi mọi mã khác
 * là thất bại. Đổi sang `APIResponse.ok` ở đây sẽ làm nút im lặng hỏng lại, theo đúng cách nó vừa
 * hỏng — và không test nào ở phía server thấy được, vì server vẫn trả về thành công.
 *
 * nodejs runtime: withAgentAuth → paseto-ts cần node crypto, không chạy edge.
 */

export const runtime = 'nodejs'

const bodySchema = z
  .object({
    session_id: z.string().uuid(),
    turn_id: z.string().uuid(),
    // Khớp đúng ràng buộc `agent_feedback_rating_check` trong DB. Kiểm ở đây để một giá trị sai trả
    // 400 có nghĩa, thay vì một lỗi ràng buộc Postgres hiện ra như 500.
    rating: z.union([z.literal(1), z.literal(-1)]),
  })
  .strict()

export const POST = withAgentAuth<Record<string, never>>(
  ['read'],
  async (request: NextRequest, { context, agent }) => {
    const parsed = bodySchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: 'thân request không hợp lệ' }, { status: 400 })
    }

    const { session_id, turn_id, rating } = parsed.data

    /**
     * ⚠️ Ràng phiên theo org + user TRƯỚC khi ghi.
     *
     * `session_id` đến từ trình duyệt. Không kiểm thì một người gửi id phiên của người khác sẽ gắn
     * đánh giá vào hội thoại của họ — và vì `uq_agent_feedback_turn_user` khoá theo
     * `(turn_id, user_id)`, hàng đó vẫn hợp lệ và nằm lại vĩnh viễn trong dữ liệu dùng để đánh giá
     * chất lượng trợ lý.
     *
     * Dùng `sessionBelongsTo` chứ KHÔNG `getOrCreateSession`: hàm kia tạo phiên mới khi không
     * khớp, nên mỗi lần gửi một id bịa sẽ đẻ ra một hàng phiên rỗng. Đúng cho một lượt chat, sai
     * ở đây.
     *
     * Không khớp thì trả 404 chứ không 403: 403 xác nhận rằng id đó có thật.
     */
    const ok = await agentChatRepository.sessionBelongsTo(session_id, agent.orgId, context.userId)
    if (!ok) {
      log.warn({ sessionId: session_id, orgId: agent.orgId }, 'feedback cho phiên không thuộc về người gửi')
      return NextResponse.json({ error: 'không tìm thấy phiên' }, { status: 404 })
    }

    await agentChatRepository.upsertFeedback({
      sessionId: session_id,
      turnId: turn_id,
      orgId: agent.orgId,
      userId: context.userId,
      rating,
    })

    // 201 — xem ghi chú ở đầu file. Thân phản hồi không được đọc, nhưng trả rỗng hẳn thì một lần
    // gỡ lỗi bằng curl không nói được gì.
    return NextResponse.json({ data: { turn_id, rating } }, { status: 201 })
  }
)
