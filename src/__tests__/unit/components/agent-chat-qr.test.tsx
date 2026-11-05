import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { forwardRef, useImperativeHandle } from 'react'
import { ChatQr } from '@/features/agent-chat/components/chat-qr'
import type { QrState } from '@/features/agent-chat/types'

// Mirror the repo convention: t() returns the key path (exact copy is irrelevant to behavior).
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const handleCopyQrMock = vi.fn()

// ChatQr reuses the SAME QR stack the short-link list uses. Fake it to a plain canvas + an
// imperative handle exposing handleCopyQr — the ref is the only thing ChatQr calls on it. The
// forwardRef callback must stay INLINE (not hoisted to a top-level const): vi.mock factories are
// hoisted above all other top-level code, so a separate const would be read before initialized.
vi.mock('@/features/bootstrap/components/qr-render', () => ({
  QrRenderWithRef: forwardRef(function MockQrRenderWithRef(
    _props: unknown,
    ref: React.Ref<{ handleCopyQr: () => void }>
  ) {
    useImperativeHandle(ref, () => ({ handleCopyQr: handleCopyQrMock }))
    return <div data-testid="qr-canvas" />
  }),
  DownloadQrPopover: ({ button }: { button: React.ReactNode }) => (
    <div data-testid="download-popover">{button}</div>
  ),
}))

vi.mock('@/features/touch-points/constants', () => ({
  getQrDefaultOptions: (url: string) => ({ data: url }),
}))

// The name links to `/org/<id>/short-links/<linkId>`, so the tile needs the current org.
vi.mock('@/shared/providers/organization-store-provider', () => ({
  useOrganizationStoreProvider: () => ({ organization: { id: 'org-1' } }),
}))

function makeQr(overrides?: Partial<QrState>): QrState {
  return { id: 'q1', short_url: 'https://li2.ai/abc123', name: 'Khuyến mãi hè', ...overrides }
}

describe('ChatQr', () => {
  it('renders the QR canvas, the link name, and download + copy controls', () => {
    render(<ChatQr qr={makeQr()} />)
    expect(screen.getByTestId('qr-canvas')).toBeDefined()
    expect(screen.getByText('Khuyến mãi hè')).toBeDefined()
    expect(screen.getByTestId('download-popover')).toBeDefined()
    expect(screen.getByText('common:buttons.copy_qr')).toBeDefined()
  })

  it('calls handleCopyQr when the copy button is clicked', () => {
    render(<ChatQr qr={makeQr()} />)
    fireEvent.click(screen.getByText('common:buttons.copy_qr'))
    expect(handleCopyQrMock).toHaveBeenCalledTimes(1)
  })

  it('links the name to the in-app detail page, opening a new tab, when linkId is present', () => {
    render(<ChatQr qr={makeQr({ linkId: 'tp-9' })} />)
    const link = screen.getByRole('link', { name: 'Khuyến mãi hè' })
    expect(link.getAttribute('href')).toBe('/org/org-1/short-links/tp-9')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('renders the name as plain text (no link) when linkId is absent (older server)', () => {
    render(<ChatQr qr={makeQr()} />)
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText('Khuyến mãi hè')).toBeDefined()
  })
})
