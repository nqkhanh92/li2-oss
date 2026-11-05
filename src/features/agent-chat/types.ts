/**
 * Agent chat — shared types.
 *
 * The SSE wire types mirror what li2-ai emits VERBATIM (app/conversation/sse.py,
 * app/execution/turn.py:432-482). Keep them in sync with that source — a drift here silently
 * breaks the approval card. The password on an approval link is ALWAYS the masked literal '***'
 * (li2-ai masks it before it leaves the server, B-note); the browser never receives plaintext.
 */

import type { ClicksTimeseries } from '@/shared/schemas/agent-tools'

// --- SSE wire shapes (exactly what arrives in each event's `data:` JSON) ---

export interface SessionEventData {
  session_id: string | null
  turn_id?: string
}

export interface TokenEventData {
  text: string
}

export interface NoticeEventData {
  text: string
}

/**
 * A TRANSIENT progress line from a `status` event (e.g. the KB branch's "Đang đọc tài liệu…").
 * Unlike a `notice` — a persistent fact appended to `notices[]` and kept — a status is "what's
 * happening now": each one REPLACES the last, and it is cleared the moment the answer starts
 * streaming (first token) or the turn ends. Same `{ text }` shape as notice; the event name is
 * what carries the transient-vs-persistent distinction, so the client never guesses by matching
 * text (which would break i18n).
 */
export interface StatusEventData {
  text: string
}

export interface ResultEventData {
  stop_reason: string | null
  model?: string | null
  stopped?: string
}

export interface ErrorEventData {
  message: string
}

/** One link inside an approval action. `password`, when present, is always '***' (masked). */
export interface ApprovalLink {
  destination: string
  slug?: string
  name?: string
  password?: string
  expires_at?: string
  utm?: Record<string, string>
}

export interface ApprovalAction {
  tool: string
  mode: 'single' | 'bulk'
  links: ApprovalLink[]
}

export interface ApprovalRequestEventData {
  proposal_id: string
  action: ApprovalAction
  /** Final, already-resolved user-facing sentence — shown verbatim, NOT templated client-side. */
  render: string
}

/**
 * A `chart` event: structured analytics data li2-ai emits when a chart-able read tool runs, so the
 * UI renders a REAL chart component instead of the model drawing one in prose. `kind` is the
 * discriminator the renderer switches on; `data` is the tool's structured payload verbatim (reused
 * from the shared tool schema — never redefined here). Aggregate analytics only — no secret/PII.
 */
export interface ChartEventData {
  kind: 'clicks_timeseries'
  data: ClicksTimeseries
}

/**
 * A `qr` event: li2-ai emits one per link created by the write tool (turn 2, no LLM), between the
 * template `token` and the terminal `result`. The frame is flat (no `{kind, data}` envelope like
 * `chart` — `qr` has exactly one shape) and carries no image bytes: the browser re-encodes the QR
 * client-side from `short_url` via the existing `qr-code-styling` stack. `link_id` is the created
 * touch-point id, used to link the tile's name to the in-app detail page — OPTIONAL on the wire
 * (an older li2-ai omits it), so the UI renders the name as plain text when it is absent.
 */
export interface QrEventData {
  short_url: string
  name: string
  link_id?: string
}

// --- Domain model the panel renders from ---

export type ApprovalDecision = 'approve' | 'reject'

/**
 * The approval card's lifecycle: `pending` → user acts → `approving`/`rejecting` → `resolved` (the
 * decision turn ended cleanly) or `failed` (it errored — neutral badge, NEVER a green "approved").
 */
export type ApprovalStatus = 'pending' | 'approving' | 'rejecting' | 'resolved' | 'failed'

export interface ApprovalState {
  proposalId: string
  action: ApprovalAction
  render: string
  status: ApprovalStatus
  /** Which decision the user took, once they have acted. */
  decision: ApprovalDecision | null
}

/**
 * One rendered chart on an assistant message — the domain mirror of a `chart` SSE event. Kept as a
 * plain slice of the wire shape (kind + data) so <ChatChart> stays dumb, exactly like ApprovalState
 * vs ApprovalRequestEventData. `id` is a client-generated stable identity (the wire frame carries
 * none): it is the React key, so a chart never reconciles its recharts instance onto another chart's
 * when the list is reset (retry) or reordered.
 */
export interface ChartState {
  id: string
  kind: 'clicks_timeseries'
  data: ClicksTimeseries
}

/**
 * One rendered QR tile on an assistant message — the domain mirror of a `qr` SSE event, one per
 * created link. `id` is a client-generated stable identity (the wire frame carries none), same
 * role as `ChartState.id`: the React key so a tile never reconciles onto another's QR instance.
 * `linkId` is the created touch-point id (distinct from `id` — the render key), used to build the
 * in-app detail-page link; optional, mirroring `QrEventData.link_id` (absent on an older server).
 */
export interface QrState {
  id: string
  short_url: string
  name: string
  linkId?: string
}

/**
 * `stopped` = the user cancelled the turn (Stop button) — a neutral end, never an error and never a
 * success. Distinct from `done` (clean finish) and `error` (failure).
 */
export type MessageStatus = 'streaming' | 'done' | 'error' | 'stopped'

/**
 * Why a turn failed, when `status === 'error'`:
 * - `not-entitled`: plan gate (mint 403) → show upsell copy, NOT retryable.
 * - `offline`: the browser could not reach the server (fetch TypeError) → show offline copy, retryable.
 * - `generic`: any other backend/transport failure → show `errorText`, retryable.
 */
export type ErrorKind = 'not-entitled' | 'offline' | 'generic'

/** Monthly AI spend snapshot from li2-ai GET /usage. spent_micro = µUSD; budget_cents = cents. */
export interface UsageData {
  spent_micro: number
  budget_cents: number
  currency: string
  month: string
}

/**
 * File người dùng gửi kèm một lượt, hiện thành chip trên bong bóng của họ.
 *
 * Chỉ giữ ba thứ để HIỂN THỊ, không giữ `File` gốc: bong bóng sống suốt phiên, còn `File` giữ một
 * tham chiếu tới dữ liệu đã được gửi đi rồi — ôm nó lại là giữ vài MB trong bộ nhớ cho một dòng
 * chữ 30 ký tự.
 */
export interface ChatAttachment {
  name: string
  /** MIME, dùng để chọn nhãn ngắn ("PDF", "PNG"…). */
  contentType: string
  sizeBytes: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  /** Chỉ trên bong bóng người dùng, và chỉ khi lượt đó có file. */
  attachment?: ChatAttachment
  /**
   * The client-generated turn_id sent for the turn that produced THIS bubble — identical to what
   * li2-ai recorded (session.py uses `body.turn_id`). Present on assistant bubbles once their turn
   * starts; the feedback POST keys on it. Stable across a Retry (the retry reuses the same body).
   */
  turn_id?: string
  /** Warning lines from `notice` events (rendered above the prose). */
  notices: string[]
  /**
   * The CURRENT transient progress line from a `status` event (e.g. "Đang đọc tài liệu…").
   * A single replaceable slot, not a list: each status overwrites the last, and it is cleared
   * (undefined) on the first token or any terminal — so a now-finished "Đang đọc…" never
   * lingers. Distinct from `notices[]`, which persist. Only shown while the message streams.
   */
  progress?: string
  /** Present only on the assistant message that carried an `approval_request`. */
  approval?: ApprovalState
  /**
   * Charts from `chart` events on this turn (an array — one turn can call the chart tool more than
   * once). Rendered as real chart components, independent of the prose, like `approval`.
   */
  charts?: ChartState[]
  /**
   * QR tiles from `qr` events on this turn (an array — a bulk create yields one per link).
   * Rendered as real `<ChatQr>` tiles, independent of the prose, like `charts`.
   */
  qrCodes?: QrState[]
  status: MessageStatus
  stopReason?: string | null
  /** Set when this message ended on an `error` event or a transport failure. */
  errorText?: string
  /**
   * Distinguishes a plan-gate refusal (mint 403 → upsell copy), an offline blip (retryable, offline
   * copy), and any other error (retryable, `errorText`). Only meaningful when `status === 'error'`.
   */
  errorKind?: ErrorKind
  /**
   * The user's 👍/👎 on this answer, set optimistically on click (1 = up, -1 = down). Undefined =
   * not yet rated. The backend UPSERTs on (turn_id, user_id), so switching 👍↔👎 is allowed; there
   * is NO "unset" (rating is ±1 only), so once rated a bubble stays rated — a click can only switch.
   */
  feedback?: 1 | -1
}
