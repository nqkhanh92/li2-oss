'use client'

/**
 * Scrollable message list. Auto-scrolls to the bottom as tokens stream in and as new messages are
 * appended, so the latest content stays in view during a turn.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollArea } from '@/shared/components/ui/scroll-area'
import { useAgentChatContext } from '@/shared/providers/agent-chat-provider'
import type { ChatMessage as ChatMessageT } from '../types'
import { ChatMessage } from './chat-message'

interface MessageListProps {
  messages: ChatMessageT[]
  onDecide: (proposalId: string, decision: 'approve' | 'reject') => void
  /** True while any turn is streaming — forwarded to pending approval cards. */
  busy: boolean
}

// How close to the bottom (px) counts as "already there" — inside this, new content auto-scrolls;
// outside it, the user scrolled up on purpose and we must not yank them back down.
const NEAR_BOTTOM_PX = 80

export function MessageList({ messages, onDecide, busy }: MessageListProps) {
  const { t } = useTranslation('agent-chat')
  const ctx = useAgentChatContext()
  const bottomRef = useRef<HTMLDivElement>(null)
  // The ScrollArea root, not the viewport — Radix nests the actual scrolling element inside it as
  // `[data-radix-scroll-area-viewport]`, so we look it up via this ref rather than trying to attach
  // a ref straight to the viewport (ScrollArea doesn't expose one).
  const rootRef = useRef<HTMLDivElement>(null)
  const [nearBottom, setNearBottom] = useState(true)
  const prevCountRef = useRef(0)
  // Drives the scroll-listener effect to re-attach on the empty→populated flip: the ScrollArea (and
  // its viewport) only exists in the populated branch, so the listener can't attach until then.
  const hasMessages = messages.length > 0

  const getViewport = useCallback((): HTMLElement | null => {
    return rootRef.current?.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]') ?? null
  }, [])

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    bottomRef.current?.scrollIntoView({ behavior, block: 'end' })
  }, [])

  // Attach the scroll listener once the viewport is in the DOM. The empty state renders a DIFFERENT
  // tree with no ScrollArea, so at first mount getViewport() is null; re-running on `hasMessages`
  // catches the moment the populated branch (and its viewport) mounts. Cleanup on the reverse flip
  // (New Chat) removes the listener — no leak.
  useEffect(() => {
    const viewport = getViewport()
    if (!viewport) return
    const handleScroll = () => {
      const distanceFromBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight
      setNearBottom(distanceFromBottom <= NEAR_BOTTOM_PX)
    }
    viewport.addEventListener('scroll', handleScroll, { passive: true })
    return () => viewport.removeEventListener('scroll', handleScroll)
  }, [getViewport, hasMessages])

  // Re-run on every message-array change. The streaming assistant message is a NEW array each token
  // (immutable update in the provider), so this fires per token. Only auto-scroll when the user is
  // already near the bottom, OR a brand-new message just got appended (they just sent one) — a user
  // who scrolled up to read history must never get yanked back down mid-stream.
  useEffect(() => {
    const isNewMessage = messages.length > prevCountRef.current
    prevCountRef.current = messages.length
    if (nearBottom || isNewMessage) {
      scrollToBottom()
    }
  }, [messages, nearBottom, scrollToBottom])

  if (messages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        {/*
          CHỈ một dòng. Trước đây khối này còn có `empty.hint` ("Try one of these…") và ba nút gợi
          ý — mà composer ngay bên dưới đã có đúng ba chip đó rồi. Chủ sản phẩm báo 2026-11-02:
          *"create a link example bị trùng 2 lần, bỏ hàng trên"*. Giữ bản ở composer vì nó còn ở
          đó cả khi hội thoại chưa rỗng nữa.
        */}
        <p className="text-sm text-muted-foreground">{t('empty.title')}</p>
      </div>
    )
  }

  return (
    <div className="relative h-full">
      <ScrollArea ref={rootRef} className="h-full">
        <div
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          aria-busy={busy}
          className="flex flex-col gap-4 px-4 py-4"
        >
          {messages.map((m) => (
            <ChatMessage key={m.id} message={m} onDecide={onDecide} busy={busy} />
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {!nearBottom && (
        <button
          type="button"
          onClick={() => scrollToBottom('smooth')}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-md transition-colors hover:bg-slate-50"
        >
          {t('scrollToLatest')}
        </button>
      )}
    </div>
  )
}
