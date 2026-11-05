import { describe, it, expect, beforeEach, vi } from 'vitest'

import { getConversationMessages } from '@/core/services/admin-conversation-detail.service'

/**
 * Cùng khuôn fake PostgREST với `admin-conversations.service.test.ts`: builder chạy trên bảng trong
 * bộ nhớ và **chiếu đúng danh sách cột** mà service xin.
 *
 * Chiếu cột là cả lý do khuôn này tồn tại. Seed ở dưới có `input.access.password = 'hunter2'` **thật
 * trong bảng**, nên nếu ai thêm `input` vào `TOOL_CALL_COLUMNS` thì mật khẩu sẽ *thật sự* chảy ra
 * và test ở cuối file vỡ. Một mock trả sẵn hàng đã dọn sạch thì không bắt được gì.
 */
type Row = Record<string, any>

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
  if (cols.length === 1 && cols[0] === '*') return rows.map((r) => ({ ...r }))
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
    maybeSingle() {
      return Promise.resolve({ data: project(rows, columns)[0] ?? null, error: null })
    },
    then(resolve: any, reject?: any) {
      return Promise.resolve({
        data: project(rows, columns),
        error: null,
        count: wantCount ? (total ?? rows.length) : null,
      }).then(resolve, reject)
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
  logger: {
    child: () => ({ warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() }),
  },
}))

const SESSION = '7f3a9c21-4b5e-4f0a-9d8c-1e2f3a4b5c6d'
const OTHER_SESSION = '11111111-2222-3333-4444-555555555555'

/** Mọi tin cùng một mốc thời gian, và mảng để lộn xộn — xem test "sắp theo seq". */
const SAME_MS = '2026-10-28T10:00:00.000Z'

const seed = () => {
  data.organizations = [{ id: 'org-a', name: 'Acme' }]
  data.profiles = [{ id: 'user-1', email: 'an@example.com', name: 'An Nguyen', display_name: 'An' }]
  data.agent_sessions = [
    {
      id: SESSION,
      org_id: 'org-a',
      user_id: 'user-1',
      title: 'tạo artifact có mật khẩu',
      status: 'active',
      created_at: '2026-10-28T09:59:00Z',
    },
    {
      id: OTHER_SESSION,
      org_id: 'org-a',
      user_id: 'user-1',
      title: null,
      status: 'active',
      created_at: '2026-10-28T08:00:00Z',
    },
  ]
  data.agent_messages = [
    {
      id: 'msg-3',
      session_id: SESSION,
      role: 'assistant',
      content: 'đã tạo xong, mật khẩu đã gửi riêng',
      model: 'claude-opus-5',
      seq: 3,
      turn_id: 'turn-2',
      created_at: SAME_MS,
    },
    {
      id: 'msg-1',
      session_id: SESSION,
      role: 'user',
      content: 'tạo cho tôi một artifact có mật khẩu',
      model: null,
      seq: 1,
      turn_id: 'turn-1',
      created_at: SAME_MS,
    },
    {
      id: 'msg-2',
      session_id: SESSION,
      role: 'assistant',
      content: 'được, tôi tạo ngay',
      model: 'claude-opus-5',
      seq: 2,
      turn_id: 'turn-1',
      created_at: SAME_MS,
    },
  ]
  data.agent_tool_calls = [
    {
      id: 'tc-1',
      message_id: 'msg-2',
      tool_name: 'publish_draft_artifact',
      // ⭐ Mật khẩu bản rõ, CÓ THẬT trong bảng. Đây là mồi của test chống rò ở cuối file.
      input: { slug: 'menu', access: { mode: 'password', password: 'hunter2' } },
      output: { serve_url: 'https://example.com/a/abc', secret_note: 'hunter2' },
      is_write: true,
      status: 'ok',
      confirmed_at: '2026-10-28T10:00:01Z',
      created_at: '2026-10-28T10:00:01Z',
    },
    {
      id: 'tc-2',
      message_id: 'msg-2',
      tool_name: 'get_top_links_ide',
      input: { org_id: 'org-a' },
      output: { error: 'unknown tool' },
      is_write: false,
      status: 'error',
      confirmed_at: null,
      created_at: '2026-10-28T10:00:00Z',
    },
  ]
}

const params = (over: Partial<{ page: number; limit: number }> = {}) => ({
  page: 1,
  limit: 100,
  ...over,
})

describe('getConversationMessages', () => {
  beforeEach(() => {
    seed()
    selectedColumns.clear()
  })

  it('trả phần đầu nhận dạng phiên', async () => {
    const detail = await getConversationMessages(SESSION, params())
    expect(detail!.session).toEqual({
      session_id: SESSION,
      session_short_id: '7f3a9c21',
      created_at: '2026-10-28T09:59:00Z',
      organization_id: 'org-a',
      organization_name: 'Acme',
      user_id: 'user-1',
      user_email: 'an@example.com',
      user_name: 'An',
    })
  })

  it('⭐ CÓ trả content — ca ngược với endpoint danh sách, đừng dọn theo test bên kia', async () => {
    const detail = await getConversationMessages(SESSION, params())
    expect(detail!.messages.map((m) => m.content)).toEqual([
      'tạo cho tôi một artifact có mật khẩu',
      'được, tôi tạo ngay',
      'đã tạo xong, mật khẩu đã gửi riêng',
    ])
    expect(selectedColumns.get('agent_messages')).toContain('content')
  })

  it('sắp theo seq tăng dần, KHÔNG theo created_at', async () => {
    // Cả ba tin cùng một mili-giây và mảng seed để lộn xộn (3, 1, 2). Nên nếu ai đổi sang sắp theo
    // `created_at` thì thứ tự rơi về thứ tự mảng và test này vỡ.
    const detail = await getConversationMessages(SESSION, params())
    expect(detail!.messages.map((m) => m.seq)).toEqual([1, 2, 3])
    expect(detail!.messages.map((m) => m.id)).toEqual(['msg-1', 'msg-2', 'msg-3'])
  })

  it('mỗi tin mang đủ trường, kèm lời gọi tool gắn đúng tin', async () => {
    const detail = await getConversationMessages(SESSION, params())
    const second = detail!.messages[1]

    expect(second).toMatchObject({
      id: 'msg-2',
      role: 'assistant',
      seq: 2,
      model: 'claude-opus-5',
      turn_id: 'turn-1',
      created_at: SAME_MS,
    })
    // Trong một tin, lời gọi sắp theo thời điểm gọi — `tc-2` xảy ra trước `tc-1`.
    expect(second.tool_calls).toEqual([
      {
        id: 'tc-2',
        tool_name: 'get_top_links_ide',
        status: 'error',
        is_write: false,
        confirmed_at: null,
        created_at: '2026-10-28T10:00:00Z',
      },
      {
        id: 'tc-1',
        tool_name: 'publish_draft_artifact',
        status: 'ok',
        is_write: true,
        confirmed_at: '2026-10-28T10:00:01Z',
        created_at: '2026-10-28T10:00:01Z',
      },
    ])
  })

  it('tin không có lời gọi tool nào → mảng rỗng, không undefined', async () => {
    const detail = await getConversationMessages(SESSION, params())
    expect(detail!.messages[0].tool_calls).toEqual([])
  })

  describe('⭐ KHÔNG rò input/output của lời gọi tool — mật khẩu artifact bản rõ', () => {
    it('⭐ chuỗi mật khẩu không xuất hiện ở bất cứ đâu trong response', async () => {
      const detail = await getConversationMessages(SESSION, params())
      expect(JSON.stringify(detail)).not.toContain('hunter2')
    })

    it('câu select của agent_tool_calls không xin input/output', async () => {
      await getConversationMessages(SESSION, params())
      const cols = selectedColumns.get('agent_tool_calls') ?? ''
      expect(cols).toContain('tool_name')
      expect(cols).toContain('is_write')
      expect(cols).not.toContain('input')
      expect(cols).not.toContain('output')
    })

    it('không lời gọi nào mang khoá input hay output', async () => {
      const detail = await getConversationMessages(SESSION, params())
      const calls = detail!.messages.flatMap((m) => m.tool_calls)
      expect(calls).toHaveLength(2)
      for (const call of calls) {
        expect(call).not.toHaveProperty('input')
        expect(call).not.toHaveProperty('output')
        // `message_id` là khoá nối, đã gộp vào cây nên không cần trả ra.
        expect(call).not.toHaveProperty('message_id')
      }
    })

    it('⭐ KHÔNG trả title của phiên, dù bảng có cột đó', async () => {
      const detail = await getConversationMessages(SESSION, params())
      expect(detail!.session).not.toHaveProperty('title')
      expect(detail!.session).not.toHaveProperty('status')
      expect(JSON.stringify(detail!.session)).not.toContain('tạo artifact có mật khẩu')
    })
  })

  describe('phiên không tìm thấy → null (route đổi thành 404, không 500)', () => {
    it('uuid hợp lệ nhưng không có trong bảng', async () => {
      expect(await getConversationMessages('99999999-8888-7777-6666-555555555555', params())).toBe(
        null
      )
    })

    it('id sai định dạng không được chạm tới DB — nếu không Postgres ném 22P02 và ra 500', async () => {
      expect(await getConversationMessages('khong-phai-uuid', params())).toBe(null)
      expect(await getConversationMessages('', params())).toBe(null)
      expect(await getConversationMessages('1; drop table agent_messages', params())).toBe(null)
      // Không có lượt truy vấn nào được dựng cho các id trên.
      expect(selectedColumns.has('agent_sessions')).toBe(false)
    })
  })

  it('phiên không có tin nhắn nào → mảng rỗng, total 0, không vỡ', async () => {
    const detail = await getConversationMessages(OTHER_SESSION, params())
    expect(detail!.messages).toEqual([])
    expect(detail!.total).toBe(0)
    expect(detail!.session.session_id).toBe(OTHER_SESSION)
  })

  it('chỉ trả tin của phiên được hỏi, không trộn phiên khác', async () => {
    data.agent_messages.push({
      id: 'msg-other',
      session_id: OTHER_SESSION,
      role: 'user',
      content: 'tin của phiên khác',
      model: null,
      seq: 1,
      turn_id: 'turn-x',
      created_at: SAME_MS,
    })

    const detail = await getConversationMessages(SESSION, params())
    expect(detail!.messages.map((m) => m.id)).toEqual(['msg-1', 'msg-2', 'msg-3'])
    expect(JSON.stringify(detail)).not.toContain('tin của phiên khác')
  })

  describe('phân trang', () => {
    it('total là tổng số tin của phiên, không phải số tin trong trang', async () => {
      const detail = await getConversationMessages(SESSION, params({ limit: 2 }))
      expect(detail!.messages.map((m) => m.seq)).toEqual([1, 2])
      expect(detail!.total).toBe(3)
    })

    it('trang 2', async () => {
      const detail = await getConversationMessages(SESSION, params({ page: 2, limit: 2 }))
      expect(detail!.messages.map((m) => m.seq)).toEqual([3])
      expect(detail!.total).toBe(3)
    })

    it('trang vượt quá dữ liệu → rỗng, total vẫn đúng', async () => {
      const detail = await getConversationMessages(SESSION, params({ page: 99 }))
      expect(detail!.messages).toEqual([])
      expect(detail!.total).toBe(3)
    })
  })
})
