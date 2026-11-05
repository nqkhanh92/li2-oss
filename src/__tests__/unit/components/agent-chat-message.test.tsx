import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChatMessage } from '@/features/agent-chat/components/chat-message'
import type { ChatMessage as ChatMessageT } from '@/features/agent-chat/types'

// Mirror the repo convention: t() returns the key path (exact copy is irrelevant to behavior).
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

// ChatMessage reads isStreaming/retryableMessageId/retryLast from context; only the retry line
// touches them and these tests never assert on retry, so a minimal stub is enough.
vi.mock('@/shared/providers/agent-chat-provider', () => ({
  useAgentChatContext: () => ({ isStreaming: true, retryableMessageId: null, retryLast: vi.fn() }),
}))

// Isolate the progress-line logic from the markdown pipeline: render the prose text as-is so a
// non-empty `text` is present in the DOM without pulling in remark/rehype.
vi.mock('@/features/agent-chat/components/markdown-message', () => ({
  MarkdownMessage: ({ text }: { text: string }) => <div>{text}</div>,
}))

function makeMessage(overrides?: Partial<ChatMessageT>): ChatMessageT {
  return {
    id: 'm1',
    role: 'assistant',
    text: '',
    notices: [],
    status: 'streaming',
    ...overrides,
  }
}

describe('ChatMessage progress line', () => {
  it('shows the progress spinner even AFTER preamble prose has streamed (KB-flow regression)', () => {
    // The KB flow streams a preamble token first (text becomes non-empty), THEN emits status while
    // it fetches docs + synthesizes. Gating the spinner on !text hid it for that whole gap. This is
    // the exact shape the user saw: preamble prose present + an active "Đang soạn…" status.
    render(
      <ChatMessage
        message={makeMessage({
          text: 'Tôi sẽ tìm kiếm tài liệu về quản lý short link cho bạn.',
          progress: 'Đang soạn câu trả lời từ tài liệu…',
        })}
        onDecide={vi.fn()}
        busy={false}
      />
    )
    expect(screen.getByText('Đang soạn câu trả lời từ tài liệu…')).toBeDefined()
    // The preamble prose is still rendered above it — the spinner is additive, not a replacement.
    expect(
      screen.getByText('Tôi sẽ tìm kiếm tài liệu về quản lý short link cho bạn.')
    ).toBeDefined()
  })

  it('shows the progress spinner when a status arrives before any prose', () => {
    render(
      <ChatMessage
        message={makeMessage({ text: '', progress: 'Đang đọc tài liệu…' })}
        onDecide={vi.fn()}
        busy={false}
      />
    )
    expect(screen.getByText('Đang đọc tài liệu…')).toBeDefined()
  })

  it('hides the progress line once the message is no longer streaming', () => {
    // `progress` is cleared on every terminal, but guard the render on `streaming` too so a stale
    // value can never show beside a finished answer.
    render(
      <ChatMessage
        message={makeMessage({ text: 'câu trả lời', progress: 'Đang soạn…', status: 'done' })}
        onDecide={vi.fn()}
        busy={false}
      />
    )
    expect(screen.queryByText('Đang soạn…')).toBeNull()
  })
})
