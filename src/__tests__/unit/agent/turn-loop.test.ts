import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Vòng lặp chat — `core/agent/turn.ts`.
 *
 * Bốn thứ được khoá ở đây, xếp theo cái đắt nhất nếu vỡ:
 *   1. **Xoá không bao giờ chạy ở lượt 1.** Vỡ cái này là mất dữ liệu thật, không hoàn tác được.
 *   2. **Lượt từ chối không gọi model.** Vỡ thì người bấm "Thôi" vẫn bị tính tiền, và tệ hơn, model
 *      có cơ hội làm một việc thứ ba chưa ai duyệt.
 *   3. **Vòng có lối ra.** Không có trần thì một tool hỏng lặp lại sẽ chạy vô tận.
 *   4. **Lịch sử được nạp từ DB.** Thân request chỉ chở một tin nhắn, nên quên nạp là mỗi lượt một
 *      lần mất trí nhớ — và đó là loại lỗi không ai thấy trong test thủ công một lượt.
 */

const repoMock = vi.hoisted(() => ({
  getOrCreateSession: vi.fn(),
  getHistory: vi.fn(),
  appendMessage: vi.fn(),
  recordToolCall: vi.fn(),
  setTitleIfEmpty: vi.fn(),
}))
vi.mock('@/core/repositories/agent-chat.repository', () => ({
  agentChatRepository: repoMock,
}))

const redisMock = vi.hoisted(() => ({ set: vi.fn(), get: vi.fn(), del: vi.fn() }))
vi.mock('@/infrastructure/cache/redis', () => ({ redis: redisMock }))

const callToolMock = vi.hoisted(() => vi.fn())
vi.mock('@/core/mcp/call-tool', () => ({ callToolWithAgentToken: callToolMock }))

const streamMock = vi.hoisted(() => vi.fn())
vi.mock('@/core/agent/gateway', async (orig) => {
  const actual = (await orig()) as Record<string, unknown>
  return {
    ...actual,
    gatewayClient: () => ({ chat: { completions: { create: streamMock } } }),
  }
})

const { runChatTurn } = await import('@/core/agent/turn')
const { MAX_TOOL_STEPS } = await import('@/core/agent/gateway')

const ORG = '11111111-1111-4111-8111-111111111111'
const USER = '22222222-2222-4222-8222-222222222222'
const SESSION = '33333333-3333-4333-8333-333333333333'
const TURN = '44444444-4444-4444-8444-444444444444'

/**
 * Một lượt model giả, phát luồng theo đúng hình dạng OpenAI.
 *
 * ⚠️ Mẩu `tool_calls` được chẻ CỐ Ý: `name` và `arguments` mỗi thứ chia làm hai mẩu, và hai tool
 * trộn mẩu vào nhau. Đó là hình dạng thật của luồng, và là thứ phép ghép theo `index` phải chịu
 * được — ghép theo thứ tự đến sẽ dính đuôi tool này vào tool kia.
 */
function fakeStream(chunks: unknown[]) {
  return Promise.resolve({
    async *[Symbol.asyncIterator]() {
      for (const c of chunks) yield c
    },
  })
}

const textTurn = (text: string) =>
  fakeStream([
    { choices: [{ delta: { content: text } }] },
    { choices: [{ delta: {}, finish_reason: 'stop' }] },
  ])

const toolTurn = (name: string, input: Record<string, unknown>, id = 'tu_1') =>
  fakeStream([
    {
      choices: [
        {
          delta: {
            tool_calls: [
              { index: 0, id, function: { name: name.slice(0, 3), arguments: '' } },
            ],
          },
        },
      ],
    },
    {
      choices: [
        {
          delta: {
            tool_calls: [
              { index: 0, function: { name: name.slice(3), arguments: JSON.stringify(input) } },
            ],
          },
        },
      ],
    },
    { choices: [{ delta: {}, finish_reason: 'tool_calls' }] },
  ])

function collector() {
  const frames: { event: string; data: any }[] = []
  const emit = (event: string, data: unknown) => frames.push({ event, data: data as any })
  return {
    emit,
    frames,
    names: () => frames.map((f) => f.event),
    first: (event: string) => frames.find((f) => f.event === event)?.data,
  }
}

const base = {
  sessionId: SESSION,
  turnId: TURN,
  orgId: ORG,
  userId: USER,
  token: 'tok',
  scopes: ['read', 'write'] as const,
  signal: new AbortController().signal,
}

beforeEach(() => {
  vi.clearAllMocks()
  repoMock.getOrCreateSession.mockResolvedValue(SESSION)
  repoMock.getHistory.mockResolvedValue([])
  repoMock.appendMessage.mockResolvedValue('msg-1')
  repoMock.recordToolCall.mockResolvedValue(undefined)
  repoMock.setTitleIfEmpty.mockResolvedValue(undefined)
  callToolMock.mockResolvedValue({ structuredContent: { ok: true } })
})

describe('lượt thường', () => {
  it('phát session rồi token rồi result', async () => {
    streamMock.mockReturnValueOnce(textTurn('chào bạn'))
    const c = collector()

    await runChatTurn({ ...base, input: { kind: 'message', message: 'chào' } } as any, c.emit)

    expect(c.names()).toEqual(['session', 'token', 'result'])
    expect(c.first('session').session_id).toBe(SESSION)
    expect(c.first('token').text).toBe('chào bạn')
  })

  /**
   * Thân request chỉ chở MỘT tin nhắn — giao diện không gửi lại hội thoại. Quên nạp lịch sử thì
   * trợ lý trả lời đúng ở lượt đầu và lạc đề từ lượt hai, kiểu lỗi mà thử một câu không bao giờ
   * lộ ra.
   */
  it('⭐ nạp lịch sử từ DB và đưa vào ngữ cảnh model', async () => {
    repoMock.getHistory.mockResolvedValue([
      { role: 'user', content: 'link nào nhiều lượt nhất', seq: 1 },
      { role: 'assistant', content: 'link A, 30 lượt', seq: 2 },
    ])
    streamMock.mockReturnValueOnce(textTurn('link B'))
    const c = collector()

    await runChatTurn({ ...base, input: { kind: 'message', message: 'còn thứ hai?' } } as any, c.emit)

    const sent = streamMock.mock.calls[0][0].messages
    expect(sent[0].role).toBe('system')
    expect(sent.slice(1)).toEqual([
      { role: 'user', content: 'link nào nhiều lượt nhất' },
      { role: 'assistant', content: 'link A, 30 lượt' },
      { role: 'user', content: 'còn thứ hai?' },
    ])
  })

  it('bỏ qua hàng lịch sử rỗng chữ — một lượt chỉ gọi tool không có gì để kể lại', async () => {
    repoMock.getHistory.mockResolvedValue([
      { role: 'assistant', content: '', seq: 1 },
      { role: 'assistant', content: '   ', seq: 2 },
      { role: 'tool', content: 'kết quả', seq: 3 },
    ])
    streamMock.mockReturnValueOnce(textTurn('ok'))
    const c = collector()

    await runChatTurn({ ...base, input: { kind: 'message', message: 'x' } } as any, c.emit)

    // Nội dung rỗng là lỗi 400 của API model; vai 'tool' ở đây không có tool_call_id để khớp.
    expect(streamMock.mock.calls[0][0].messages.slice(1)).toEqual([{ role: 'user', content: 'x' }])
  })

  it('chạy tool rồi quay lại model, kết thúc bằng result', async () => {
    streamMock
      .mockReturnValueOnce(toolTurn('get_top_links', { period_days: 7 }))
      .mockReturnValueOnce(textTurn('đây là top 7 ngày, trên toàn tổ chức'))
    const c = collector()

    await runChatTurn({ ...base, input: { kind: 'message', message: 'top?' } } as any, c.emit)

    expect(callToolMock).toHaveBeenCalledTimes(1)
    expect(c.names()).toContain('status')
    expect(c.names().at(-1)).toBe('result')
    expect(repoMock.recordToolCall).toHaveBeenCalledWith(
      expect.objectContaining({ toolName: 'get_top_links', status: 'ok', isWrite: false })
    )
  })

  it('tool hỏng thì quay về model dưới dạng is_error, KHÔNG làm vỡ lượt', async () => {
    callToolMock.mockRejectedValueOnce(new Error('slug đã tồn tại'))
    streamMock
      .mockReturnValueOnce(toolTurn('create_short_link', { destination_url: 'https://a.vn' }))
      .mockReturnValueOnce(textTurn('slug đó có người dùng rồi, mình đổi sang…'))
    const c = collector()

    await runChatTurn({ ...base, input: { kind: 'message', message: 'tạo' } } as any, c.emit)

    const second = streamMock.mock.calls[1][0].messages.at(-1)
    expect(second.role).toBe('tool')
    expect(String(second.content)).toContain('slug đã tồn tại')
    expect(c.names().at(-1)).toBe('result')
    expect(repoMock.recordToolCall).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'error' })
    )
  })
})

describe('⭐ cổng xác nhận — hai thao tác MỚI được gác', () => {
  /**
   * Đổi đích đến nguy hiểm hơn xoá dù nghe nhẹ hơn: xoá làm QR chết và người quét thấy trang lỗi,
   * còn đổi đích thì QR vẫn chạy bình thường, chỉ đưa người ta tới nơi khác.
   */
  it('⭐ đổi đích đến DỪNG lại, không chạy tool', async () => {
    streamMock.mockReturnValueOnce(
      toolTurn('update_short_link', { id: 'tp-1', destination_url: 'https://xau.vn' })
    )
    const c = collector()

    await runChatTurn({ ...base, input: { kind: 'message', message: 'đổi đích' } } as any, c.emit)

    expect(callToolMock).not.toHaveBeenCalled()
    expect(c.names()).toEqual(['session', 'approval_request'])
    const render: string = c.first('approval_request').render
    expect(render).toContain('https://xau.vn')
    // Phải nói rõ chỗ nguy: QR không có dấu hiệu gì khác lạ.
    expect(render).toMatch(/vẫn chạy bình thường/i)
  })

  it('nhưng đổi TÊN thì làm ngay — mục 5', async () => {
    streamMock
      .mockReturnValueOnce(toolTurn('update_short_link', { id: 'tp-1', name: 'tên mới' }))
      .mockReturnValueOnce(textTurn('đã đổi tên'))
    const c = collector()

    await runChatTurn({ ...base, input: { kind: 'message', message: 'đổi tên' } } as any, c.emit)

    expect(callToolMock).toHaveBeenCalledTimes(1)
    expect(c.names()).not.toContain('approval_request')
  })

  it('⭐ mở công khai artifact DỪNG lại', async () => {
    streamMock.mockReturnValueOnce(
      toolTurn('set_artifact_access', { artifact_id: 'a1', mode: 'public' })
    )
    const c = collector()

    await runChatTurn({ ...base, input: { kind: 'message', message: 'mở ra' } } as any, c.emit)

    expect(callToolMock).not.toHaveBeenCalled()
    const render: string = c.first('approval_request').render
    expect(render).toMatch(/không cần mật khẩu|bất kỳ ai/i)
  })

  it('nhưng SIẾT lại thì làm ngay', async () => {
    streamMock
      .mockReturnValueOnce(toolTurn('set_artifact_access', { artifact_id: 'a1', mode: 'password' }))
      .mockReturnValueOnce(textTurn('đã khoá'))
    const c = collector()

    await runChatTurn({ ...base, input: { kind: 'message', message: 'khoá lại' } } as any, c.emit)

    expect(callToolMock).toHaveBeenCalledTimes(1)
    expect(c.names()).not.toContain('approval_request')
  })

  /**
   * ⚠ Nhãn trên thẻ KHÔNG được lấy `destination_url` cho `update_short_link`: ở tool đó nó là đích
   * MỚI, không phải thứ đang bị sửa. Lấy nhầm thì thẻ đọc ra "đổi đích của link <đích mới>".
   */
  it('thẻ đổi đích nêu LINK bị sửa, không nêu đích mới làm nhãn', async () => {
    streamMock.mockReturnValueOnce(
      toolTurn('update_short_link', { id: 'tp-9', destination_url: 'https://moi.vn' })
    )
    const c = collector()

    await runChatTurn({ ...base, input: { kind: 'message', message: 'đổi' } } as any, c.emit)

    expect(c.first('approval_request').action.links[0].destination).toContain('tp-9')
  })
})

describe('⭐ cổng xoá', () => {
  it('xoá KHÔNG chạy ở lượt 1 — chỉ phát approval_request rồi dừng', async () => {
    streamMock.mockReturnValueOnce(toolTurn('delete_short_link', { slug: 'koc-tiktok' }))
    const c = collector()

    await runChatTurn({ ...base, input: { kind: 'message', message: 'xoá đi' } } as any, c.emit)

    expect(callToolMock).not.toHaveBeenCalled()
    expect(c.names()).toEqual(['session', 'approval_request'])
    expect(redisMock.set).toHaveBeenCalledTimes(1)
  })

  /**
   * `approval_request` tự nó là frame kết thúc (`use-agent-chat-transport.ts:340-351`). Phát thêm
   * `result` sẽ làm giao diện đánh dấu thẻ đã xong trong khi nó vẫn đang chờ người bấm.
   */
  it('KHÔNG phát result kèm theo approval_request', async () => {
    streamMock.mockReturnValueOnce(toolTurn('delete_artifact', { artifact_id: 'a1' }))
    const c = collector()

    await runChatTurn({ ...base, input: { kind: 'message', message: 'xoá' } } as any, c.emit)

    expect(c.names()).not.toContain('result')
  })

  it('câu xác nhận nói rõ QR đã in sẽ chết', async () => {
    streamMock.mockReturnValueOnce(toolTurn('delete_short_link', { slug: 'abc' }))
    const c = collector()

    await runChatTurn({ ...base, input: { kind: 'message', message: 'xoá' } } as any, c.emit)

    const render: string = c.first('approval_request').render
    expect(render).toContain('abc')
    expect(render).toMatch(/không hoàn tác|QR/i)
  })

  /**
   * ⭐ Khoá một lỗi AN TOÀN đã xảy ra thật, 2026-10-29. Bản đầu tra đúng ba khoá; model gọi bằng
   * khoá khác và thẻ hiện `(link)` trống trơn — người dùng được mời bấm Xoá mà không biết xoá gì.
   * Với cổng an toàn duy nhất của tính năng, đó là lỗi an toàn chứ không phải lỗi hiển thị.
   */
  it('⭐ thẻ xác nhận LUÔN nói được xoá cái gì, kể cả khi model dùng khoá lạ', async () => {
    streamMock.mockReturnValueOnce(
      toolTurn('delete_short_link', { touch_point_id: 'tp-9', ghi_chu: 'link cũ' })
    )
    const c = collector()

    await runChatTurn({ ...base, input: { kind: 'message', message: 'xoá' } } as any, c.emit)

    const data = c.first('approval_request')
    expect(data.action.links[0].destination).toContain('tp-9')
    expect(data.render).toContain('tp-9')
    // Không bao giờ được rơi về một chỗ trống hay chữ chung chung.
    expect(data.action.links[0].destination).not.toBe('(link)')
  })

  it('không tham số nào thì vẫn nói rõ là không rõ, chứ không im lặng', async () => {
    streamMock.mockReturnValueOnce(toolTurn('delete_artifact', {}))
    const c = collector()

    await runChatTurn({ ...base, input: { kind: 'message', message: 'xoá' } } as any, c.emit)

    expect(c.first('approval_request').action.links[0].destination).toBe('(không rõ tham số)')
  })

  /**
   * Model gộp hai lệnh xoá vào một lượt thì cái thứ hai KHÔNG được âm thầm chạy chỉ vì cái thứ
   * nhất đang chờ duyệt.
   */
  it('dừng ở tool xoá ĐẦU TIÊN, không chạy tiếp cái sau', async () => {
    streamMock.mockReturnValueOnce(
      fakeStream([
        {
          choices: [
            {
              delta: {
                tool_calls: [
                  { index: 0, id: 't1', function: { name: 'delete_short_link', arguments: '{\"slug\":' } },
                  { index: 1, id: 't2', function: { name: 'delete_short_link', arguments: '{\"slug\":' } },
                ],
              },
            },
          ],
        },
        {
          choices: [
            {
              delta: {
                tool_calls: [
                  { index: 1, function: { arguments: '\"b\"}' } },
                  { index: 0, function: { arguments: '\"a\"}' } },
                ],
              },
            },
          ],
        },
        { choices: [{ delta: {}, finish_reason: 'tool_calls' }] },
      ])
    )
    const c = collector()

    await runChatTurn({ ...base, input: { kind: 'message', message: 'xoá a và b' } } as any, c.emit)

    expect(callToolMock).not.toHaveBeenCalled()
    expect(c.frames.filter((f) => f.event === 'approval_request')).toHaveLength(1)
  })
})

describe('⭐ lượt duyệt', () => {
  const proposal = {
    org_id: ORG,
    user_id: USER,
    session_id: SESSION,
    tool_name: 'delete_short_link',
    args: { slug: 'abc' },
  }
  const approve = {
    kind: 'approval' as const,
    proposalId: '55555555-5555-4555-8555-555555555555',
    decision: 'approve' as const,
  }

  it('đồng ý thì chạy tool thật và ghi confirmed_at', async () => {
    redisMock.get.mockResolvedValue(JSON.stringify(proposal))
    const c = collector()

    await runChatTurn({ ...base, input: approve } as any, c.emit)

    expect(callToolMock).toHaveBeenCalledTimes(1)
    expect(repoMock.recordToolCall).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ok', confirmedAt: expect.any(String) })
    )
    expect(c.names().at(-1)).toBe('result')
  })

  it('⭐ từ chối thì KHÔNG gọi model và KHÔNG chạy tool', async () => {
    redisMock.get.mockResolvedValue(JSON.stringify(proposal))
    const c = collector()

    await runChatTurn({ ...base, input: { ...approve, decision: 'reject' } } as any, c.emit)

    expect(streamMock).not.toHaveBeenCalled()
    expect(callToolMock).not.toHaveBeenCalled()
    expect(repoMock.recordToolCall).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'rejected' })
    )
  })

  it('⭐ xoá khoá Redis TRƯỚC khi chạy — bấm hai lần không xoá hai lần', async () => {
    redisMock.get.mockResolvedValue(JSON.stringify(proposal))
    const order: string[] = []
    redisMock.del.mockImplementation(async () => void order.push('del'))
    callToolMock.mockImplementation(async () => {
      order.push('tool')
      return { structuredContent: { ok: true } }
    })

    await runChatTurn({ ...base, input: approve } as any, collector().emit)

    expect(order).toEqual(['del', 'tool'])
  })

  it('⭐ đề xuất của org khác bị từ chối', async () => {
    redisMock.get.mockResolvedValue(
      JSON.stringify({ ...proposal, org_id: '99999999-9999-4999-8999-999999999999' })
    )
    const c = collector()

    await runChatTurn({ ...base, input: approve } as any, c.emit)

    expect(callToolMock).not.toHaveBeenCalled()
    expect(c.names()).toContain('error')
    expect(redisMock.del).not.toHaveBeenCalled()
  })

  it('đề xuất quá hạn báo lỗi tử tế, không vỡ', async () => {
    redisMock.get.mockResolvedValue(null)
    const c = collector()

    await runChatTurn({ ...base, input: approve } as any, c.emit)

    expect(c.first('error').message).toMatch(/quá hạn|đã được xử lý/i)
  })
})

describe('⭐ vòng có lối ra', () => {
  it('chạm trần số bước thì dừng và nói rõ đó là chốt kỹ thuật', async () => {
    streamMock.mockReturnValue(toolTurn('get_top_links', { period_days: 7 }))
    const c = collector()

    await runChatTurn({ ...base, input: { kind: 'message', message: 'loop' } } as any, c.emit)

    expect(streamMock).toHaveBeenCalledTimes(MAX_TOOL_STEPS)
    const msg: string = c.first('error').message
    expect(msg).toMatch(/không phải giới hạn sử dụng/i)
  })

  it('tín hiệu huỷ dừng vòng ngay, không phát thêm frame nào', async () => {
    const ac = new AbortController()
    ac.abort()
    const c = collector()

    await runChatTurn({ ...base, signal: ac.signal, input: { kind: 'message', message: 'x' } } as any, c.emit)

    expect(streamMock).not.toHaveBeenCalled()
    expect(c.names()).toEqual(['session'])
  })
})

describe('event phụ', () => {
  it('get_clicks_timeseries phát chart', async () => {
    callToolMock.mockResolvedValue({
      structuredContent: {
        period_days: 7,
        granularity: 'daily',
        buckets: [
          {
            start: '2026-10-29',
            link_clicks: 1,
            qr_scans: 0,
            nfc_taps: 0,
            total_interactions: 1,
          },
        ],
        summary: {
          peak: { start: '2026-10-29', interactions: 1 },
          trend_direction: 'up',
          buckets_with_activity: 1,
        },
      },
    })
    streamMock
      .mockReturnValueOnce(toolTurn('get_clicks_timeseries', { period_days: 7 }))
      .mockReturnValueOnce(textTurn('xong'))
    const c = collector()

    await runChatTurn({ ...base, input: { kind: 'message', message: 'biểu đồ' } } as any, c.emit)

    expect(c.first('chart').kind).toBe('clicks_timeseries')
  })

  /**
   * ⭐ Khoá một lỗi đã xảy ra thật, 2026-10-29: tôi đoán khoá là `links` trong khi tool trả về
   * `created`, và `link_id` trong khi nó trả về `id`. Hậu quả IM LẶNG — link vẫn tạo, câu trả lời
   * vẫn hiện, chỉ không có mã QR nào, và không lỗi ở đâu để lần theo.
   *
   * Payload dưới đây chép nguyên văn từ `agent.agent_tool_calls` của một lần gọi thật.
   */
  it('⭐ create_short_link phát MỘT qr cho mỗi link, đọc đúng khoá `created`', async () => {
    callToolMock.mockResolvedValue({
      structuredContent: {
        created: [
          { id: 'eaf9319e', short_url: 'https://example.com/a', slug: 'a', name: 'A' },
          { id: 'bbb', short_url: 'https://example.com/b', slug: null, name: 'B' },
        ],
      },
    })
    streamMock
      .mockReturnValueOnce(toolTurn('create_short_link', { mode: 'bulk' }))
      .mockReturnValueOnce(textTurn('đã tạo 2 link'))
    const c = collector()

    await runChatTurn({ ...base, input: { kind: 'message', message: 'tạo 2 link' } } as any, c.emit)

    const qrs = c.frames.filter((f) => f.event === 'qr')
    expect(qrs).toHaveLength(2)
    expect(qrs[0].data).toEqual({
      short_url: 'https://example.com/a',
      name: 'A',
      link_id: 'eaf9319e',
    })
    // slug null là hợp lệ (link không đặt slug riêng) và không được làm hỏng frame.
    expect(qrs[1].data.link_id).toBe('bbb')
  })

  /** Payload lệch lược đồ thì KHÔNG phát gì, thay vì phát một frame méo mà giao diện phải tự đoán. */
  it('payload sai hình dạng thì không phát qr', async () => {
    callToolMock.mockResolvedValue({ structuredContent: { links: [{ short_url: 'x' }] } })
    streamMock
      .mockReturnValueOnce(toolTurn('create_short_link', {}))
      .mockReturnValueOnce(textTurn('xong'))
    const c = collector()

    await runChatTurn({ ...base, input: { kind: 'message', message: 'tạo' } } as any, c.emit)

    expect(c.names()).not.toContain('qr')
  })

  /**
   * ⭐ Khoá một lỗi đã xảy ra thật: `publish_draft_artifact` ra đời mà không được thêm vào danh
   * sách phát event, nên trang đăng xong không có mã QR nào — trong khi model vẫn nói "mã QR đã
   * sẵn sàng ở trên". Im lặng hoàn toàn.
   *
   * `it.each` chứ không hai ca rời: thêm một tool công bố nữa thì người viết phải nghĩ tới hàng
   * này, thay vì chép một ca và quên.
   */
  it.each(['publish_artifact', 'publish_draft_artifact'])('%s phát qr', async (tool) => {
    callToolMock.mockResolvedValue({
      structuredContent: {
        artifact_id: 'art-1',
        status: 'live',
        name: 'Catalog',
        access_mode: 'password',
        short_url: 'https://li2.sh/catalog',
        serve_url: 'https://a.vn/s/x',
        qr_url: 'https://a.vn/qr.svg',
        size_bytes: 10,
        updated_at: '2026-10-29T00:00:00Z',
      },
    })
    streamMock.mockReturnValueOnce(toolTurn(tool, {})).mockReturnValueOnce(textTurn('xong'))
    const c = collector()

    await runChatTurn({ ...base, input: { kind: 'message', message: 'đăng' } } as any, c.emit)

    const qrs = c.frames.filter((f) => f.event === 'qr')
    expect(qrs).toHaveLength(1)
    expect(qrs[0].data.short_url).toBe('https://li2.sh/catalog')
  })

  it('publish_artifact cũng phát qr, nhưng bản nháp (short_url null) thì không', async () => {
    const art = {
      artifact_id: 'art-1',
      status: 'live',
      name: 'Catalog',
      access_mode: 'password',
      serve_url: 'https://a.vn/s/x',
      qr_url: 'https://a.vn/qr.svg',
      size_bytes: 10,
      updated_at: '2026-10-29T00:00:00Z',
    }
    callToolMock.mockResolvedValue({
      structuredContent: { ...art, short_url: 'https://li2.sh/catalog' },
    })
    streamMock
      .mockReturnValueOnce(toolTurn('publish_artifact', { html: '<p>x</p>' }))
      .mockReturnValueOnce(textTurn('đã đăng'))
    const c1 = collector()
    await runChatTurn({ ...base, input: { kind: 'message', message: 'đăng' } } as any, c1.emit)
    expect(c1.frames.filter((f) => f.event === 'qr')).toHaveLength(1)

    vi.clearAllMocks()
    repoMock.getOrCreateSession.mockResolvedValue(SESSION)
    repoMock.getHistory.mockResolvedValue([])
    repoMock.appendMessage.mockResolvedValue('m')
    callToolMock.mockResolvedValue({ structuredContent: { ...art, short_url: null } })
    streamMock
      .mockReturnValueOnce(toolTurn('publish_artifact', { html: '<p>x</p>' }))
      .mockReturnValueOnce(textTurn('nháp'))
    const c2 = collector()
    await runChatTurn({ ...base, input: { kind: 'message', message: 'đăng' } } as any, c2.emit)
    expect(c2.names()).not.toContain('qr')
  })

  it('tool hỏng thì KHÔNG phát qr', async () => {
    callToolMock.mockRejectedValueOnce(new Error('quota hết'))
    streamMock
      .mockReturnValueOnce(toolTurn('create_short_link', {}))
      .mockReturnValueOnce(textTurn('hết quota rồi'))
    const c = collector()

    await runChatTurn({ ...base, input: { kind: 'message', message: 'tạo' } } as any, c.emit)

    expect(c.names()).not.toContain('qr')
  })
})
