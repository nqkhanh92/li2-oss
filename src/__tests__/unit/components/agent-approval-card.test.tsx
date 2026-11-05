import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ApprovalCard } from '@/features/agent-chat/components/approval-card'
import type { ApprovalState } from '@/features/agent-chat/types'

// Mirror the repo convention: mock react-i18next so t() returns the key path (agent-chat.json is
// added in Phase 3; the exact copy is irrelevant to these assertions — behavior is what matters).
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

function makeApproval(overrides?: Partial<ApprovalState>): ApprovalState {
  return {
    proposalId: 'prop-123',
    render: 'Tạo link rút gọn “promo” → https://example.com (có mật khẩu). Đồng ý?',
    status: 'pending',
    decision: null,
    action: {
      tool: 'create_short_link',
      mode: 'single',
      links: [
        {
          destination: 'https://example.com',
          slug: 'promo',
          // The server ALWAYS masks the password to '***' before it leaves li2-ai (B-note). The
          // card must render exactly what it is given and never anything resembling a real secret.
          password: '***',
          expires_at: '2026-08-01T00:00:00+00:00',
          utm: { utm_source: 'newsletter' },
        },
      ],
    },
    ...overrides,
  }
}

describe('ApprovalCard', () => {
  it('renders the masked password and NEVER a plaintext secret', () => {
    render(<ApprovalCard approval={makeApproval()} onDecide={vi.fn()} />)

    // The masked marker is shown…
    expect(screen.getByText('***')).toBeDefined()
    // …and no plaintext-looking password leaks into the DOM.
    expect(screen.queryByText('hunter2')).toBeNull()
    expect(document.body.textContent).not.toContain('hunter2')
  })

  it('shows destination, slug, expiry and UTM fields', () => {
    render(<ApprovalCard approval={makeApproval()} onDecide={vi.fn()} />)
    expect(screen.getByText('https://example.com')).toBeDefined()
    expect(screen.getByText('promo')).toBeDefined()
    expect(screen.getByText('2026-08-01T00:00:00+00:00')).toBeDefined()
    expect(screen.getByText('newsletter')).toBeDefined()
  })

  it('fires onDecide("approve") with the proposal id when Approve is clicked', () => {
    const onDecide = vi.fn()
    render(<ApprovalCard approval={makeApproval()} onDecide={onDecide} />)

    fireEvent.click(screen.getByText('approve'))
    expect(onDecide).toHaveBeenCalledWith('prop-123', 'approve')
  })

  it('fires onDecide("reject") when Reject is clicked', () => {
    const onDecide = vi.fn()
    render(<ApprovalCard approval={makeApproval()} onDecide={onDecide} />)

    fireEvent.click(screen.getByText('reject'))
    expect(onDecide).toHaveBeenCalledWith('prop-123', 'reject')
  })

  it('hides the action buttons once a decision is resolved', () => {
    const onDecide = vi.fn()
    render(
      <ApprovalCard
        approval={makeApproval({ status: 'resolved', decision: 'approve' })}
        onDecide={onDecide}
      />
    )
    // No approve/reject buttons after resolution — only the outcome badge.
    expect(screen.queryByText('approve')).toBeNull()
    expect(screen.queryByText('reject')).toBeNull()
    expect(screen.getByText('approved')).toBeDefined()
  })

  it('disables buttons while a decision is in flight (approving)', () => {
    render(
      <ApprovalCard
        approval={makeApproval({ status: 'approving', decision: 'approve' })}
        onDecide={vi.fn()}
      />
    )
    // In-flight shows the "deciding" state, not clickable buttons.
    expect(screen.queryByText('approve')).toBeNull()
    expect(screen.getByText('deciding')).toBeDefined()
  })

  it('shows a neutral "action failed" badge — NEVER "approved" — when the decision turn failed', () => {
    render(
      <ApprovalCard
        // The user approved, but the turn errored: status resolves to 'failed', not 'resolved'.
        approval={makeApproval({ status: 'failed', decision: 'approve' })}
        onDecide={vi.fn()}
      />
    )
    // Buttons are gone, and the badge must not claim success for a write that may not have run.
    expect(screen.queryByText('approve')).toBeNull()
    expect(screen.queryByText('reject')).toBeNull()
    expect(screen.queryByText('approved')).toBeNull()
    expect(screen.getByText('actionFailed')).toBeDefined()
  })
})
