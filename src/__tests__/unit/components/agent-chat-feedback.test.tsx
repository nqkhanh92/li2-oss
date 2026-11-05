import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FeedbackButtons } from '@/features/agent-chat/components/feedback-buttons'
import { ChatMessage } from '@/features/agent-chat/components/chat-message'
import type { ChatMessage as ChatMessageT } from '@/features/agent-chat/types'

// t() returns the key path (repo convention) → aria-labels are 'feedback.up' / 'feedback.down'.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

// A shared spy so the ChatMessage eligibility tests can assert the wired onRate → submitFeedback.
// vi.hoisted keeps it defined before the (hoisted) vi.mock factory runs.
const { submitFeedback } = vi.hoisted(() => ({ submitFeedback: vi.fn() }))
vi.mock('@/shared/providers/agent-chat-provider', () => ({
  useAgentChatContext: () => ({
    isStreaming: false,
    retryableMessageId: null,
    retryLast: vi.fn(),
    submitFeedback,
  }),
}))

// Render prose as-is — isolate eligibility from the markdown pipeline (no remark/rehype).
vi.mock('@/features/agent-chat/components/markdown-message', () => ({
  MarkdownMessage: ({ text }: { text: string }) => <div>{text}</div>,
}))

describe('FeedbackButtons', () => {
  it('renders both thumbs and reflects the current rating via aria-pressed', () => {
    render(<FeedbackButtons feedback={1} onRate={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'feedback.up' }).getAttribute('aria-pressed')).toBe(
      'true'
    )
    expect(screen.getByRole('button', { name: 'feedback.down' }).getAttribute('aria-pressed')).toBe(
      'false'
    )
  })

  it('calls onRate with the clicked rating', () => {
    const onRate = vi.fn()
    render(<FeedbackButtons onRate={onRate} />)
    fireEvent.click(screen.getByRole('button', { name: 'feedback.down' }))
    expect(onRate).toHaveBeenCalledWith(-1)
  })
})

function makeMessage(overrides?: Partial<ChatMessageT>): ChatMessageT {
  return { id: 'm1', role: 'assistant', text: '', notices: [], status: 'streaming', ...overrides }
}

function renderMessage(overrides?: Partial<ChatMessageT>) {
  return render(<ChatMessage message={makeMessage(overrides)} onDecide={vi.fn()} busy={false} />)
}

describe('ChatMessage — feedback eligibility', () => {
  beforeEach(() => submitFeedback.mockClear())

  it('shows thumbs on a finished plain answer that has a turn_id', () => {
    renderMessage({ status: 'done', text: 'câu trả lời', turn_id: 't-1' })
    expect(screen.getByRole('button', { name: 'feedback.up' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'feedback.down' })).toBeDefined()
  })

  it('wires a click through to submitFeedback with the message id + rating', () => {
    renderMessage({ status: 'done', text: 'câu trả lời', turn_id: 't-1' })
    fireEvent.click(screen.getByRole('button', { name: 'feedback.up' }))
    expect(submitFeedback).toHaveBeenCalledWith('m1', 1)
  })

  it('hides thumbs while the answer is still streaming', () => {
    renderMessage({ status: 'streaming', text: 'đang trả lời', turn_id: 't-1' })
    expect(screen.queryByRole('button', { name: 'feedback.up' })).toBeNull()
  })

  it('hides thumbs on an approval bubble — a proposal is not a rateable answer', () => {
    renderMessage({
      status: 'done',
      text: 'Tạo link?',
      turn_id: 't-1',
      approval: {
        proposalId: 'p1',
        action: { tool: 'create_short_link', mode: 'single', links: [] },
        render: 'OK?',
        status: 'pending',
        decision: null,
      },
    })
    expect(screen.queryByRole('button', { name: 'feedback.up' })).toBeNull()
  })

  it('hides thumbs on an errored turn', () => {
    renderMessage({ status: 'error', text: '', turn_id: 't-1', errorKind: 'generic' })
    expect(screen.queryByRole('button', { name: 'feedback.up' })).toBeNull()
  })

  it('hides thumbs when the bubble has no turn_id (untraced turn — nothing to key the rating on)', () => {
    renderMessage({ status: 'done', text: 'câu trả lời' })
    expect(screen.queryByRole('button', { name: 'feedback.up' })).toBeNull()
  })
})
