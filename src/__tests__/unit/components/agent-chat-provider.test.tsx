import { describe, it, expect, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import type { TurnHandlers } from '@/features/agent-chat/hooks/use-agent-chat-transport'
import { AgentChatProvider, useAgentChatContext } from '@/shared/providers/agent-chat-provider'

// No provider-level test existed for the `chart` seam before this — this is NEW coverage (not a
// mirror of an existing test), added while wiring the `qr` seam through the same drive() driver.

vi.mock('@/shared/providers/organization-store-provider', () => ({
  useOrganizationStoreProvider: () => ({ organization: { id: 'org-1' } }),
}))

// Stable across renders (module scope, not created inside the factory): the provider's org-switch
// effect depends on `reset`'s identity ([orgId, reset]) — a fresh vi.fn() on every render would
// re-fire that effect every render → setState → re-render → infinite loop → OOM.
const runTurnMock = vi.fn()
const abortMock = vi.fn()
const resetMock = vi.fn()
const fetchUsageMock = vi.fn().mockResolvedValue(null)
vi.mock('@/features/agent-chat/hooks/use-agent-chat-transport', () => ({
  useAgentChatTransport: () => ({
    runTurn: runTurnMock,
    abort: abortMock,
    reset: resetMock,
    fetchUsage: fetchUsageMock,
  }),
}))

function Probe() {
  const { messages, sendMessage } = useAgentChatContext()
  const assistant = messages.find((m) => m.role === 'assistant')
  return (
    <div>
      <button onClick={() => sendMessage('tạo link tới example.com')}>send</button>
      <div data-testid="qr-count">{assistant?.qrCodes?.length ?? 0}</div>
      <div data-testid="qr-linkids">
        {(assistant?.qrCodes ?? []).map((q) => q.linkId).join(',')}
      </div>
    </div>
  )
}

describe('AgentChatProvider — onQr', () => {
  it('appends each qr frame to the assistant message qrCodes, in order, carrying link_id', async () => {
    runTurnMock.mockImplementation(async (_body: unknown, handlers: TurnHandlers) => {
      handlers.onQr?.({ short_url: 'https://li2.ai/a', name: 'a', link_id: 'tp-a' })
      handlers.onQr?.({ short_url: 'https://li2.ai/b', name: 'b', link_id: 'tp-b' })
      handlers.onResult?.({ stop_reason: 'end_turn' })
    })

    render(
      <AgentChatProvider>
        <Probe />
      </AgentChatProvider>
    )

    await act(async () => {
      screen.getByText('send').click()
    })

    expect(screen.getByTestId('qr-count').textContent).toBe('2')
    // link_id maps to QrState.linkId (distinct from the client-generated render key `id`), in order.
    expect(screen.getByTestId('qr-linkids').textContent).toBe('tp-a,tp-b')
  })
})
