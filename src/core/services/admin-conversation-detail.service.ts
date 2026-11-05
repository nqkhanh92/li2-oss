import 'server-only'

import { supabaseService } from '@/infrastructure/database/supabase'
import { logger } from '@/infrastructure/logging/logger'

const log = logger.child({ module: 'admin-conversation-detail' })

/** Schema `agent`, cùng lối với `admin-conversations.service.ts` và `agent-chat.repository.ts`. */
const agent = () => supabaseService.schema('agent')

export type GetConversationMessagesParams = {
  page: number
  limit: number
}

/**
 * Một lời gọi tool, **không kèm tham số và kết quả**.
 *
 * ⛔ `input` và `output` KHÔNG có ở đây, và đây là ràng buộc cứng — khác hạng với việc trả `content`.
 *
 * Chủ sản phẩm đã đồng ý cho admin đọc **nội dung hội thoại**. Họ chưa được hỏi về `input`, và
 * `input` chứa một thứ mà nội dung hội thoại không chứa: `publish_draft_artifact` lưu
 * `input.access = { mode, password }`, tức **mật khẩu artifact ở dạng bản rõ** (4 hàng trên LiHi).
 *
 * Mật khẩu artifact theo thiết kế **chỉ hiện một lần** cho chính người tạo, và server lưu hash chứ
 * không lưu bản rõ. Nhưng khi artifact được tạo qua chat, mật khẩu đi qua tham số gọi tool và
 * `recordToolCall` lưu nguyên. Nên trả `input` không phải là "cho đọc hội thoại" — nó là một đường
 * vòng quanh cơ chế chỉ-hiện-một-lần, cho admin thấy thứ mà **chính chủ artifact đã không xem lại
 * được**. Đó là một quyết định khác, cần một câu hỏi khác.
 *
 * `tool_name` + `status` + `is_write` đã đủ cho mục đích của trang: trợ lý gọi gì, hỏng ở đâu.
 */
export type ConversationToolCall = {
  id: string
  tool_name: string
  status: string
  is_write: boolean
  confirmed_at: string | null
  created_at: string
}

export type ConversationMessage = {
  id: string
  role: string
  /**
   * ✅ Nội dung tin nhắn **CÓ** ở endpoint này, cố ý — chủ sản phẩm đã đồng ý cho admin đọc hội
   * thoại. Đây là ca NGƯỢC với endpoint danh sách, nơi `content` bị chặn và có test ghim.
   *
   * Đừng "dọn" trường này theo test của trang danh sách: hai endpoint trả lời hai câu khác nhau.
   * Danh sách là *quét* mọi org, nên nó không được mang nội dung; chi tiết là *mở một phiên*, một
   * hành động có chủ đích và hẹp. Có test ghim rằng `content` phải còn.
   */
  content: string | null
  seq: number
  created_at: string
  model: string | null
  turn_id: string | null
  tool_calls: ConversationToolCall[]
}

export type ConversationHeader = {
  session_id: string
  session_short_id: string
  created_at: string
  organization_id: string
  organization_name: string | null
  user_id: string
  user_email: string | null
  user_name: string | null
}

export type ConversationDetail = {
  session: ConversationHeader
  messages: ConversationMessage[]
  /** Tổng số tin của phiên, KHÔNG phải số tin trong trang này. */
  total: number
}

const MESSAGE_COLUMNS = 'id, role, content, seq, created_at, model, turn_id'

/** ⛔ Không có `input`, không có `output` — xem `ConversationToolCall`. */
const TOOL_CALL_COLUMNS = 'id, message_id, tool_name, status, is_write, confirmed_at, created_at'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type ToolCallRow = ConversationToolCall & { message_id: string }

/**
 * Tên org và hồ sơ người dùng cho **một** phiên.
 *
 * Tra lẻ chứ không dùng lại `fetchOrgNames`/`fetchProfiles` của `admin-conversations.service.ts`:
 * hai hàm đó là tra theo lô có chia chunk, dựng cho một *trang* nhiều hàng. Ở đây chỉ có đúng một
 * org và một người, nên dùng lại sẽ phải xuất khẩu hai hàm ra khỏi một service đã chốt và đã
 * nghiệm thu, đổi lấy một lời gọi dài dòng hơn chính đoạn nó thay thế.
 */
const fetchOwner = async (orgId: string, userId: string) => {
  const [org, profile] = await Promise.all([
    supabaseService.from('organizations').select('name').eq('id', orgId).maybeSingle(),
    supabaseService
      .from('profiles')
      .select('email, name, display_name')
      .eq('id', userId)
      .maybeSingle(),
  ])
  if (org.error) throw org.error
  if (profile.error) throw profile.error

  return {
    organization_name: org.data?.name ?? null,
    user_email: profile.data?.email ?? null,
    user_name: profile.data?.display_name?.trim() || profile.data?.name || null,
  }
}

const fetchToolCalls = async (messageIds: string[]) => {
  const byMessage = new Map<string, ConversationToolCall[]>()
  if (messageIds.length === 0) return byMessage

  const { data, error } = await agent()
    .from('agent_tool_calls')
    .select(TOOL_CALL_COLUMNS)
    .in('message_id', messageIds)
  if (error) throw error

  for (const row of (data ?? []) as unknown as ToolCallRow[]) {
    const { message_id, ...call } = row
    const list = byMessage.get(message_id) ?? []
    list.push(call)
    byMessage.set(message_id, list)
  }

  // Thứ tự trong một tin: theo thời điểm gọi, `id` làm mốc phụ. Thiếu mốc phụ thì hai lời gọi cùng
  // mili-giây đổi chỗ giữa hai lần tải, và người đọc tưởng trợ lý gọi theo thứ tự khác.
  for (const list of byMessage.values()) {
    list.sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
  }
  return byMessage
}

/**
 * Tin nhắn của **một** phiên, kèm phần đầu nhận dạng phiên.
 *
 * Trả `null` khi không có phiên đó — route đổi thành 404. Tách "không có" khỏi "truy vấn hỏng" là
 * cần, vì chúng là hai câu trả lời khác nhau cho người gọi: một cái bảo đừng thử lại, cái kia bảo
 * thử lại.
 */
export const getConversationMessages = async (
  sessionId: string,
  p: GetConversationMessagesParams
): Promise<ConversationDetail | null> => {
  /**
   * Chặn id sai định dạng TRƯỚC khi xuống DB. Không chặn thì Postgres ném `22P02 invalid input
   * syntax for type uuid` và endpoint trả **500** cho một thứ chỉ là "id này không tồn tại" — một
   * lỗi của người gọi bị báo thành lỗi của server, và nó còn làm nhiễu log lỗi thật.
   */
  if (!UUID.test(sessionId.trim())) return null

  const session = await agent()
    .from('agent_sessions')
    .select('id, org_id, user_id, created_at')
    .eq('id', sessionId.trim())
    .maybeSingle()
  if (session.error) throw session.error
  if (!session.data) return null

  const row = session.data as { id: string; org_id: string; user_id: string; created_at: string }
  const offset = (p.page - 1) * p.limit

  const [owner, messages] = await Promise.all([
    fetchOwner(row.org_id, row.user_id),
    agent()
      .from('agent_messages')
      .select(MESSAGE_COLUMNS, { count: 'exact' })
      .eq('session_id', row.id)
      /**
       * Sắp theo `seq`, KHÔNG theo `created_at`. `seq` là thứ tự thật của hội thoại
       * (`appendMessage` tự tăng nó), còn `created_at` là `timestamptz` nên hai tin trong cùng một
       * lượt có thể trùng mốc tới mili-giây — lúc đó `created_at` không định được thứ tự và một
       * câu trả lời sẽ hiện trước câu hỏi.
       */
      .order('seq', { ascending: true })
      .range(offset, offset + p.limit - 1),
  ])
  if (messages.error) throw messages.error

  const messageRows = (messages.data ?? []) as unknown as Omit<ConversationMessage, 'tool_calls'>[]
  const toolCalls = await fetchToolCalls(messageRows.map((m) => m.id))

  /**
   * `info`, không `debug`: một admin đọc hội thoại của một org khác là một hành động đáng để lại
   * dấu, và `debug` thường bị tắt ở môi trường thật nên nó sẽ không để lại dấu nào.
   *
   * Đây vẫn chỉ là log ứng dụng, KHÔNG phải audit log — xem phần ghi chú trong báo cáo.
   */
  log.info(
    { sessionId: row.id, orgId: row.org_id, messages: messageRows.length, total: messages.count },
    'admin read conversation messages'
  )

  return {
    session: {
      session_id: row.id,
      session_short_id: row.id.slice(0, 8),
      created_at: row.created_at,
      organization_id: row.org_id,
      user_id: row.user_id,
      ...owner,
    },
    messages: messageRows.map((m) => ({ ...m, tool_calls: toolCalls.get(m.id) ?? [] })),
    total: messages.count ?? 0,
  }
}
