import { describe, it, expect, beforeEach, vi } from 'vitest'

import {
  listConversations,
  type ListConversationsParams,
} from '@/core/services/admin-conversations.service'

/**
 * Giả lập PostgREST bằng một builder chạy trên bảng trong bộ nhớ, thay vì lồng `vi.fn(() => …)`
 * mấy tầng.
 *
 * Lý do quan trọng hơn sự gọn: fake này **chiếu đúng danh sách cột** mà service xin. Nên nếu một
 * ngày nào đó service thêm `content` vào `select`, nội dung tin nhắn sẽ *thật sự* chảy ra và test
 * "không rò content" ở dưới bắt được. Một mock trả sẵn hàng đã dọn sạch thì không bắt được gì.
 */
type Row = Record<string, any>

/** Cột mà mỗi bảng đã được `select` ở lần gọi gần nhất — để ghim ràng buộc quyền riêng tư. */
const selectedColumns = new Map<string, string>()

const data: Record<string, Row[]> = {}

const compareValues = (a: any, b: any) => {
  if (a === b) return 0
  if (a === null || a === undefined) return -1
  if (b === null || b === undefined) return 1
  return a < b ? -1 : 1
}

const project = (rows: Row[], columns: string) => {
  const cols = columns
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean)
  return rows.map((row) => Object.fromEntries(cols.map((c) => [c, row[c] ?? null])))
}

const makeQuery = (table: string) => {
  let rows = [...(data[table] ?? [])]
  let columns = '*'
  let wantCount = false
  let total: number | null = null

  const builder: any = {
    select(cols: string, opts?: { count?: string }) {
      columns = cols
      wantCount = Boolean(opts?.count)
      selectedColumns.set(table, cols)
      return builder
    },
    eq(col: string, value: any) {
      rows = rows.filter((r) => r[col] === value)
      return builder
    },
    in(col: string, values: any[]) {
      rows = rows.filter((r) => values.includes(r[col]))
      return builder
    },
    ilike(col: string, pattern: string) {
      const needle = pattern.replace(/%/g, '').toLowerCase()
      rows = rows.filter((r) => typeof r[col] === 'string' && r[col].toLowerCase().includes(needle))
      return builder
    },
    gte(col: string, value: any) {
      rows = rows.filter((r) => r[col] >= value)
      return builder
    },
    lt(col: string, value: any) {
      rows = rows.filter((r) => r[col] < value)
      return builder
    },
    order(col: string, opts?: { ascending?: boolean }) {
      const dir = opts?.ascending === false ? -1 : 1
      rows = [...rows].sort((a, b) => compareValues(a[col], b[col]) * dir)
      return builder
    },
    range(from: number, to: number) {
      // `count: 'exact'` của PostgREST đếm TRƯỚC khi cắt trang — giữ đúng tính chất đó.
      total = rows.length
      rows = rows.slice(from, to + 1)
      return builder
    },
    then(resolve: any, reject?: any) {
      const result = {
        data: project(rows, columns),
        error: null,
        count: wantCount ? (total ?? rows.length) : null,
      }
      return Promise.resolve(result).then(resolve, reject)
    },
  }
  return builder
}

vi.mock('@/infrastructure/database/supabase', () => ({
  supabaseService: {
    from: (table: string) => makeQuery(table),
    schema: () => ({ from: (table: string) => makeQuery(table) }),
  },
}))

vi.mock('@/infrastructure/logging/logger', () => ({
  logger: { child: () => ({ warn: vi.fn(), error: vi.fn(), info: vi.fn() }) },
}))

const SESSION_1 = 'ses-1'
const SESSION_2 = 'ses-2'
const SESSION_EMPTY = 'ses-3'

const seed = () => {
  data.organizations = [
    { id: 'org-a', name: 'Acme' },
    { id: 'org-b', name: 'Beta' },
  ]
  data.profiles = [
    { id: 'user-1', email: 'an@example.com', name: 'An Nguyen', display_name: 'An' },
    { id: 'user-2', email: 'binh@example.com', name: 'Binh', display_name: null },
  ]
  data.agent_sessions = [
    {
      id: SESSION_1,
      org_id: 'org-a',
      user_id: 'user-1',
      title: 'tìm top link tuần này',
      status: 'active',
      created_at: '2026-10-28T10:00:00Z',
    },
    {
      id: SESSION_2,
      org_id: 'org-a',
      user_id: 'user-1',
      title: 'tạo artifact menu',
      status: 'active',
      created_at: '2026-10-29T10:00:00Z',
    },
    {
      id: SESSION_EMPTY,
      org_id: 'org-b',
      user_id: 'user-2',
      title: null,
      status: 'active',
      created_at: '2026-10-30T10:00:00Z',
    },
  ]
  data.agent_messages = [
    {
      id: 'msg-1',
      session_id: SESSION_1,
      role: 'user',
      content: 'MẬT KHẨU LÀ hunter2',
      model: null,
      seq: 1,
      created_at: '2026-10-28T10:00:00Z',
    },
    {
      id: 'msg-2',
      session_id: SESSION_1,
      role: 'assistant',
      content: 'đây là top link',
      model: 'claude-opus-5',
      seq: 2,
      created_at: '2026-10-28T10:00:05Z',
    },
    {
      id: 'msg-3',
      session_id: SESSION_1,
      role: 'user',
      content: 'còn tuần trước',
      model: null,
      seq: 3,
      created_at: '2026-10-28T10:01:00Z',
    },
    {
      id: 'msg-4',
      session_id: SESSION_1,
      role: 'assistant',
      content: 'đây',
      model: 'claude-sonnet-5',
      seq: 4,
      created_at: '2026-10-28T10:01:30Z',
    },
    {
      id: 'msg-5',
      session_id: SESSION_2,
      role: 'user',
      content: 'tạo giúp tôi một artifact',
      model: null,
      seq: 1,
      created_at: '2026-10-29T10:00:00Z',
    },
    {
      id: 'msg-6',
      session_id: SESSION_2,
      role: 'assistant',
      content: 'đã tạo',
      model: 'claude-opus-5',
      seq: 2,
      created_at: '2026-10-29T10:00:20Z',
    },
  ]
  data.agent_tool_calls = [
    { id: 'tc-1', message_id: 'msg-2', tool_name: 'get_top_links_ide', status: 'error' },
    { id: 'tc-2', message_id: 'msg-2', tool_name: 'get_top_links_ide', status: 'error' },
    { id: 'tc-3', message_id: 'msg-2', tool_name: 'list_orgs', status: 'ok' },
    { id: 'tc-4', message_id: 'msg-4', tool_name: 'get_top_links', status: 'ok' },
    { id: 'tc-5', message_id: 'msg-6', tool_name: 'publish_artifact', status: 'ok' },
  ]
}

const params = (over: Partial<ListConversationsParams> = {}): ListConversationsParams => ({
  page: 1,
  limit: 20,
  sortBy: 'created_at',
  sortOrder: 'desc',
  onlyToolErrors: false,
  ...over,
})

const byId = (rows: any[], id: string) => rows.find((r) => r.session_id === id)

describe('listConversations', () => {
  beforeEach(() => {
    seed()
    selectedColumns.clear()
  })

  it('đếm đúng tin nhắn, lời gọi tool và lỗi tool của một phiên', async () => {
    const { data: rows, total } = await listConversations(params())

    expect(total).toBe(3)
    expect(byId(rows, SESSION_1)).toMatchObject({
      session_id: SESSION_1,
      organization_id: 'org-a',
      organization_name: 'Acme',
      user_id: 'user-1',
      user_email: 'an@example.com',
      user_name: 'An',
      message_count: 4,
      user_message_count: 2,
      last_message_at: '2026-10-28T10:01:30Z',
      tool_call_count: 4,
      tool_error_count: 2,
    })
  })

  describe('⭐ top_failing_tool có MẪU SỐ — hỏng toàn phần khác hỏng chập chờn', () => {
    it('tool lỗi mọi lần được gọi → errors bằng calls', async () => {
      const { data: rows } = await listConversations(params())
      // `get_top_links_ide` trong seed: 2 lỗi / 2 gọi. Trên LiHi thật là 7/7 — cùng hình dạng:
      // tool chưa chạy nổi lần nào, tức một lỗi cấu hình sửa một lần.
      expect(byId(rows, SESSION_1)!.top_failing_tool).toEqual({
        name: 'get_top_links_ide',
        errors: 2,
        calls: 2,
      })
    })

    it('tool thỉnh thoảng lỗi → calls LỚN HƠN errors, không bị làm tròn thành "hỏng"', async () => {
      // Dựng riêng ca chập chờn trên SESSION_2, thay vì nhồi vào seed chung: ca "toàn phần" ở trên
      // chỉ còn nghĩa khi nó đứng cạnh một ca có mẫu số khác.
      data.agent_tool_calls.push(
        { id: 'tc-6', message_id: 'msg-6', tool_name: 'publish_draft_artifact', status: 'error' },
        { id: 'tc-7', message_id: 'msg-6', tool_name: 'publish_draft_artifact', status: 'ok' },
        { id: 'tc-8', message_id: 'msg-6', tool_name: 'publish_draft_artifact', status: 'ok' }
      )

      const { data: rows } = await listConversations(params())
      expect(byId(rows, SESSION_2)).toMatchObject({
        tool_call_count: 4,
        tool_error_count: 1,
        top_failing_tool: { name: 'publish_draft_artifact', errors: 1, calls: 3 },
      })
    })

    it('tool chạy ok nhiều lần KHÔNG bị gọi là top failing, dù gọi nhiều nhất', async () => {
      data.agent_tool_calls.push(
        { id: 'tc-6', message_id: 'msg-4', tool_name: 'list_orgs', status: 'ok' },
        { id: 'tc-7', message_id: 'msg-4', tool_name: 'list_orgs', status: 'ok' },
        { id: 'tc-8', message_id: 'msg-4', tool_name: 'list_orgs', status: 'ok' }
      )

      const { data: rows } = await listConversations(params())
      // `list_orgs` giờ 4 lần gọi, 0 lỗi; `get_top_links_ide` chỉ 2 lần nhưng lỗi cả 2.
      expect(byId(rows, SESSION_1)!.top_failing_tool!.name).toBe('get_top_links_ide')
    })

    it('hoà số lỗi thì chốt theo thứ tự chữ, để hai lần tải không ra hai kết quả', async () => {
      data.agent_tool_calls.push({
        id: 'tc-6',
        message_id: 'msg-2',
        tool_name: 'aaa_tool',
        status: 'error',
      })
      data.agent_tool_calls.push({
        id: 'tc-7',
        message_id: 'msg-2',
        tool_name: 'aaa_tool',
        status: 'error',
      })

      const { data: rows } = await listConversations(params())
      expect(byId(rows, SESSION_1)!.top_failing_tool).toEqual({
        name: 'aaa_tool',
        errors: 2,
        calls: 2,
      })
    })
  })

  it('session_short_id là 8 ký tự đầu của session_id, và session_id đầy đủ vẫn còn', async () => {
    data.agent_sessions = [
      {
        id: '7f3a9c21-4b5e-4f0a-9d8c-1e2f3a4b5c6d',
        org_id: 'org-a',
        user_id: 'user-1',
        title: 'không được trả ra',
        status: 'active',
        created_at: '2026-10-28T10:00:00Z',
      },
    ]

    const { data: rows } = await listConversations(params())
    expect(rows[0]).toMatchObject({
      session_id: '7f3a9c21-4b5e-4f0a-9d8c-1e2f3a4b5c6d',
      session_short_id: '7f3a9c21',
    })
  })

  it('model là model của tin nhắn gần nhất có model, không phải tin đầu', async () => {
    const { data: rows } = await listConversations(params())
    expect(byId(rows, SESSION_1)!.model).toBe('claude-sonnet-5')
    expect(byId(rows, SESSION_2)!.model).toBe('claude-opus-5')
  })

  it('phiên không có tin nhắn nào → không vỡ, mọi số đếm là 0', async () => {
    const { data: rows } = await listConversations(params())
    expect(byId(rows, SESSION_EMPTY)).toMatchObject({
      message_count: 0,
      user_message_count: 0,
      last_message_at: null,
      tool_call_count: 0,
      tool_error_count: 0,
      top_failing_tool: null,
      model: null,
      organization_name: 'Beta',
      // `display_name` rỗng thì lùi về `name`, không trả chuỗi trắng.
      user_name: 'Binh',
    })
  })

  it('phiên không có lời gọi tool lỗi → top_failing_tool là null, không phải tool đã chạy ok', async () => {
    const { data: rows } = await listConversations(params())
    expect(byId(rows, SESSION_2)).toMatchObject({
      tool_call_count: 1,
      tool_error_count: 0,
      top_failing_tool: null,
    })
  })

  describe('KHÔNG rò nội dung tin nhắn — ràng buộc quyền riêng tư, không phải ý thích', () => {
    it('không hàng nào mang khoá content (hay bất cứ khoá nào chứa "content")', async () => {
      const { data: rows } = await listConversations(params())
      expect(rows).toHaveLength(3)
      for (const row of rows) {
        expect(Object.keys(row).some((k) => k.toLowerCase().includes('content'))).toBe(false)
      }
      expect(JSON.stringify(rows)).not.toContain('hunter2')
    })

    it('câu select của agent_messages không hề xin cột content', async () => {
      await listConversations(params())
      expect(selectedColumns.get('agent_messages')).toBeDefined()
      expect(selectedColumns.get('agent_messages')).not.toContain('content')
    })

    it('agent_tool_calls chỉ xin tên và trạng thái — input/output là dữ liệu người dùng', async () => {
      await listConversations(params())
      const cols = selectedColumns.get('agent_tool_calls') ?? ''
      expect(cols).toContain('tool_name')
      expect(cols).not.toContain('input')
      expect(cols).not.toContain('output')
    })

    /**
     * ⭐ Ghim trên **response**, không chỉ trên câu select.
     *
     * `title` là nội dung người dùng dưới một cái tên khác (`firstMessage.trim().slice(0, 120)` ở
     * `agent-chat.repository.ts:245`), nên nó thuộc đúng chỗ này chứ không phải mục "sạch kiểu dữ
     * liệu". Seed cố tình để `title` có thật trong bảng: nếu ai select nó trở lại, nó sẽ chảy ra
     * và test này vỡ — khác với một mock đã dọn sẵn, vốn không bắt được gì.
     */
    it('⭐ không hàng nào mang title hay status, dù bảng có cả hai cột', async () => {
      const { data: rows } = await listConversations(params())
      expect(rows).toHaveLength(3)
      for (const row of rows) {
        expect(row).not.toHaveProperty('title')
        expect(row).not.toHaveProperty('status')
      }
      expect(JSON.stringify(rows)).not.toContain('tìm top link tuần này')
      expect(JSON.stringify(rows)).not.toContain('tạo artifact menu')
    })
  })

  describe('lọc', () => {
    it('has_tool_errors chỉ giữ phiên có lỗi, và total là số hàng sau khi lọc', async () => {
      const { data: rows, total } = await listConversations(params({ onlyToolErrors: true }))
      expect(rows.map((r) => r.session_id)).toEqual([SESSION_1])
      expect(total).toBe(1)
    })

    it('organization_id', async () => {
      const { data: rows, total } = await listConversations(params({ organizationId: 'org-b' }))
      expect(rows.map((r) => r.session_id)).toEqual([SESSION_EMPTY])
      expect(total).toBe(1)
    })

    /**
     * ⭐ Không còn tìm theo tiêu đề — và đây là test GIỮ cho nó không quay lại.
     *
     * Bản đầu có `ilike('title', …)`. Nhưng `title` là 120 ký tự đầu tin nhắn của người dùng
     * (`agent-chat.repository.ts:245`), nên tìm được nghĩa là **dò được**: gõ thử vài từ rồi xem
     * phiên nào khớp là đọc được nội dung, chậm hơn nhưng vẫn đọc.
     */
    it('⭐ KHÔNG select `title` — nó là nội dung người dùng dưới tên khác', async () => {
      await listConversations(params({}))

      const cols = selectedColumns.get('agent_sessions')
      expect(cols).toBeDefined()
      expect(cols).not.toContain('title')
      expect(cols).not.toContain('status')
    })

    it('khoảng ngày nửa mở giữ được cả ngày cuối', async () => {
      const { data: rows } = await listConversations(
        params({
          range: { from: '2026-10-28', to: '2026-10-29', toExclusive: '2026-10-30' },
        })
      )
      expect(rows.map((r) => r.session_id).sort()).toEqual([SESSION_1, SESSION_2])
    })
  })

  describe('sắp xếp', () => {
    it('created_at desc là mặc định', async () => {
      const { data: rows } = await listConversations(params())
      expect(rows.map((r) => r.session_id)).toEqual([SESSION_EMPTY, SESSION_2, SESSION_1])
    })

    it('tool_error_count desc đưa phiên lỗi lên đầu', async () => {
      const { data: rows } = await listConversations(params({ sortBy: 'tool_error_count' }))
      expect(rows[0].session_id).toBe(SESSION_1)
    })

    it('message_count asc', async () => {
      const { data: rows } = await listConversations(
        params({ sortBy: 'message_count', sortOrder: 'asc' })
      )
      expect(rows.map((r) => r.message_count)).toEqual([0, 2, 4])
    })

    it('last_message_at desc xếp phiên rỗng xuống cuối', async () => {
      const { data: rows } = await listConversations(params({ sortBy: 'last_message_at' }))
      expect(rows.map((r) => r.session_id)).toEqual([SESSION_2, SESSION_1, SESSION_EMPTY])
    })
  })

  describe('phân trang', () => {
    it('đường SQL: limit 1 page 2', async () => {
      const { data: rows, total } = await listConversations(params({ page: 2, limit: 1 }))
      expect(rows.map((r) => r.session_id)).toEqual([SESSION_2])
      expect(total).toBe(3)
    })

    it('đường gộp trong bộ nhớ: limit 1 page 3', async () => {
      const { data: rows, total } = await listConversations(
        params({ page: 3, limit: 1, sortBy: 'message_count', sortOrder: 'asc' })
      )
      expect(rows.map((r) => r.message_count)).toEqual([4])
      expect(total).toBe(3)
    })

    it('trang vượt quá dữ liệu → rỗng, không vỡ', async () => {
      const { data: rows, total } = await listConversations(params({ page: 99 }))
      expect(rows).toEqual([])
      expect(total).toBe(3)
    })
  })

  it('không có phiên nào thì trả rỗng mà không gọi tiếp', async () => {
    data.agent_sessions = []
    const { data: rows, total } = await listConversations(params())
    expect(rows).toEqual([])
    expect(total).toBe(0)
  })
})
