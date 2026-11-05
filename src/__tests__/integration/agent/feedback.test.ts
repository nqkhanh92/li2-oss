import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * `POST /api/agent/feedback` — ghi 👍/👎 cho một lượt.
 *
 * ★ Route này ra đời để sửa một **lỗi im lặng**: nút 👍/👎 đã có trong giao diện và vẫn gửi tới
 * `/feedback` — endpoint của li2-ai, dịch vụ Python nay không còn. Người dùng bấm, thấy nút sáng
 * rồi tắt, và không có gì báo là nó không được lưu. Một đường phản hồi im lặng tệ hơn không có
 * đường nào, vì nó khiến người ta tưởng đã góp ý.
 *
 * Ba thứ được khoá ở đây, mỗi thứ sửa một cách vỡ khác nhau:
 *   1. **201, không phải 200** — client kiểm đúng mã đó;
 *   2. **phiên phải thuộc về người gửi** — và phép kiểm KHÔNG được tạo phiên mới;
 *   3. **đổi ý là cập nhật, không phải thêm hàng** — `unique(turn_id, user_id)` sẽ chặn.
 */

const repoMock = vi.hoisted(() => ({
  sessionBelongsTo: vi.fn(),
  upsertFeedback: vi.fn(),
  getOrCreateSession: vi.fn(),
}))
vi.mock('@/core/repositories/agent-chat.repository', () => ({
  agentChatRepository: repoMock,
}))

vi.mock('@/shared/lib/middlewares/with-agent-auth', () => ({
  withAgentAuth:
    (_scopes: string[], handler: any) =>
    async (req: any) =>
      handler(req, {
        params: {},
        context: { userId: USER, email: 'a@b.c', role: 'agent', requestId: 'r' },
        agent: { orgId: ORG, scopes: ['read', 'write'], surface: 'chat' },
      }),
}))

const ORG = '11111111-1111-4111-8111-111111111111'
const USER = '22222222-2222-4222-8222-222222222222'
const SESSION = '33333333-3333-4333-8333-333333333333'
const TURN = '44444444-4444-4444-8444-444444444444'

const { POST } = await import('@/app/api/agent/feedback/route')

const call = (body: unknown) =>
  POST(
    { json: async () => body } as any,
    { params: {} } as any
  )

beforeEach(() => {
  vi.clearAllMocks()
  repoMock.sessionBelongsTo.mockResolvedValue(true)
  repoMock.upsertFeedback.mockResolvedValue(undefined)
})

describe('ghi đánh giá', () => {
  /**
   * ⭐ `sendFeedback` kiểm đúng `res?.status === 201` và coi mọi mã khác là thất bại. Đổi sang 200
   * sẽ làm nút im lặng hỏng lại theo đúng cách nó vừa hỏng — và server vẫn báo thành công, nên
   * không log nào ở phía này thấy được.
   */
  it('⭐ trả 201, không phải 200', async () => {
    const res = await call({ session_id: SESSION, turn_id: TURN, rating: 1 })

    expect(res.status).toBe(201)
  })

  it('ghi đúng rating, org và user LẤY TỪ TOKEN', async () => {
    await call({ session_id: SESSION, turn_id: TURN, rating: -1 })

    expect(repoMock.upsertFeedback).toHaveBeenCalledWith({
      sessionId: SESSION,
      turnId: TURN,
      orgId: ORG,
      userId: USER,
      rating: -1,
    })
  })

  it.each([1, -1])('nhận cả %s', async (rating) => {
    const res = await call({ session_id: SESSION, turn_id: TURN, rating })

    expect(res.status).toBe(201)
  })
})

describe('từ chối đầu vào sai', () => {
  const xau: [unknown, string][] = [
    [{ session_id: SESSION, turn_id: TURN, rating: 0 }, 'rating 0 không nằm trong CHECK của DB'],
    [{ session_id: SESSION, turn_id: TURN, rating: 5 }, 'rating ngoài khoảng'],
    [{ session_id: 'không-phải-uuid', turn_id: TURN, rating: 1 }, 'session_id sai dạng'],
    [{ session_id: SESSION, rating: 1 }, 'thiếu turn_id'],
    [{ session_id: SESSION, turn_id: TURN, rating: 1, extra: 'x' }, 'khoá lạ — .strict()'],
    [null, 'thân rỗng'],
  ]

  it.each(xau)('400 cho %j (%s)', async (body) => {
    const res = await call(body)

    expect(res.status).toBe(400)
    expect(repoMock.upsertFeedback).not.toHaveBeenCalled()
  })

  /**
   * `rating: 0` đáng được nêu riêng: nó qua được `z.number()` nếu ai đó "nới ra cho tiện", rồi vỡ ở
   * ràng buộc `agent_feedback_rating_check` của Postgres — hiện ra thành 500 thay vì 400.
   */
  it('rating 0 bị chặn ở Zod, không để Postgres chặn hộ', async () => {
    const res = await call({ session_id: SESSION, turn_id: TURN, rating: 0 })

    expect(res.status).toBe(400)
  })
})

describe('⭐ ràng phiên theo người gửi', () => {
  it('phiên của người khác thì 404 và KHÔNG ghi gì', async () => {
    repoMock.sessionBelongsTo.mockResolvedValue(false)

    const res = await call({ session_id: SESSION, turn_id: TURN, rating: 1 })

    expect(res.status).toBe(404)
    expect(repoMock.upsertFeedback).not.toHaveBeenCalled()
  })

  /**
   * ⭐ Phép kiểm phải là loại CHỈ ĐỌC. `getOrCreateSession` tạo phiên mới khi không khớp — đúng cho
   * một lượt chat, nhưng ở đây nghĩa là mỗi `session_id` bịa gửi tới sẽ đẻ ra một hàng phiên rỗng.
   */
  it('KHÔNG gọi getOrCreateSession — nó có tác dụng phụ tạo hàng', async () => {
    await call({ session_id: SESSION, turn_id: TURN, rating: 1 })

    expect(repoMock.getOrCreateSession).not.toHaveBeenCalled()
    expect(repoMock.sessionBelongsTo).toHaveBeenCalledWith(SESSION, ORG, USER)
  })

  it('404 chứ không 403 — 403 xác nhận id đó có thật', async () => {
    repoMock.sessionBelongsTo.mockResolvedValue(false)

    const res = await call({ session_id: SESSION, turn_id: TURN, rating: 1 })

    expect(res.status).not.toBe(403)
    expect(res.status).toBe(404)
  })
})
