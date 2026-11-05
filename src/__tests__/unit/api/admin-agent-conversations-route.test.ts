import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const listConversations = vi.fn()
const isCasdoorAdmin = vi.fn()
const getSession = vi.fn()
const isCasdoorDbConfigured = vi.fn(() => true)

/**
 * Chỉ thay `listConversations`, giữ nguyên phần còn lại của module: `conversation-query.ts` nhập
 * `CONVERSATION_SORT_FIELDS` **từ chính module này**, nên một mock thay cả module sẽ làm hằng đó
 * thành `undefined` và parser nổ ở `.includes` — route trả 500 vì lỗi của test, không của code.
 */
vi.mock('@/core/services/admin-conversations.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/core/services/admin-conversations.service')>()),
  listConversations: (...args: any[]) => listConversations(...args),
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

const call = async (url = 'https://app.li2.ai/api/admin/agent-conversations') => {
  const { GET } = await import('@/app/api/admin/agent-conversations/route')
  return GET(new NextRequest(url) as any, { params: {} } as any)
}

describe('GET /api/admin/agent-conversations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isCasdoorDbConfigured.mockReturnValue(true)
    getSession.mockResolvedValue({ id: 'user-1', email: 'an@example.com' })
    isCasdoorAdmin.mockResolvedValue(true)
    listConversations.mockResolvedValue({ data: [], total: 0 })
  })

  it('người không phải admin bị chặn 403, và service không hề được gọi', async () => {
    isCasdoorAdmin.mockResolvedValue(false)
    const res = await call()
    expect(res.status).toBe(403)
    expect(listConversations).not.toHaveBeenCalled()
  })

  it('chưa đăng nhập thì không qua được', async () => {
    getSession.mockResolvedValue(null)
    const res = await call()
    expect(res.status).toBe(401)
    expect(listConversations).not.toHaveBeenCalled()
  })

  it('tra quyền admin hỏng ≠ có quyền', async () => {
    isCasdoorAdmin.mockRejectedValue(new Error('casdoor down'))
    const res = await call()
    expect(res.status).toBe(503)
    expect(listConversations).not.toHaveBeenCalled()
  })

  it('admin: trả hình dạng một lớp kèm page/limit đã chuẩn hoá', async () => {
    listConversations.mockResolvedValue({ data: [{ session_id: 'ses-1' }], total: 7 })
    const res = await call(
      'https://app.li2.ai/api/admin/agent-conversations?page=0&limit=100000&sort_by=xyz'
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({
      data: [{ session_id: 'ses-1' }],
      total: 7,
      // Tham số rác đã bị kẹp — bên gọi đối chiếu được cái nhận với cái xin.
      page: 1,
      limit: 100,
    })
    expect(listConversations).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 100, sortBy: 'created_at' })
    )
  })

  it('has_tool_errors đi xuống tới service', async () => {
    await call('https://app.li2.ai/api/admin/agent-conversations?has_tool_errors=true')
    expect(listConversations).toHaveBeenCalledWith(
      expect.objectContaining({ onlyToolErrors: true })
    )
  })

  it('service ném lỗi → 500 có thông điệp, không rò chi tiết nội bộ', async () => {
    listConversations.mockRejectedValue(new Error('schema must be one of the following: public'))
    const res = await call()
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Could not load conversations')
    expect(JSON.stringify(body)).not.toContain('schema must be one of')
  })

  it('OPTIONS trả 204 kèm header CORS cho origin được phép', async () => {
    const { OPTIONS } = await import('@/app/api/admin/agent-conversations/route')
    const req = new NextRequest('https://app.li2.ai/api/admin/agent-conversations', {
      method: 'OPTIONS',
      headers: { origin: 'http://localhost:3000' },
    })
    const res = await OPTIONS(req as any, { params: {} } as any)
    expect(res.status).toBe(204)
    expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:3000')
  })
})
