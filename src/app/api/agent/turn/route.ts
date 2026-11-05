import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { logger } from '@/infrastructure/logging/logger'
import { withAgentAuth } from '@/shared/lib/middlewares/with-agent-auth'
import { runChatTurn, describeTurnError, type Emit, type TurnInput } from '@/core/agent/turn'
import type { DraftArtifact } from '@/core/agent/system-prompt'
import { artifactService } from '@/core/services/artifact.service'
import { rejectOversizedAgentBody } from '@/core/helpers/artifact-agent-tools'

const log = logger.child({ service: 'agent-turn-route' })

/**
 * `POST /api/agent/turn` — một lượt chat, trả về dưới dạng SSE.
 *
 * ★ ĐÂY LÀ ROUTE SSE ĐẦU TIÊN CỦA APP (`grep text/event-stream src/app/api` trước đó rỗng). Hai
 * hệ quả không thấy được khi đọc code:
 *   1. Không có tiền lệ nào để so khi nó hỏng — mọi thứ dưới đây là đường chưa ai đi trên LiHi.
 *   2. **Proxy đệm phản hồi sẽ giết nó mà không báo lỗi.** LiHi có Traefik đứng sau một reverse
 *      proxy LAN; nếu một trong hai lớp gom phản hồi lại rồi nhả một lần, người dùng thấy khung
 *      chat đứng im vài chục giây rồi câu trả lời hiện nguyên khối. Nó chạy hoàn hảo trên
 *      localhost và chỉ hỏng trên server. `X-Accel-Buffering: no` dưới đây là lớp phòng đầu tiên;
 *      phải kiểm bằng `curl -N` TRÊN SERVER chứ không phải ở máy.
 *
 * Giao diện đã có sẵn và không sửa một dòng nào: `use-agent-chat-transport.ts` trỏ tới
 * `${NEXT_PUBLIC_LI2_AI_BASE_URL}/turn`, nên đặt biến đó thành `/api/agent` là nối xong.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
/** Một lượt có thể gọi nhiều tool. Trần này phải rộng hơn timeout của SDK (180s) để lỗi rơi về
 *  phía mình với thông báo tử tế, thay vì bị nền tảng cắt ngang giữa luồng. */
export const maxDuration = 300

const approvalSchema = z.object({
  proposal_id: z.string().uuid(),
  decision: z.enum(['approve', 'reject']),
})

/**
 * Hai hình dạng thân request, loại trừ nhau.
 *
 * `.strict()` ở cả hai nhánh: thân này do trình duyệt gửi, và một khoá lạ nghĩa là giao diện và
 * server đang hiểu khác nhau — thà 400 ngay còn hơn im lặng bỏ qua một trường ai đó vừa thêm.
 */
const bodySchema = z.union([
  z
    .object({
      // `z.string()` chứ không `coerce`: FormData chỉ chở chuỗi, và coerce sẽ biến một `File` gửi
      // nhầm vào ô `message` thành chuỗi "[object File]" thay vì báo 400.
      message: z.string().min(1).max(8000),
      session_id: z.string().uuid().nullable(),
      turn_id: z.string().uuid(),
    })
    .strict(),
  z
    .object({
      approval: approvalSchema,
      session_id: z.string().uuid().nullable(),
      turn_id: z.string().uuid(),
    })
    .strict(),
])

/**
 * Đọc thân request ở cả hai dạng: JSON thuần, hoặc `multipart/form-data` khi lượt có file đính kèm.
 *
 * ★ Vì sao file đi CÙNG lượt chat chứ không có một endpoint tải lên riêng: chủ sản phẩm chốt luồng
 * kiểu Claude Desktop — chọn file thì nó thành một chip trong khung soạn, và **Enter** vừa gửi lời
 * nhắn vừa đẩy file lên. Không có nút Publish riêng (hợp mục 5 đã bỏ mọi nút trong luồng hội
 * thoại), mà file cũng không bay lên khi người dùng mới chỉ chọn nhầm (hợp mục 6).
 *
 * Tác dụng phụ đáng giá: server có file **trước khi** lượt model chạy, nên trợ lý biết tên, loại
 * và dung lượng thật để nói lại — thứ mà phương án "giữ trong trình duyệt tới lúc bấm Publish"
 * nguyên gốc không làm được.
 */
async function readBody(request: NextRequest): Promise<{ raw: unknown; file: File | null }> {
  const contentType = request.headers.get('content-type') ?? ''

  if (!contentType.includes('multipart/form-data')) {
    return { raw: await request.json().catch(() => null), file: null }
  }

  /**
   * ⚠️ TỪ CHỐI THEO `content-length` TRƯỚC KHI PHÂN TÍCH MỘT BYTE NÀO. `formData()` của undici
   * nhân bộ nhớ lên khoảng 5 lần (đo ở `organizations/[org_id]/artifacts/route.ts`: 10 MB vào →
   * +50,7 MB RSS). Phân tích rồi mới xem `file.size` tức là đã trả giá cho đúng cái thân request
   * mình sắp vứt đi.
   */
  rejectOversizedAgentBody(request)

  const form = await request.formData()
  const file = form.get('file')
  const sessionId = form.get('session_id')

  return {
    raw: {
      message: form.get('message'),
      // `null` và chuỗi 'null' đều phải thành `null`: `FormData` chỉ chở chuỗi, nên một client gửi
      // `session_id` rỗng hay literal 'null' là chuyện thường, và lược đồ chỉ nhận UUID hoặc null.
      session_id: typeof sessionId === 'string' && sessionId && sessionId !== 'null' ? sessionId : null,
      turn_id: form.get('turn_id'),
    },
    file: file instanceof File ? file : null,
  }
}

export const POST = withAgentAuth<Record<string, never>>(
  ['read', 'write'],
  async (request: NextRequest, { context, agent }) => {
    const { raw, file } = await readBody(request)

    const parsed = bodySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: 'thân request không hợp lệ' }, { status: 400 })
    }
    const body = parsed.data

    /**
     * File → một hàng `draft`, TRƯỚC khi model chạy.
     *
     * "Nháp" là chữ quan trọng: file đã nằm trên server nhưng chưa ai xem được, và chế độ xem sẽ
     * được ghi lên chính hàng đó trước khi nó sống (`publish_draft_artifact`). Nên không có
     * khoảnh khắc nào một trang đáng lẽ khoá lại đang mở — khác hẳn đường `publish_artifact`,
     * vốn phải mang trường `warning` cho đúng ca đó.
     *
     * Lỗi ở đây KHÔNG được nuốt: quota hết, file nhiễm mã độc, định dạng không nhận — đó là những
     * điều người dùng phải biết ngay, và chúng xảy ra trước khi có luồng SSE nào để kể.
     */
    let draft: DraftArtifact | null = null
    if (file) {
      const artifact = await artifactService.create(agent.orgId, context.userId, { file })
      draft = {
        artifact_id: artifact.id,
        name: artifact.name,
        content_type: artifact.content_type,
        size_bytes: artifact.size_bytes,
      }
      log.info(
        { orgId: agent.orgId, artifactId: artifact.id, bytes: artifact.size_bytes },
        'lượt chat kèm file — đã tạo bản nháp'
      )
    }

    const input: TurnInput =
      'approval' in body
        ? {
            kind: 'approval',
            proposalId: body.approval.proposal_id,
            decision: body.approval.decision,
          }
        : { kind: 'message', message: body.message }

    const token = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim()

    const encoder = new TextEncoder()
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let closed = false

        const emit: Emit = (event, data) => {
          if (closed) return
          try {
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
          } catch {
            // Hàng đợi đóng giữa chừng (người dùng bấm Dừng, hoặc tab đóng). Không phải lỗi —
            // `signal` bên dưới sẽ dừng vòng lặp; ở đây chỉ cần thôi ghi.
            closed = true
          }
        }

        try {
          await runChatTurn(
            {
              input,
              sessionId: body.session_id,
              turnId: body.turn_id,
              orgId: agent.orgId,
              userId: context.userId,
              token,
              scopes: agent.scopes,
              draft,
              signal: request.signal,
            },
            emit
          )
        } catch (err) {
          /**
           * Mọi lỗi ngoài dự kiến đi ra bằng frame `error`, KHÔNG bằng mã HTTP.
           *
           * Tới đây thì phản hồi 200 đã gửi đi rồi — không đổi mã được nữa. Mà quan trọng hơn:
           * giao diện coi luồng kết thúc mà không có frame cuối là "stream ended without a result"
           * (`use-agent-chat-transport.ts:389`), nên im lặng thoát ra sẽ hiện một lỗi mơ hồ thay
           * vì lỗi thật.
           */
          log.error({ err, orgId: agent.orgId, turnId: body.turn_id }, 'lượt chat vỡ')
          emit('error', { message: describeTurnError(err) })
        } finally {
          closed = true
          try {
            controller.close()
          } catch {
            // đã đóng rồi
          }
        }
      },
    })

    return new NextResponse(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        // `no-transform` cũng quan trọng ngang `no-cache`: nó cấm proxy nén hay gộp lại khối dữ liệu.
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        // nginx và vài proxy khác đọc header này để TẮT đệm cho riêng phản hồi này. Vô hại với
        // proxy không hiểu nó, và là thứ rẻ nhất có thể làm trước khi phải đi sửa cấu hình proxy.
        'X-Accel-Buffering': 'no',
      },
    })
  }
)
