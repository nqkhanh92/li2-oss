import 'server-only'

import { supabaseService } from '@/infrastructure/database/supabase'
import { logger } from '@/infrastructure/logging/logger'
import type { Json } from '@/shared/types/database.types'

const log = logger.child({ service: 'agent-chat-repo' })

/**
 * Kho dữ liệu hội thoại của dock chat — schema `agent`, KHÔNG phải `public`.
 *
 * ★ Vì sao không kế thừa `BaseRepository`: lớp đó khoá cứng vào `Database['public']['Tables']`
 * (`base.repository.ts:11`), nên mọi bảng ngoài `public` nằm ngoài tầm với của nó. Tiền lệ đúng là
 * `org-audit-log.service.ts`, vốn chạm schema `logs` bằng `supabaseService.schema('logs')`. Đây
 * chép đúng lối đó.
 *
 * ⚠️ Schema `agent` chỉ chạm được khi HAI điều kiện cùng đúng, và cả hai nằm ngoài repo này:
 *   1. `PGRST_DB_SCHEMAS` của PostgREST có `agent` (`~/lihi/supabase/.env`);
 *   2. `service_role` được `grant usage on schema agent` + quyền bảng.
 * Cả hai đã bật trên LiHi ngày 2026-10-29. Thiếu một trong hai thì mọi lời gọi ở đây trả lỗi
 * "schema must be one of the following" — một thông báo không hề gợi ý rằng vấn đề nằm ở cấu hình
 * máy chủ chứ không ở câu truy vấn.
 */
const agent = () => supabaseService.schema('agent')

export type ChatRole = 'user' | 'assistant' | 'tool'

export interface ChatMessageRow {
  id: string
  session_id: string
  role: string
  content: string | null
  model: string | null
  seq: number
  turn_id: string | null
  created_at: string
}

export class AgentChatRepository {
  /**
   * Lấy phiên đang có, hoặc tạo mới nếu `sessionId` là null.
   *
   * ⚠️ `sessionId` đến từ trình duyệt, nên nó **phải** được ràng theo `org_id` + `user_id` chứ không
   * tin suông. Không ràng thì một người gửi id phiên của người khác là đọc được nguyên hội thoại
   * của họ — và vì hội thoại chứa tên link, số liệu, đôi khi cả mật khẩu artifact lúc vừa tạo, đó
   * là rò dữ liệu chứ không chỉ là lẫn ngữ cảnh. Không khớp thì **lặng lẽ mở phiên mới** thay vì
   * báo lỗi: báo lỗi sẽ cho người gửi biết id nào có thật.
   */
  async getOrCreateSession(
    sessionId: string | null,
    orgId: string,
    userId: string
  ): Promise<string> {
    if (sessionId) {
      const { data } = await agent()
        .from('agent_sessions')
        .select('id')
        .eq('id', sessionId)
        .eq('org_id', orgId)
        .eq('user_id', userId)
        .maybeSingle()

      if (data?.id) return data.id
      log.warn({ sessionId, orgId }, 'session_id không khớp org/user — mở phiên mới')
    }

    const { data, error } = await agent()
      .from('agent_sessions')
      .insert({ org_id: orgId, user_id: userId })
      .select('id')
      .single()

    if (error) throw error
    return data.id
  }

  /**
   * Lịch sử của một phiên, theo đúng thứ tự `seq`.
   *
   * `limit` tồn tại vì ngữ cảnh model có trần: một phiên chạy cả ngày sẽ vượt. Cắt theo **đuôi**
   * (`seq` giảm dần rồi đảo lại) chứ không theo đầu — mất phần mở đầu còn chịu được, mất mấy lượt
   * vừa rồi thì trợ lý trả lời lạc đề ngay trước mắt người dùng.
   */
  async getHistory(sessionId: string, limit = 60): Promise<ChatMessageRow[]> {
    const { data, error } = await agent()
      .from('agent_messages')
      .select('id, session_id, role, content, model, seq, turn_id, created_at')
      .eq('session_id', sessionId)
      .order('seq', { ascending: false })
      .limit(limit)

    if (error) throw error
    return (data ?? []).reverse() as ChatMessageRow[]
  }

  /**
   * `seq` tiếp theo của phiên.
   *
   * ⚠️ Cột `seq` là NOT NULL và **không có giá trị mặc định**, nên nó phải được tính ở đây. Phép
   * tính này có chạy đua nếu hai lượt cùng một phiên ghi đồng thời — chấp nhận được vì một phiên
   * thuộc về một người đang gõ trong một khung chat, và giao diện khoá nút gửi trong lúc đang
   * chạy. Nếu sau này có lượt chạy nền thì chỗ này phải đổi thành một sequence thật.
   */
  private async nextSeq(sessionId: string): Promise<number> {
    const { data } = await agent()
      .from('agent_messages')
      .select('seq')
      .eq('session_id', sessionId)
      .order('seq', { ascending: false })
      .limit(1)
      .maybeSingle()

    return (data?.seq ?? 0) + 1
  }

  async appendMessage(params: {
    sessionId: string
    role: ChatRole
    content: string
    turnId: string
    model?: string | null
  }): Promise<string> {
    const seq = await this.nextSeq(params.sessionId)

    const { data, error } = await agent()
      .from('agent_messages')
      .insert({
        session_id: params.sessionId,
        role: params.role,
        content: params.content,
        turn_id: params.turnId,
        model: params.model ?? null,
        seq,
      })
      .select('id')
      .single()

    if (error) throw error
    return data.id
  }

  /**
   * Ghi lại một lần gọi tool.
   *
   * ★ Đây là bảng trả lời câu "cái link này ai tạo, nhắn gì mà ra thế". Giờ AI tạo link và artifact
   * thật, nên câu đó có thật. Liên quan: `audit-log-lihi-khong-ghi` ghi rằng `artifact.service.ts`
   * chưa gọi audit lần nào — đừng lặp lại chuyện đó ở đường AI.
   *
   * `output` bị **cắt ngắn** trước khi ghi: một `list_short_links` trả về hàng trăm hàng, và lưu
   * nguyên sẽ biến bảng vết thành bản sao của bảng dữ liệu. Giữ đủ để tra "nó đã thấy gì", không
   * giữ để truy vấn lại.
   */
  async recordToolCall(params: {
    messageId: string
    toolName: string
    input: unknown
    output: unknown
    isWrite: boolean
    status: 'ok' | 'error' | 'rejected'
    confirmedAt?: string | null
  }): Promise<void> {
    const { error } = await agent()
      .from('agent_tool_calls')
      .insert({
        message_id: params.messageId,
        tool_name: params.toolName,
        input: truncateJson(params.input) as Json,
        output: truncateJson(params.output) as Json,
        is_write: params.isWrite,
        status: params.status,
        confirmed_at: params.confirmedAt ?? null,
      })

    // Best-effort: một lượt chat ĐÃ CHẠY RỒI mới tới đây. Ném lỗi ở đây sẽ huỷ một lượt thành công
    // chỉ vì bảng vết ghi hỏng — người dùng mất câu trả lời đã có, để đổi lấy một hàng log.
    if (error) log.error({ err: error, tool: params.toolName }, 'ghi agent_tool_calls thất bại')
  }

  /**
   * Phiên này có thuộc về đúng org + người dùng đó không. CHỈ ĐỌC.
   *
   * ★ Tách khỏi `getOrCreateSession` vì hàm kia **tạo phiên mới** khi không khớp. Đó là hành vi
   * đúng cho một lượt chat (người dùng cứ nhắn, hệ thống tự lo), nhưng sai cho mọi chỗ khác: một
   * `session_id` bịa gửi tới `/feedback` sẽ đẻ ra một hàng phiên rỗng trong DB mỗi lần gửi.
   */
  async sessionBelongsTo(sessionId: string, orgId: string, userId: string): Promise<boolean> {
    const { data } = await agent()
      .from('agent_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('org_id', orgId)
      .eq('user_id', userId)
      .maybeSingle()

    return Boolean(data?.id)
  }

  /**
   * Ghi 👍/👎 cho một lượt.
   *
   * ★ UPSERT chứ không INSERT, và đó là điều lược đồ đã lường trước: chỉ mục
   * `uq_agent_feedback_turn_user (turn_id, user_id)` cho phép **đúng một** đánh giá mỗi lượt mỗi
   * người. Người dùng bấm 👍 rồi đổi ý sang 👎 là chuyện thường, và giao diện gửi lại y như lần
   * đầu — nên INSERT sẽ vỡ ở ràng buộc duy nhất và nút im lặng không ăn, đúng cái lỗi tính năng
   * này sinh ra để sửa.
   *
   * `updated_at` phải được ghi TAY: cột có `default now()` nhưng mặc định chỉ áp lúc chèn, nên một
   * lần đổi ý sẽ để lại `updated_at` của lần bấm đầu tiên.
   *
   * ⚠️ `org_id` và `user_id` đến từ TOKEN, không từ thân request. Đây là chỗ duy nhất trong bảng
   * này ghi ai đã đánh giá, và một client gửi `user_id` của người khác sẽ ghi đè đánh giá của họ.
   */
  async upsertFeedback(params: {
    sessionId: string
    turnId: string
    orgId: string
    userId: string
    rating: 1 | -1
  }): Promise<void> {
    const { error } = await agent()
      .from('agent_feedback')
      .upsert(
        {
          session_id: params.sessionId,
          turn_id: params.turnId,
          org_id: params.orgId,
          user_id: params.userId,
          rating: params.rating,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'turn_id,user_id' }
      )

    if (error) throw error
  }

  /**
   * Đặt tiêu đề phiên từ tin nhắn đầu, chỉ một lần.
   *
   * Dùng chính lời người dùng chứ không nhờ model đặt tên: thêm một lượt gọi model cho một chuỗi
   * chữ không ai đọc trong bản này (giao diện chưa có danh sách hội thoại) là tiêu tiền không đổi
   * lấy gì.
   */
  async setTitleIfEmpty(sessionId: string, firstMessage: string): Promise<void> {
    const title = firstMessage.trim().slice(0, 120)
    if (!title) return

    const { error } = await agent()
      .from('agent_sessions')
      .update({ title })
      .eq('id', sessionId)
      .is('title', null)

    if (error) log.warn({ err: error, sessionId }, 'đặt tiêu đề phiên thất bại')
  }
}

/**
 * Cắt một giá trị bất kỳ về dạng ghi được, không bao giờ ném lỗi (vòng tham chiếu, BigInt…).
 *
 * Trả `unknown` rồi ép sang `Json` ở chỗ gọi: hình dạng thật phụ thuộc đầu vào của tool, và một
 * kiểu `Json` đệ quy ở đây chỉ làm chữ ký khó đọc mà không bắt thêm được lỗi nào — `JSON.stringify`
 * phía dưới đã là phép kiểm thật, và nhánh `catch` xử lý đúng cái nó không nuốt được.
 */
function truncateJson(value: unknown, max = 4000): unknown {
  let text: string
  try {
    text = JSON.stringify(value) ?? 'null'
  } catch {
    return { truncated: true, reason: 'không tuần tự hoá được' }
  }
  if (text.length <= max) return value
  return { truncated: true, bytes: text.length, head: text.slice(0, max) }
}

export const agentChatRepository = new AgentChatRepository()
