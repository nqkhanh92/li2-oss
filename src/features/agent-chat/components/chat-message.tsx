'use client'

/**
 * One chat message. A user message is a plain right-aligned bubble. An assistant message stacks:
 * notice lines → prose (Track 1 Markdown) → a transient progress line (muted + spinner, from
 * `status` events, only while streaming) → approval card (Track 2, when present) → charts (Track 3,
 * when present) → QR tiles (Track 4, when present) → an error/upsell line. The tracks are
 * independent — the card, charts, and QR tiles come from structured SSE events, never parsed from
 * the prose text. The progress line is distinct from the persistent amber `notices`: it is
 * "working now" and auto-clears when the answer starts.
 */

import { useState } from 'react'
import { AlertTriangle, ChevronDown, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/components/ui/button'
import { useAgentChatContext } from '@/shared/providers/agent-chat-provider'
import type { ChatMessage as ChatMessageT } from '../types'
import { MarkdownMessage } from './markdown-message'
import { ApprovalCard } from './approval-card'
import { ChatChart } from './chat-chart'
import { ChatQr } from './chat-qr'
import { FeedbackButtons } from './feedback-buttons'

/** Bulk creates render as compact tiles; past this count they collapse into a "N mã QR" group so
 *  a large batch does not flood the ~448px chat panel (locked in the Phase 6 plan §3.3). */
const QR_COLLAPSE_THRESHOLD = 3

interface ChatMessageProps {
  message: ChatMessageT
  onDecide: (proposalId: string, decision: 'approve' | 'reject') => void
  /** True while any turn is streaming — forwarded to a pending approval card to disable its buttons. */
  busy: boolean
}

export function ChatMessage({ message, onDecide, busy }: ChatMessageProps) {
  const { t } = useTranslation('agent-chat')
  const ctx = useAgentChatContext()
  const [qrExpanded, setQrExpanded] = useState(false)

  if (message.role === 'user') {
    const att = message.attachment
    return (
      <div className="flex flex-col items-end gap-1.5">
        {/*
          Chip file nằm TRÊN bong bóng, không nằm trong.
          Nó mô tả thứ đã đi kèm lượt đó, còn bong bóng là lời người dùng nói — gộp lại thì đọc ra
          như thể tên file là một phần của câu. Và khi nhìn lại hội thoại, câu hỏi thường gặp là
          "mình đã gửi file nào", nên nó đáng được tách ra chứ không chìm vào chữ.
        */}
        {att && (
          <div className="flex max-w-[85%] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs">
            <span className="shrink-0 rounded bg-rose-50 px-1.5 py-0.5 font-bold text-rose-700">
              {attachmentLabel(att.contentType, att.name)}
            </span>
            <span className="truncate text-slate-700">{att.name}</span>
            <span className="shrink-0 text-slate-400">{attachmentSize(att.sizeBytes)}</span>
          </div>
        )}
        <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
          {message.text}
        </div>
      </div>
    )
  }

  const streaming = message.status === 'streaming'
  const isNotEntitled = message.status === 'error' && message.errorKind === 'not-entitled'
  const isOffline = message.status === 'error' && message.errorKind === 'offline'
  // Retry shows only on the ONE bubble the provider marks retryable (the last turn), never mid-stream
  // and never on an older error — so clicking it always replays THIS message's turn, not a newer one.
  const canShowRetry =
    message.status === 'error' &&
    !isNotEntitled &&
    !ctx.isStreaming &&
    ctx.retryableMessageId === message.id
  // 👍/👎 shows only on a finished plain answer: a clean `done` turn with real prose, a turn_id to
  // key the rating on, and NO approval card (rating a create-link proposal is meaningless — decided
  // with Kei). Never on a streaming/error/stopped bubble, never on a bare typing/approval bubble.
  const canShowFeedback =
    message.status === 'done' && !!message.text && !message.approval && !!message.turn_id

  return (
    <div className="flex flex-col gap-2">
      {message.notices.map((n, i) => (
        <div
          key={i}
          className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{n}</span>
        </div>
      ))}

      {message.text && <MarkdownMessage text={message.text} />}

      {/* Transient progress line (e.g. "Đang đọc tài liệu…"): muted text + spinner, NOT an amber
          warning box — it is "working now", cleared the moment the answer streams. Shows whenever a
          status step is active, INCLUDING after preamble prose: the KB flow streams a preamble token
          first, THEN emits status while it fetches docs + synthesizes, so gating on !message.text
          would hide the spinner for that whole gap. `progress` auto-clears on the next token
          (provider onToken) and every terminal, so it never lingers beside the final answer. */}
      {streaming && message.progress && (
        <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
          <span>{message.progress}</span>
        </div>
      )}

      {/* Typing indicator: streaming with nothing rendered yet AND no progress line to show. */}
      {streaming && !message.text && !message.progress && !message.approval && (
        <div className="flex gap-1 py-1" aria-label={t('thinking')}>
          <Dot delay={0} />
          <Dot delay={0.15} />
          <Dot delay={0.3} />
        </div>
      )}

      {message.approval && (
        <ApprovalCard approval={message.approval} onDecide={onDecide} disabled={busy} />
      )}

      {/* Charts track: structured chart events → real components, independent of the prose. Hidden
          on an errored turn — a chart above a red "something went wrong" would read as success (and
          the failed turn's data may be partial). Keyed by the chart's own stable id, not the array
          index, so a reset/reorder never reconciles one chart's recharts state onto another. */}
      {message.status !== 'error' && message.charts?.map((c) => <ChatChart key={c.id} chart={c} />)}

      {/* QR track: one tile per created link (`qr` events), same gating + keying rule as charts.
          A batch over QR_COLLAPSE_THRESHOLD collapses behind a toggle so it doesn't flood the panel
          — but ONLY once the turn is no longer streaming. During a bulk stream the tiles arrive one
          at a time; collapsing on the frame that crosses the threshold would yank already-visible
          tiles behind a closed group (reads as data loss), so the collapse applies at the terminal.
          The container is a stable <div> (never swapped for another element type mid-stream) and the
          tiles are rendered in ONE place, so crossing the threshold never remounts a tile. */}
      {message.status !== 'error' &&
        message.qrCodes &&
        message.qrCodes.length > 0 &&
        (() => {
          const codes = message.qrCodes
          const collapsible = codes.length > QR_COLLAPSE_THRESHOLD && !streaming
          const hidden = collapsible && !qrExpanded
          return (
            <div className="flex flex-col gap-2">
              {collapsible && (
                <Button
                  type="button"
                  size="xs"
                  variant="tertiary"
                  onClick={() => setQrExpanded((v) => !v)}
                  iconRight={
                    <ChevronDown
                      className={cn('h-3.5 w-3.5 transition-transform', qrExpanded && 'rotate-180')}
                    />
                  }
                  className="w-fit"
                >
                  {t('qr.groupLabel', { count: codes.length })}
                </Button>
              )}
              {!hidden && codes.map((q) => <ChatQr key={q.id} qr={q} />)}
            </div>
          )
        })()}

      {isNotEntitled && (
        <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {t('error.notEntitled')}
        </div>
      )}
      {message.status === 'error' && !isNotEntitled && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{isOffline ? t('error.offline') : (message.errorText ?? t('error.generic'))}</span>
          {canShowRetry && (
            <Button
              size="xs"
              variant="tertiary"
              className="ml-auto shrink-0"
              onClick={() => ctx.retryLast()}
            >
              {t('retry')}
            </Button>
          )}
        </div>
      )}
      {/* Neutral — never an error style, never a green success. Any text streamed before the user
          hit Stop stays rendered above (via message.text), this is just the trailing status line. */}
      {message.status === 'stopped' && (
        <p className="text-xs text-muted-foreground">{t('stopped')}</p>
      )}

      {/* 👍/👎 track: a subtle rating row under a finished plain answer. Optimistic + best-effort —
          submitFeedback highlights the pick immediately and reverts silently if the POST fails. */}
      {canShowFeedback && (
        <FeedbackButtons
          feedback={message.feedback}
          onRate={(rating) => ctx.submitFeedback(message.id, rating)}
        />
      )}
    </div>
  )
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="h-2 w-2 animate-bounce rounded-full bg-slate-400"
      style={{ animationDelay: `${delay}s` }}
    />
  )
}

/**
 * Nhãn ngắn cho chip file. Lấy từ MIME chứ không từ đuôi tên — đuôi do người dùng đặt và có thể
 * nói dối, MIME do trình duyệt điền. Rơi về đuôi tên chỉ khi MIME không cho ra gì ngắn gọn.
 */
function attachmentLabel(contentType: string, fileName: string): string {
  const sub = contentType.split('/')[1] ?? ''
  const clean = sub.split(/[+.;]/)[0]
  if (clean && clean.length <= 5) return clean.toUpperCase()
  const ext = fileName.includes('.') ? fileName.split('.').pop() : ''
  return (ext || 'FILE').toUpperCase().slice(0, 5)
}

function attachmentSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
