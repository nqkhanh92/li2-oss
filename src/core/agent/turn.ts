import 'server-only'

import type OpenAI from 'openai'
import { v4 as uuidv4 } from 'uuid'

import { redis } from '@/infrastructure/cache/redis'
import { REDIS_KEYS } from '@/infrastructure/cache/redis/key'
import { logger } from '@/infrastructure/logging/logger'
import { callToolWithAgentToken } from '@/core/mcp/call-tool'
import { getMcpTool } from '@/core/mcp/tools'
import { agentChatRepository } from '@/core/repositories/agent-chat.repository'
import { chatToolsFor, confirmKind, needsConfirmation } from '@/core/agent/chat-tools'
import { CHAT_MODEL, MAX_OUTPUT_TOKENS, MAX_TOOL_STEPS, gatewayClient } from '@/core/agent/gateway'
import { buildSystemPrompt, type DraftArtifact } from '@/core/agent/system-prompt'
import {
  clicksTimeseriesSchema,
  createShortLinkOutputSchema,
  publishArtifactOutputSchema,
} from '@/shared/schemas/agent-tools'
import type { AgentScope } from '@/shared/lib/agent/paseto'

const log = logger.child({ service: 'agent-turn' })

/** Phát một frame SSE. Vòng lặp không biết gì về HTTP — route lo việc đóng gói. */
export type Emit = (event: string, data: unknown) => void

export type TurnInput =
  | { kind: 'message'; message: string }
  | { kind: 'approval'; proposalId: string; decision: 'approve' | 'reject' }

export interface RunTurnParams {
  input: TurnInput
  sessionId: string | null
  turnId: string
  orgId: string
  userId: string
  /** Token PASETO của chính người gọi, phát lại nguyên văn cho mọi tool. */
  token: string
  scopes: AgentScope[]
  /** Bản nháp artifact vừa tạo từ file đính kèm, nếu lượt này có file. */
  draft?: DraftArtifact | null
  signal: AbortSignal
}

/** Đề xuất xoá nằm chờ giữa hai lượt. */
interface StoredProposal {
  org_id: string
  user_id: string
  session_id: string
  tool_name: string
  args: Record<string, unknown>
}

const PROPOSAL_TTL_SECONDS = 15 * 60

/**
 * Chạy MỘT lượt chat và lái `emit` theo nó.
 *
 * ★ Lịch sử hội thoại đến từ DB, không từ request. Thân request chỉ chở một tin nhắn
 * (`TurnBody` ở `use-agent-chat-transport.ts:36`), nên không đọc `agent_messages` là mỗi lượt một
 * lần mất trí nhớ. Đó là lý do "ghi DB" không phải tính năng tra cứu mà là **điều kiện để chạy**.
 *
 * ★ Và lịch sử chỉ gồm CHỮ — các khối `tool_use`/`tool_result` không được dựng lại. Hai lý do, lý
 * do thứ hai mới là lý do thật:
 *   1. ngữ cảnh model rẻ đi nhiều;
 *   2. `tool_use` và `tool_result` phải **đi thành cặp khớp id**, nếu không API từ chối cả lượt.
 *      Dựng lại cặp đó từ hai bảng rồi cắt bớt theo `limit` là một nguồn lỗi chỉ lộ ra khi hội
 *      thoại đủ dài — tức là trên máy người dùng, không phải trên máy mình. Model vẫn biết chuyện
 *      gì đã xảy ra, vì chính nó đã kể lại bằng chữ trong câu trả lời trước.
 */
/**
 * Dịch một lỗi của tầng mạng thành câu người dùng đọc được.
 *
 * ★ ĐÃ NỔ 2026-10-29. Cổng model được cấu hình bằng địa chỉ công khai, chạy ngon khi `curl` từ máy
 * lập trình nhưng **không tới được từ chính server** (hairpin NAT — xem `gateway.ts`). Mỗi lượt
 * chat treo 180 giây rồi hiện đúng bốn chữ: *"Request timed out."*
 *
 * Câu đó không sai, nhưng nó không nhắc gì tới mạng, tới cấu hình, hay tới chỗ nên đi tìm — nên
 * người đọc sẽ nghĩ model chậm chứ không nghĩ sai địa chỉ. Một lỗi vận hành phải tự nói ra nó là
 * lỗi vận hành.
 */
export function describeTurnError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err)

  if (/timed out|ETIMEDOUT|ECONNREFUSED|ENOTFOUND|EHOSTUNREACH|fetch failed/i.test(raw)) {
    return `Mình không gọi được tới dịch vụ AI (${raw}). Thường là do LI2_AI_GATEWAY_URL trỏ tới một địa chỉ mà máy chủ không tới được — nhờ quản trị viên kiểm giúp.`
  }
  if (/401|403|invalid.*key|unauthorized/i.test(raw)) {
    return `Dịch vụ AI từ chối khoá truy cập (${raw}). Nhờ quản trị viên kiểm LI2_AI_GATEWAY_KEY.`
  }
  return raw
}

export async function runChatTurn(params: RunTurnParams, emit: Emit): Promise<void> {
  const { input, orgId, userId, token, scopes, turnId, signal } = params

  const sessionId = await agentChatRepository.getOrCreateSession(params.sessionId, orgId, userId)
  emit('session', { session_id: sessionId, turn_id: turnId })

  if (input.kind === 'approval') {
    await runApprovalTurn({ ...params, sessionId }, input, emit)
    return
  }

  await agentChatRepository.setTitleIfEmpty(sessionId, input.message)

  const history = await agentChatRepository.getHistory(sessionId)
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = history
    .filter((row) => row.role === 'user' || row.role === 'assistant')
    .filter((row) => (row.content ?? '').trim().length > 0)
    .map((row) => ({
      role: row.role === 'user' ? ('user' as const) : ('assistant' as const),
      content: row.content as string,
    }))

  messages.push({ role: 'user', content: input.message })
  await agentChatRepository.appendMessage({
    sessionId,
    role: 'user',
    content: input.message,
    turnId,
  })

  const tools: OpenAI.Chat.ChatCompletionTool[] = chatToolsFor(scopes).map((t) => ({
    type: 'function',
    function: { name: t.name, description: t.description, parameters: t.input_schema },
  }))
  const client = gatewayClient()

  // Prompt hệ thống là một tin nhắn vai `system` ở ĐẦU mảng, không phải tham số riêng như
  // `/v1/messages`. Nó không được ghi vào `agent_messages`: nó không phải lời ai nói, và nó được
  // dựng lại mỗi lượt từ `buildSystemPrompt` nên lưu lại chỉ tạo ra một bản sao có thể cũ.
  const llmMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: buildSystemPrompt({ draft: params.draft ?? null }) },
    ...messages,
  ]

  for (let step = 0; step < MAX_TOOL_STEPS; step++) {
    if (signal.aborted) return

    const stream = await client.chat.completions.create(
      {
        model: CHAT_MODEL,
        max_tokens: MAX_OUTPUT_TOKENS,
        messages: llmMessages,
        tools,
        stream: true,
      },
      { signal }
    )

    /**
     * Gom luồng.
     *
     * ⚠️ `tool_calls` tới theo TỪNG MẨU và phải ghép theo `index`, không theo thứ tự đến: một lượt
     * gọi hai tool sẽ trộn mẩu của cả hai. Ghép nhầm thì `arguments` của tool A dính đuôi của tool
     * B, ra một chuỗi JSON hỏng — và lỗi đó chỉ xuất hiện khi model gọi nhiều tool một lúc.
     *
     * `id` và `name` cũng cộng dồn chứ không gán đè: cổng có thể chẻ chúng thành nhiều mẩu.
     */
    let text = ''
    let finishReason: string | null = null
    const partial = new Map<number, { id: string; name: string; args: string }>()

    for await (const chunk of stream) {
      const choice = chunk.choices?.[0]
      if (!choice) continue

      const delta = choice.delta
      if (delta?.content) {
        text += delta.content
        emit('token', { text: delta.content })
      }

      for (const tc of delta?.tool_calls ?? []) {
        const slot = partial.get(tc.index) ?? { id: '', name: '', args: '' }
        if (tc.id) slot.id += tc.id
        if (tc.function?.name) slot.name += tc.function.name
        if (tc.function?.arguments) slot.args += tc.function.arguments
        partial.set(tc.index, slot)
      }

      if (choice.finish_reason) finishReason = choice.finish_reason
    }

    const calls = [...partial.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v)

    // Ghi lượt trợ lý TRƯỚC khi chạy tool: `agent_tool_calls.message_id` trỏ về hàng này, nên hàng
    // phải tồn tại trước. Cũng có nghĩa là một lượt vỡ giữa chừng vẫn để lại vết của nó.
    const assistantMessageId = await agentChatRepository.appendMessage({
      sessionId,
      role: 'assistant',
      content: text,
      turnId,
      model: CHAT_MODEL,
    })

    if (calls.length === 0) {
      emit('result', { stop_reason: finishReason, model: CHAT_MODEL })
      return
    }

    llmMessages.push({
      role: 'assistant',
      content: text || null,
      tool_calls: calls.map((c) => ({
        id: c.id,
        type: 'function' as const,
        function: { name: c.name, arguments: c.args || '{}' },
      })),
    })

    for (const call of calls) {
      if (signal.aborted) return

      /**
       * `arguments` là chuỗi JSON model tự sinh, nên nó CÓ THỂ hỏng (bị cắt vì chạm trần token,
       * hoặc model viết sai). Hỏng thì báo lại cho model dưới dạng kết quả lỗi để nó gọi lại —
       * `JSON.parse` ném ra ngoài sẽ giết cả lượt vì một mẩu chữ thiếu dấu ngoặc.
       */
      let args: Record<string, unknown> = {}
      let parseError: string | null = null
      try {
        args = call.args ? (JSON.parse(call.args) as Record<string, unknown>) : {}
      } catch {
        parseError = 'tham số không phải JSON hợp lệ — hãy gọi lại công cụ này'
      }

      if (parseError) {
        llmMessages.push({ role: 'tool', tool_call_id: call.id, content: parseError })
        continue
      }

      /**
       * ★ CỔNG XOÁ. Lượt này DỪNG tại đây — không chạy tool, không gọi model lại.
       *
       * `approval_request` tự nó là frame kết thúc (`use-agent-chat-transport.ts:340-351`), nên
       * phát xong là `return`, không phát `result`. Phát cả hai sẽ làm giao diện đánh dấu thẻ là
       * đã xong trong khi nó vẫn đang chờ người bấm.
       *
       * Và nó dừng ở tool ĐẦU TIÊN cần xác nhận: nếu model gộp "xoá A rồi xoá B" vào một lượt, B
       * không được âm thầm chạy chỉ vì A đang chờ. Người dùng duyệt xong A thì model tự đề xuất B
       * ở lượt sau.
       */
      if (needsConfirmation(call.name, args)) {
        const proposalId = uuidv4()
        const stored: StoredProposal = {
          org_id: orgId,
          user_id: userId,
          session_id: sessionId,
          tool_name: call.name,
          args,
        }
        await redis.set(
          REDIS_KEYS.AGENT_CHAT.PROPOSAL(proposalId),
          JSON.stringify(stored),
          'EX',
          PROPOSAL_TTL_SECONDS
        )

        emit('approval_request', {
          proposal_id: proposalId,
          action: { tool: call.name, mode: 'single', links: [describeTarget(call.name, args)] },
          render: renderConfirmation(call.name, args),
        })
        return
      }

      emit('status', { text: statusLineFor(call.name) })

      const outcome = await runTool(call.name, args, token, userId)

      await agentChatRepository.recordToolCall({
        messageId: assistantMessageId,
        toolName: call.name,
        input: args,
        output: outcome.payload,
        isWrite: outcome.isWrite,
        status: outcome.ok ? 'ok' : 'error',
      })

      if (outcome.ok) emitSideEvents(call.name, outcome.payload, emit)

      llmMessages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(outcome.payload),
      })
    }
  }

  /**
   * Hết trần bước.
   *
   * ⚠️ Đây **không phải hạn mức người dùng** — chủ sản phẩm chốt không chặn lạm dụng và điều đó
   * được tôn trọng (không giới hạn số lượt, không rate limit). Nhưng vòng lặp phải có lối ra: model
   * trả `stop_reason: 'tool_use'` thì vòng chạy tiếp, nên không có trần nghĩa là chạy mãi khi nó
   * kẹt ở một tool liên tục hỏng. Lời nhắn nói đúng điều đó, để người dùng không tưởng mình bị cắt
   * vì dùng nhiều.
   */
  log.warn({ sessionId, turnId, steps: MAX_TOOL_STEPS }, 'lượt chạm trần số bước gọi tool')
  emit('error', {
    message: `Lượt này đã gọi công cụ ${MAX_TOOL_STEPS} lần mà chưa xong nên mình dừng lại — đây là chốt chặn kỹ thuật, không phải giới hạn sử dụng. Thử chia nhỏ yêu cầu giúp mình nhé.`,
  })
}

/**
 * Lượt 2 của một lần xoá: người dùng đã bấm Xoá hoặc Thôi.
 *
 * ★ KHÔNG gọi model. Lượt này chỉ có hai việc — chạy đúng cái đã được duyệt, hoặc không chạy gì —
 * và cả hai đều không cần suy nghĩ. Gọi model ở đây vừa tốn tiền vừa mở ra khả năng nó làm thêm
 * một việc thứ ba mà người dùng chưa duyệt, điều mà cả cổng xác nhận sinh ra để ngăn.
 */
async function runApprovalTurn(
  params: RunTurnParams & { sessionId: string },
  input: Extract<TurnInput, { kind: 'approval' }>,
  emit: Emit
): Promise<void> {
  const { orgId, userId, token, turnId, sessionId } = params
  const key = REDIS_KEYS.AGENT_CHAT.PROPOSAL(input.proposalId)
  const raw = await redis.get(key)

  if (!raw) {
    emit('error', {
      message: 'Đề xuất này đã quá hạn hoặc đã được xử lý. Nhờ mình lại nếu bạn vẫn muốn xoá nhé.',
    })
    return
  }

  const proposal = JSON.parse(raw) as StoredProposal

  /**
   * ⚠️ Kiểm lại org + user dù `proposal_id` là UUID do server sinh. Một id đoán được thì coi như
   * không, nhưng nó có thể đi qua log, qua ảnh chụp màn hình, qua một tab còn mở. Phép kiểm này
   * biến "biết id" thành không đủ để xoá thứ của người khác.
   */
  if (proposal.org_id !== orgId || proposal.user_id !== userId) {
    log.warn({ proposalId: input.proposalId, orgId, userId }, 'đề xuất không khớp org/user')
    emit('error', { message: 'Đề xuất này không thuộc về bạn.' })
    return
  }

  // Xoá khoá NGAY, trước khi chạy. Một đề xuất chỉ dùng được một lần: nếu không, bấm Xoá hai lần
  // (mạng chậm, người dùng sốt ruột) sẽ chạy tool hai lần.
  await redis.del(key)

  if (input.decision === 'reject') {
    const messageId = await agentChatRepository.appendMessage({
      sessionId,
      role: 'assistant',
      content: 'Đã huỷ, không có gì bị xoá.',
      turnId,
    })
    await agentChatRepository.recordToolCall({
      messageId,
      toolName: proposal.tool_name,
      input: proposal.args,
      output: null,
      isWrite: true,
      status: 'rejected',
    })
    emit('result', { stop_reason: 'rejected', model: null })
    return
  }

  emit('status', { text: 'Đang xoá…' })
  const outcome = await runTool(proposal.tool_name, proposal.args, token, userId)

  const content = outcome.ok ? 'Đã xoá xong.' : 'Không xoá được — xem chi tiết bên dưới.'
  const messageId = await agentChatRepository.appendMessage({
    sessionId,
    role: 'assistant',
    content,
    turnId,
  })
  await agentChatRepository.recordToolCall({
    messageId,
    toolName: proposal.tool_name,
    input: proposal.args,
    output: outcome.payload,
    isWrite: true,
    status: outcome.ok ? 'ok' : 'error',
    confirmedAt: new Date().toISOString(),
  })

  if (!outcome.ok) {
    emit('error', { message: messageOf(outcome.payload) })
    return
  }

  emit('notice', { text: content })
  emit('result', { stop_reason: 'end_turn', model: null })
}

interface ToolOutcome {
  ok: boolean
  isWrite: boolean
  payload: unknown
}

/**
 * Gọi một tool và **không bao giờ ném**.
 *
 * Một tool hỏng phải quay về với model dưới dạng `tool_result` có `is_error`, chứ không được làm
 * vỡ cả lượt: model đọc được lỗi thì nó xin lỗi hoặc thử cách khác, còn lượt vỡ thì người dùng chỉ
 * thấy một thông báo chung chung và mất luôn phần đã trả lời.
 */
async function runTool(
  name: string,
  args: Record<string, unknown>,
  token: string,
  userId: string
): Promise<ToolOutcome> {
  const tool = getMcpTool(name)
  if (!tool) {
    return { ok: false, isWrite: false, payload: { error: `không có công cụ tên ${name}` } }
  }

  const isWrite = tool.requiredScope === 'write'

  try {
    const result = await callToolWithAgentToken(tool, args, token, userId)
    return { ok: true, isWrite, payload: result.structuredContent ?? result.content }
  } catch (err) {
    log.warn({ err, tool: name }, 'tool thất bại')
    return {
      ok: false,
      isWrite,
      payload: { error: err instanceof Error ? err.message : String(err) },
    }
  }
}

/**
 * Hai event phụ, phát SAU khi tool chạy xong.
 *
 * Chúng tồn tại để giao diện vẽ **thành phần thật** thay vì để model vẽ biểu đồ bằng chữ — một
 * bảng ASCII trong bong bóng chat vừa xấu vừa không bấm được.
 *
 * ★ ĐỌC PAYLOAD BẰNG CHÍNH LƯỢC ĐỒ ZOD CỦA TOOL, không đoán tên khoá. Đoán đã trượt một lần ngày
 * 2026-10-29: tôi viết `data.links` trong khi `create_short_link` trả về `{ created: [...] }` với
 * `id` chứ không phải `link_id`. Hậu quả im lặng hoàn toàn — link vẫn tạo được, người dùng vẫn
 * thấy câu trả lời, chỉ **không có mã QR nào hiện ra**, và không có lỗi ở đâu để lần theo.
 *
 * Dùng `safeParse` nên lược đồ đổi hình thì event không phát, chứ không phát ra thứ méo mó mà
 * giao diện phải tự đoán.
 */
function emitSideEvents(toolName: string, payload: unknown, emit: Emit): void {
  if (toolName === 'get_clicks_timeseries') {
    const parsed = clicksTimeseriesSchema.safeParse(payload)
    if (parsed.success) emit('chart', { kind: 'clicks_timeseries', data: parsed.data })
    return
  }

  if (toolName === 'create_short_link') {
    const parsed = createShortLinkOutputSchema.safeParse(payload)
    if (!parsed.success) return
    // Một frame `qr` cho MỖI link — chế độ hàng loạt trả nhiều, và giao diện vẽ một ô mỗi frame.
    for (const link of parsed.data.created) {
      emit('qr', { short_url: link.short_url, name: link.name, link_id: link.id })
    }
    return
  }

  /**
   * Hai tool công bố, CÙNG một hình dạng kết quả (`artifactToolResultSchema`).
   *
   * ⚠️ Thêm `publish_draft_artifact` vào đây là việc dễ quên nhất khi thêm một tool công bố mới, và
   * nó quên một cách IM LẶNG: trang vẫn đăng được, model vẫn nói "mã QR đã sẵn sàng ở trên", chỉ là
   * không có gì ở trên. Đúng lỗi đó đã xảy ra ngày 2026-10-29 với chính tool này.
   */
  if (toolName === 'publish_artifact' || toolName === 'publish_draft_artifact') {
    const parsed = publishArtifactOutputSchema.safeParse(payload)
    // `short_url` là nullable: một bản nháp chưa có touch point thì chưa có link để vẽ QR.
    if (parsed.success && parsed.data.short_url) {
      emit('qr', {
        short_url: parsed.data.short_url,
        name: parsed.data.name,
        link_id: parsed.data.artifact_id,
      })
    }
  }
}

/** Dòng trạng thái tạm thời hiện trong lúc tool chạy. Bị thay bởi dòng sau, và biến mất khi có chữ. */
function statusLineFor(toolName: string): string {
  if (toolName.startsWith('get_') || toolName.startsWith('list_') || toolName.startsWith('find_')) {
    return 'Đang tra dữ liệu…'
  }
  if (toolName === 'create_short_link') return 'Đang tạo link…'
  if (toolName === 'publish_artifact') return 'Đang đăng artifact…'
  if (toolName.startsWith('update_') || toolName.startsWith('set_')) return 'Đang cập nhật…'
  return 'Đang xử lý…'
}

/**
 * Mô tả thứ sắp bị xoá, trong hình dạng thẻ duyệt đã có.
 *
 * ★ KHÔNG ĐOÁN TÊN KHOÁ. Bản đầu của hàm này tra đúng ba khoá (`destination_url`, `short_url`,
 * `link_id`); model gọi bằng khoá khác và thẻ hiện ra chữ `(link)` trống trơn — tức **người dùng
 * được mời bấm Xoá mà không biết mình đang xoá gì**. Với cổng an toàn DUY NHẤT của tính năng thì
 * đó không phải lỗi hiển thị, đó là lỗi an toàn.
 *
 * Nên: ưu tiên vài khoá quen thuộc để chữ đọc đẹp, nhưng nếu không khoá nào khớp thì **hiện mọi
 * tham số** thay vì một chỗ trống. Thẻ hơi kỹ thuật vẫn tốt hơn thẻ không nói gì.
 */
function describeTarget(toolName: string, args: Record<string, unknown>) {
  const str = (k: string) => (typeof args[k] === 'string' ? (args[k] as string) : undefined)

  /**
   * ⚠️ `update_short_link` KHÔNG được lấy `destination_url` làm nhãn: ở tool đó, trường ấy là đích
   * MỚI, không phải thứ đang bị sửa. Lấy nhầm thì thẻ đọc ra như "đổi đích của link <đích mới>",
   * một câu vô nghĩa đúng vào lúc người dùng cần hiểu rõ nhất.
   */
  const uuTien =
    toolName === 'delete_artifact' || toolName === 'set_artifact_access'
      ? ['serve_url', 'short_url', 'artifact_id']
      : toolName === 'update_short_link'
        ? ['short_url', 'link_id', 'id']
        : ['destination_url', 'short_url', 'link_id', 'id']

  const destination =
    uuTien.map(str).find(Boolean) ??
    str('slug') ??
    str('name') ??
    // Lưới cuối: mọi tham số, dưới dạng `khoá=giá trị`. Không bao giờ rơi xuống chuỗi rỗng.
    Object.entries(args)
      .map(([k, v]) => `${k}=${String(v)}`)
      .join(' · ') ??
    ''

  return {
    destination: destination || '(không rõ tham số)',
    slug: str('slug'),
    name: str('name'),
  }
}

/**
 * Câu hiện nguyên văn trên thẻ xác nhận. Giao diện KHÔNG ghép chữ — nó in đúng chuỗi này.
 *
 * Mỗi nhóm cổng có một câu riêng, vì chúng cảnh báo ba chuyện khác nhau. Dùng chung một câu kiểu
 * "bạn có chắc không?" sẽ dạy người dùng bấm đồng ý theo phản xạ — và lúc đó cổng chỉ còn là một
 * lần bấm thừa chứ không phải một lần suy nghĩ.
 *
 * Câu nào cũng phải **nêu tên được thứ bị ảnh hưởng** (xem `describeTarget`): một câu hỏi không
 * nói rõ đang làm gì với cái gì thì không phải một phép xác nhận.
 */
function renderConfirmation(toolName: string, args: Record<string, unknown>): string {
  const who = describeTarget(toolName, args)
  const nhan = who.slug ?? who.name ?? who.destination

  switch (confirmKind(toolName, args)) {
    case 'delete': {
      const what = toolName === 'delete_artifact' ? 'artifact' : 'link'
      return `Bạn có chắc muốn xoá ${what} “${nhan}” không? Thao tác này không hoàn tác được, và mọi mã QR đã in trỏ tới nó sẽ không còn dùng được.`
    }

    /**
     * Nhấn mạnh "vẫn chạy bình thường" vì đó mới là chỗ nguy: xoá thì QR chết và ai cũng thấy,
     * còn đổi đích thì QR không có dấu hiệu gì khác lạ.
     */
    case 'redirect':
      return `Đổi đích đến của link “${nhan}” sang ${String(args.destination_url)}? Mọi mã QR đã in vẫn chạy bình thường nhưng sẽ đưa người quét tới địa chỉ mới — không có dấu hiệu gì cho họ biết đích đã đổi.`

    case 'open-access':
      return `Mở công khai artifact “${nhan}”? Sau thao tác này, bất kỳ ai có đường link đều xem được, không cần mật khẩu và không cần đăng nhập. Nội dung đã bị xem hoặc tải về thì không thu lại được bằng cách khoá lại.`

    default:
      // Không tới được: chỉ gọi sau khi `needsConfirmation` đã trả true.
      return `Xác nhận thao tác trên “${nhan}”?`
  }
}

function messageOf(payload: unknown): string {
  if (payload && typeof payload === 'object') {
    const m = (payload as Record<string, unknown>).error
    if (typeof m === 'string') return m
  }
  return 'Có lỗi xảy ra.'
}
