import 'server-only'

import { supabaseService } from '@/infrastructure/database/supabase'
import { logger } from '@/infrastructure/logging/logger'
import type { DateRange } from '@/core/helpers/admin-stats/date-series'

const log = logger.child({ module: 'admin-conversations' })

/**
 * Bảng hội thoại chạm schema `agent`, nên dùng `supabaseService.schema('agent')` — đúng lối mà
 * `agent-chat.repository.ts` đã mở đường (và `org-audit-log.service.ts` trước đó với schema
 * `logs`). `organizations`/`profiles` nằm ở `public` nên gọi thẳng `supabaseService.from(...)`.
 *
 * ⚠ Hai schema KHÔNG nhúng được vào nhau: PostgREST chỉ lần ra quan hệ trong phạm vi schema đang
 * chọn, nên tên org và email người dùng phải tra bằng lượt truy vấn riêng — y như
 * `admin-artifacts.service.ts` phải làm với `profiles` vì thiếu khoá ngoại.
 */
const agent = () => supabaseService.schema('agent')

export const CONVERSATION_SORT_FIELDS = [
  'created_at',
  'last_message_at',
  'message_count',
  'tool_call_count',
  'tool_error_count',
] as const
export type ConversationSortField = (typeof CONVERSATION_SORT_FIELDS)[number]

/** Cột nằm ngay trên `agent_sessions` — sắp và phân trang được trong SQL. Còn lại phải gộp trước. */
const SQL_SORT_FIELDS: ConversationSortField[] = ['created_at']

/**
 * Tool lỗi nhiều nhất trong một phiên, kèm **mẫu số**.
 *
 * `calls` là lý do kiểu này là một object chứ không phải một chuỗi: `get_top_links_ide` trên LiHi
 * là 7 lỗi / 7 gọi — nó chưa bao giờ chạy được, tức một lỗi cấu hình sửa một lần. Một tool 3 lỗi /
 * 20 gọi là lỗi logic, việc khác hẳn. Thiếu `calls` thì hai trường hợp đó trông y như nhau, mà
 * phân biệt được chúng đúng là cả lý do cột này tồn tại.
 *
 * Gói thành object chứ không ba trường phẳng (`top_failing_tool_name/_errors/_calls`): "phiên không
 * có tool nào lỗi" khi đó là **một** `null` thay vì một tên null cạnh hai số 0, và giao diện không
 * phải đoán xem `0` nghĩa là "không có lỗi" hay "chưa đo".
 */
export type TopFailingTool = {
  name: string
  errors: number
  calls: number
}

export type ConversationSummary = {
  session_id: string
  /**
   * 8 ký tự đầu của `session_id`, để bảng có một nhãn ngắn mà người ta nhận ra được một hàng.
   *
   * ⚠ Nhãn **hiển thị**, không phải khoá tra: endpoint không có `search`, và `session_id` là `uuid`
   * nên Postgres không `ilike` được tiền tố của nó. Giao diện nên cho sao chép `session_id` đầy đủ.
   */
  session_short_id: string
  created_at: string
  organization_id: string
  organization_name: string | null
  user_id: string
  user_email: string | null
  user_name: string | null
  message_count: number
  user_message_count: number
  /** `null` khi phiên chưa có tin nhắn nào — phiên rỗng vẫn tồn tại thật, xem `getOrCreateSession`. */
  last_message_at: string | null
  tool_call_count: number
  tool_error_count: number
  /** `null` khi phiên không có lời gọi tool nào lỗi — xem `TopFailingTool`. */
  top_failing_tool: TopFailingTool | null
  model: string | null
}

export type ListConversationsParams = {
  page: number
  limit: number
  organizationId?: string
  sortBy: ConversationSortField
  sortOrder: 'asc' | 'desc'
  range?: DateRange
  /** Chỉ phiên có ít nhất một lời gọi tool lỗi — lý do chính người ta mở trang này. */
  onlyToolErrors: boolean
}

type SessionRow = {
  id: string
  org_id: string
  user_id: string
  created_at: string
}

type MessageRow = {
  id: string
  session_id: string
  role: string
  model: string | null
  seq: number
  created_at: string
}

type ToolCallRow = { message_id: string; tool_name: string; status: string }

type Aggregate = {
  message_count: number
  user_message_count: number
  last_message_at: string | null
  tool_call_count: number
  tool_error_count: number
  top_failing_tool: TopFailingTool | null
  model: string | null
}

const EMPTY_AGGREGATE: Aggregate = {
  message_count: 0,
  user_message_count: 0,
  last_message_at: null,
  tool_call_count: 0,
  tool_error_count: 0,
  top_failing_tool: null,
  model: null,
}

/**
 * ⚠ `content` KHÔNG có trong danh sách cột, và đó là một ràng buộc quyền riêng tư chứ không phải
 * một lựa chọn tối ưu. Nội dung tin nhắn là thứ người dùng gõ cho trợ lý — tên khách hàng, đôi khi
 * mật khẩu artifact lúc vừa tạo (xem ghi chú ở `agent-chat.repository.ts`). Một trang admin đọc
 * được hội thoại của mọi org là một quyết định của chủ sản phẩm, không phải một tiện ích mà
 * endpoint này tự nhận. Có test ghim điều này.
 */
const MESSAGE_COLUMNS = 'id, session_id, role, model, seq, created_at'

/** `in()` nhồi hết id vào query string, và PostgREST có trần độ dài URL. */
const CHUNK = 200

/**
 * Trần số **phiên** nạp về khi phải gộp trước mới sắp/lọc được.
 *
 * Hôm nay LiHi có 24 phiên, nên con số này còn rất xa. Nó tồn tại để ngày nào đó vượt thì **biết**,
 * thay vì âm thầm xếp hạng trên một phần dữ liệu — đúng lý lẽ của `VISIT_SORT_MAX_ROWS` bên
 * `admin-artifacts.service.ts`.
 */
const SESSION_SCAN_MAX = 5000

/**
 * Trần số **hàng tin nhắn** mỗi lô. Số đếm của một phiên phụ thuộc vào việc nạp đủ tin của nó, nên
 * một lần bị cắt giữa chừng sẽ ra số nhỏ hơn thật mà không có dấu hiệu gì — ghi log cảnh báo để
 * cái sai đó không im lặng.
 */
const MESSAGE_SCAN_MAX = 20000

const chunks = <T>(items: T[]) => {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += CHUNK) out.push(items.slice(i, i + CHUNK))
  return out
}

const fetchMessages = async (sessionIds: string[]) => {
  const rows: MessageRow[] = []
  for (const batch of chunks(sessionIds)) {
    const { data, error } = await agent()
      .from('agent_messages')
      .select(MESSAGE_COLUMNS)
      .in('session_id', batch)
      .order('seq', { ascending: true })
      .range(0, MESSAGE_SCAN_MAX - 1)
    if (error) throw error
    const got = (data ?? []) as unknown as MessageRow[]
    if (got.length >= MESSAGE_SCAN_MAX) {
      log.warn(
        { cap: MESSAGE_SCAN_MAX, sessions: batch.length },
        'message scan hit cap; per-session counts may be understated'
      )
    }
    rows.push(...got)
  }
  return rows
}

const fetchToolCalls = async (messageIds: string[]) => {
  const rows: ToolCallRow[] = []
  for (const batch of chunks(messageIds)) {
    const { data, error } = await agent()
      .from('agent_tool_calls')
      .select('message_id, tool_name, status')
      .in('message_id', batch)
    if (error) throw error
    rows.push(...((data ?? []) as unknown as ToolCallRow[]))
  }
  return rows
}

/**
 * Số đếm cho từng phiên.
 *
 * Gộp **trong bộ nhớ** chứ không `group by` dưới SQL: PostgREST không có `group by`, và thêm một
 * view chỉ cho trang admin này là thêm một migration vào schema đang chạy đường chat thật. Quy mô
 * hiện tại (108 tin, 30 lời gọi tool) không cần tới nó; `MESSAGE_SCAN_MAX` là chỗ sẽ kêu khi cần.
 */
const buildAggregates = async (sessionIds: string[]) => {
  const out = new Map<string, Aggregate>()
  if (sessionIds.length === 0) return out
  for (const id of sessionIds) out.set(id, { ...EMPTY_AGGREGATE })

  const messages = await fetchMessages(sessionIds)

  /** Lời gọi tool nối vào `message_id`, nên cần đường về phiên qua bảng tin nhắn. */
  const sessionOfMessage = new Map<string, string>()
  /** `seq` của tin nhắn đã cho ra `model`, để biết cái nào mới hơn. */
  const modelSeq = new Map<string, number>()

  for (const m of messages) {
    const agg = out.get(m.session_id)
    if (!agg) continue
    sessionOfMessage.set(m.id, m.session_id)

    agg.message_count += 1
    if (m.role === 'user') agg.user_message_count += 1
    if (!agg.last_message_at || m.created_at > agg.last_message_at) {
      agg.last_message_at = m.created_at
    }
    // Model của tin nhắn GẦN NHẤT có model: chỉ tin `user` là không có model, và một phiên có thể
    // đã đổi model giữa đường — lấy cái cũ sẽ nói sai cái đang dùng.
    if (m.model && m.seq >= (modelSeq.get(m.session_id) ?? -Infinity)) {
      modelSeq.set(m.session_id, m.seq)
      agg.model = m.model
    }
  }

  const toolCalls = await fetchToolCalls([...sessionOfMessage.keys()])
  /**
   * Đếm **cả gọi lẫn lỗi** cho từng tool trong từng phiên.
   *
   * Bản đầu chỉ đếm lỗi, và nó không trả lời được câu duy nhất đáng hỏi về một tool hỏng: hỏng
   * *toàn phần* hay hỏng *thỉnh thoảng*. Mẫu số rẻ — cùng một vòng lặp, cùng một lượt truy vấn.
   */
  const tallies = new Map<string, Map<string, { calls: number; errors: number }>>()

  for (const call of toolCalls) {
    const sessionId = sessionOfMessage.get(call.message_id)
    if (!sessionId) continue
    const agg = out.get(sessionId)
    if (!agg) continue

    const isError = call.status === 'error'
    agg.tool_call_count += 1
    if (isError) agg.tool_error_count += 1

    const perTool = tallies.get(sessionId) ?? new Map<string, { calls: number; errors: number }>()
    const tally = perTool.get(call.tool_name) ?? { calls: 0, errors: 0 }
    tally.calls += 1
    if (isError) tally.errors += 1
    perTool.set(call.tool_name, tally)
    tallies.set(sessionId, perTool)
  }

  for (const [sessionId, perTool] of tallies) {
    const agg = out.get(sessionId)
    if (!agg) continue
    // Chỉ xét tool CÓ lỗi: không lọc thì một tool chạy ok 20 lần sẽ được gọi là "top failing".
    const failing = [...perTool.entries()].filter(([, t]) => t.errors > 0)
    if (failing.length === 0) continue
    // Hoà thì lấy tên nhỏ hơn theo thứ tự chữ — không có mốc phụ thì cùng một dữ liệu cho ra hai
    // kết quả khác nhau giữa hai lần tải, và người đọc tưởng số liệu nhảy.
    failing.sort((a, b) => b[1].errors - a[1].errors || a[0].localeCompare(b[0]))
    const [name, tally] = failing[0]
    agg.top_failing_tool = { name, errors: tally.errors, calls: tally.calls }
  }

  return out
}

const fetchOrgNames = async (orgIds: string[]) => {
  const out = new Map<string, string | null>()
  for (const batch of chunks([...new Set(orgIds)])) {
    const { data, error } = await supabaseService
      .from('organizations')
      .select('id, name')
      .in('id', batch)
    if (error) throw error
    for (const row of data ?? []) out.set(row.id as string, row.name ?? null)
  }
  return out
}

type Profile = { email: string | null; name: string | null; display_name: string | null }

const fetchProfiles = async (userIds: string[]) => {
  const out = new Map<string, Profile>()
  for (const batch of chunks([...new Set(userIds)])) {
    const { data, error } = await supabaseService
      .from('profiles')
      .select('id, email, name, display_name')
      .in('id', batch)
    if (error) throw error
    for (const row of data ?? []) {
      out.set(row.id as string, {
        email: row.email ?? null,
        name: row.name ?? null,
        display_name: row.display_name ?? null,
      })
    }
  }
  return out
}

const applyFilters = (query: any, p: ListConversationsParams) => {
  if (p.organizationId) query = query.eq('org_id', p.organizationId)
  /**
   * ⛔ KHÔNG tìm theo `title`. Bản đầu có `ilike('title', …)` kèm lập luận "đó là thứ duy nhất
   * tìm được mà không phải mở nội dung ra" — lập luận đó không đứng: tìm được nghĩa là **dò
   * được**. Gõ thử vài từ rồi xem phiên nào khớp là đọc được nội dung, chậm hơn nhưng vẫn đọc.
   *
   * Trường duy nhất còn đáng lọc là tổ chức, và `organization_id` đã làm việc đó chính xác hơn
   * một ô tìm kiếm. Ngày nào chủ sản phẩm quyết cho xem nội dung thì mở lại cả hai cùng lúc.
   */
  if (p.range) {
    // Nửa mở, KHÔNG `BETWEEN`: `to` là ngày trần nên `BETWEEN` dừng ở nửa đêm và mất cả ngày cuối.
    query = query.gte('created_at', p.range.from).lt('created_at', p.range.toExclusive)
  }
  return query
}

/**
 * ⛔ KHÔNG có `title`. Nó là **120 ký tự đầu của tin nhắn đầu tiên, cắt thô** — xem
 * `agent-chat.repository.ts:245` (`firstMessage.trim().slice(0, 120)`). Không phải model tóm tắt.
 *
 * Nên xin nó ở đây là xin nội dung người dùng dưới một cái tên khác, và sẽ vô hiệu hoá đúng cái
 * quyết định mà endpoint này được dựng để tôn trọng. Đo trên LiHi: 17/24 title dài hơn 30 ký tự,
 * dài nhất 91 — tức một câu đầy đủ.
 *
 * ⛔ Và không có `status`: `agent_sessions.status` là `text NOT NULL DEFAULT 'active'` không kèm
 * CHECK, và không code nào trong repo ghi giá trị khác. Một cột chỉ có một giá trị vĩnh viễn.
 */
const SESSION_COLUMNS = 'id, org_id, user_id, created_at'

const toSummary = (
  s: SessionRow,
  agg: Aggregate,
  orgNames: Map<string, string | null>,
  profiles: Map<string, Profile>
): ConversationSummary => {
  const profile = profiles.get(s.user_id)
  return {
    session_id: s.id,
    session_short_id: s.id.slice(0, 8),
    created_at: s.created_at,
    organization_id: s.org_id,
    organization_name: orgNames.get(s.org_id) ?? null,
    user_id: s.user_id,
    user_email: profile?.email ?? null,
    user_name: profile?.display_name?.trim() || profile?.name || null,
    ...agg,
  }
}

/** Phiên rỗng (chưa có tin nào) phải ra 0 chứ không `undefined` — `undefined` lọt thẳng ra JSON. */
const aggregateOf = (map: Map<string, Aggregate>, sessionId: string) =>
  map.get(sessionId) ?? { ...EMPTY_AGGREGATE }

const decorate = async (sessions: SessionRow[], aggregates: Map<string, Aggregate>) => {
  if (sessions.length === 0) return []
  const [orgNames, profiles] = await Promise.all([
    fetchOrgNames(sessions.map((s) => s.org_id)),
    fetchProfiles(sessions.map((s) => s.user_id)),
  ])
  return sessions.map((s) => toSummary(s, aggregateOf(aggregates, s.id), orgNames, profiles))
}

const compare = (a: Aggregate, b: Aggregate, field: ConversationSortField) => {
  if (field === 'last_message_at') {
    // Phiên chưa có tin nào xếp dưới cùng theo nghĩa "ít hoạt động nhất".
    return (a.last_message_at ?? '').localeCompare(b.last_message_at ?? '')
  }
  if (field === 'message_count') return a.message_count - b.message_count
  if (field === 'tool_call_count') return a.tool_call_count - b.tool_call_count
  if (field === 'tool_error_count') return a.tool_error_count - b.tool_error_count
  return 0
}

/**
 * `GET /api/admin/agent-conversations` — một hàng là một **phiên** chat.
 *
 * Hai đường, cùng lý lẽ với `listArtifacts`:
 *
 * - Sắp theo `created_at` và KHÔNG lọc theo lỗi tool: cột nằm ngay trên `agent_sessions`,
 *   nên sắp và phân trang **trong SQL**, rồi chỉ gộp số đếm cho đúng một trang. Đúng ở mọi quy mô.
 * - Còn lại (sắp theo số đếm, hoặc lọc "chỉ phiên có lỗi"): phải gộp xong mới biết thứ tự và biết
 *   hàng nào còn lại, nên nạp tập đã lọc rồi xử trong bộ nhớ, có trần `SESSION_SCAN_MAX`.
 */
export const listConversations = async (p: ListConversationsParams) => {
  const ascending = p.sortOrder === 'asc'
  const offset = (p.page - 1) * p.limit

  if (SQL_SORT_FIELDS.includes(p.sortBy) && !p.onlyToolErrors) {
    const query = applyFilters(
      agent().from('agent_sessions').select(SESSION_COLUMNS, { count: 'exact' }),
      p
    )
      .order(p.sortBy, { ascending })
      .range(offset, offset + p.limit - 1)

    const { data, error, count } = await query
    if (error) throw error

    const sessions = (data ?? []) as unknown as SessionRow[]
    const aggregates = await buildAggregates(sessions.map((s) => s.id))
    return { data: await decorate(sessions, aggregates), total: count ?? 0 }
  }

  const query = applyFilters(
    agent().from('agent_sessions').select(SESSION_COLUMNS, { count: 'exact' }),
    p
  )
    .order('created_at', { ascending: false })
    .range(0, SESSION_SCAN_MAX - 1)

  const { data, error, count } = await query
  if (error) throw error

  const sessions = (data ?? []) as unknown as SessionRow[]
  if ((count ?? 0) > SESSION_SCAN_MAX) {
    log.warn(
      { total: count, cap: SESSION_SCAN_MAX, sortBy: p.sortBy, onlyToolErrors: p.onlyToolErrors },
      'conversation listing exceeded in-memory cap; ranking covers newest sessions only'
    )
  }

  const aggregates = await buildAggregates(sessions.map((s) => s.id))

  const kept = p.onlyToolErrors
    ? sessions.filter((s) => aggregateOf(aggregates, s.id).tool_error_count > 0)
    : sessions

  const sorted = [...kept].sort((a, b) => {
    const diff = compare(aggregateOf(aggregates, a.id), aggregateOf(aggregates, b.id), p.sortBy)
    if (diff !== 0) return ascending ? diff : -diff
    // Mốc phụ: phiên mới trước. Thiếu nó thì thứ tự giữa các hàng cùng 0 đổi mỗi lần tải.
    return b.created_at.localeCompare(a.created_at)
  })

  /**
   * Lọc theo lỗi tool thì `total` là số hàng **sau khi lọc**, không phải `count` của SQL: `count`
   * đếm trước khi gộp nên nó sẽ nói có nhiều trang hơn số trang thật.
   */
  const total = p.onlyToolErrors ? sorted.length : (count ?? 0)
  const page = sorted.slice(offset, offset + p.limit)
  return { data: await decorate(page, aggregates), total }
}
