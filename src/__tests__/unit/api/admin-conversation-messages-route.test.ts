import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const getConversationMessages = vi.fn()
const isCasdoorAdmin = vi.fn()
const getSession = vi.fn()
const isCasdoorDbConfigured = vi.fn(() => true)

/**
 * Thay cả module là an toàn ở đây: `conversation-detail-query.ts` chỉ nhập **kiểu** từ service
 * (`import type`), và kiểu bị xoá lúc biên dịch — không có hằng runtime nào để làm `undefined`.
 * Khác endpoint danh sách, nơi parser nhập `CONVERSATION_SORT_FIELDS` thật nên phải giữ bản gốc.
 */
vi.mock('@/core/services/admin-conversation-detail.service', () => ({
  getConversationMessages: (...args: any[]) => getConversationMessages(...args),
}))
vi.mock('@/core/services/casdoor-admin.service', () => ({
  isCasdoorAdmin: (...args: any[]) => isCasdoorAdmin(...args),
}))
vi.mock('@/infrastructure/database/casdoor/pool', () => ({
  isCasdoorDbConfigured: () => isCasdoorDbConfigured(),
}))
vi.mock('@/shared/lib/auth/session', () => ({
  getSession: (...args: any[]) => getSession(...args),
}))
vi.mock('@/infrastructure/logging/logger', () => ({
  logger: { child: () => ({ warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() }) },
}))

const SESSION = '7f3a9c21-4b5e-4f0a-9d8c-1e2f3a4b5c6d'

const DETAIL = {
  session: {
    session_id: SESSION,
    session_short_id: '7f3a9c21',
    created_at: '2026-10-28T09:59:00Z',
    organization_id: 'org-a',
    organization_name: 'Acme',
    user_id: 'user-1',
    user_email: 'an@example.com',
    user_name: 'An',
  },
  messages: [
    {
      id: 'msg-1',
      role: 'user',
      content: 'tạo cho tôi một artifact',
      seq: 1,
      created_at: '2026-10-28T10:00:00Z',
      model: null,
      turn_id: 'turn-1',
      tool_calls: [],
    },
  ],
  total: 1,
}

const call = async (
  sessionId = SESSION,
  search = '',
  base = 'https://app.li2.ai/api/admin/agent-conversations'
) => {
  const { GET } = await import('@/app/api/admin/agent-conversations/[session_id]/messages/route')
  const url = `${base}/${sessionId}/messages${search}`
  return GET(new NextRequest(url) as any, { params: { session_id: sessionId } } as any)
}

describe('GET /api/admin/agent-conversations/[session_id]/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isCasdoorDbConfigured.mockReturnValue(true)
    getSession.mockResolvedValue({ id: 'user-1', email: 'an@example.com' })
    isCasdoorAdmin.mockResolvedValue(true)
    getConversationMessages.mockResolvedValue(DETAIL)
  })

  describe('cổng admin', () => {
    it('người không phải admin bị chặn 403, và service không hề được gọi', async () => {
      isCasdoorAdmin.mockResolvedValue(false)
      const res = await call()
      expect(res.status).toBe(403)
      expect(getConversationMessages).not.toHaveBeenCalled()
    })

    it('chưa đăng nhập thì không qua được', async () => {
      getSession.mockResolvedValue(null)
      const res = await call()
      expect(res.status).toBe(401)
      expect(getConversationMessages).not.toHaveBeenCalled()
    })

    it('tra quyền admin hỏng ≠ có quyền', async () => {
      isCasdoorAdmin.mockRejectedValue(new Error('casdoor down'))
      const res = await call()
      expect(res.status).toBe(503)
      expect(getConversationMessages).not.toHaveBeenCalled()
    })
  })

  it('⭐ admin: trả nội dung hội thoại, kèm phần đầu và phân trang', async () => {
    const res = await call()
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body).toMatchObject({
      session: DETAIL.session,
      data: DETAIL.messages,
      total: 1,
      page: 1,
      limit: 100,
    })
    // Ca NGƯỢC với endpoint danh sách: ở đây `content` phải còn.
    expect(body.data[0].content).toBe('tạo cho tôi một artifact')
  })

  it('phiên không tồn tại → 404, KHÔNG 500', async () => {
    getConversationMessages.mockResolvedValue(null)
    const res = await call('99999999-8888-7777-6666-555555555555')
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Conversation not found')
  })

  it('id sai định dạng cũng là 404 — service tự chặn trước khi xuống DB', async () => {
    getConversationMessages.mockResolvedValue(null)
    const res = await call('khong-phai-uuid')
    expect(res.status).toBe(404)
  })

  it('session_id trên đường dẫn được chuyển nguyên xuống service', async () => {
    await call()
    expect(getConversationMessages).toHaveBeenCalledWith(SESSION, { page: 1, limit: 100 })
  })

  it('page/limit rác bị chuẩn hoá, và response nói lại giá trị đã dùng', async () => {
    const res = await call(SESSION, '?page=0&limit=99999')
    const body = await res.json()
    expect(body).toMatchObject({ page: 1, limit: 500 })
    expect(getConversationMessages).toHaveBeenCalledWith(SESSION, { page: 1, limit: 500 })
  })

  it('service ném lỗi → 500 có thông điệp, không rò chi tiết nội bộ', async () => {
    getConversationMessages.mockRejectedValue(
      new Error('schema must be one of the following: public')
    )
    const res = await call()
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Could not load conversation')
    expect(JSON.stringify(body)).not.toContain('schema must be one of')
  })

  it('OPTIONS trả 204 kèm header CORS cho origin được phép', async () => {
    const { OPTIONS } =
      await import('@/app/api/admin/agent-conversations/[session_id]/messages/route')
    const req = new NextRequest(
      `https://app.li2.ai/api/admin/agent-conversations/${SESSION}/messages`,
      {
        method: 'OPTIONS',
        headers: { origin: 'http://localhost:3000' },
      }
    )
    const res = await OPTIONS(req as any, { params: { session_id: SESSION } } as any)
    expect(res.status).toBe(204)
    expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:3000')
  })
})
