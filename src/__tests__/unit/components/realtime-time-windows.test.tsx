// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const realtimeVi = require('../../../../public/lang/vi/realtime.json')

function translate(key: string) {
  const path = key.replace(/^realtime:/, '')
  const value = path.split('.').reduce<unknown>((o, k) => (o as never)?.[k], realtimeVi)
  return typeof value === 'string' ? value : path
}

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: translate }),
}))

vi.mock('next/navigation', () => ({
  useParams: () => ({ org_id: 'khanhqns-organization' }),
}))

const useRealtimeTopLinks = vi.fn()
const useRealtimeInteractionsInfinite = vi.fn()

vi.mock('@/features/realtime-data/hooks/use-realtime-top-links', () => ({
  useRealtimeTopLinks: (...args: unknown[]) => useRealtimeTopLinks(...args),
}))
vi.mock('@/features/realtime-data/hooks/use-realtime-interactions-infinite', () => ({
  useRealtimeInteractionsInfinite: (...args: unknown[]) => useRealtimeInteractionsInfinite(...args),
}))
vi.mock('@/features/realtime-data/hooks/use-realtime-summary', () => ({
  useRealtimeSummary: () => ({ data: null, isLoading: false }),
}))

// Globe kéo theo deck.gl/WebGL — không dựng được trong jsdom; chỉ cần nhãn cửa sổ nó nhận.
vi.mock('@/features/realtime-data/components/realtime-globe', () => ({
  RealtimeGlobe: ({ timeWindowLabel }: { timeWindowLabel?: string }) => (
    <div data-testid="globe">{timeWindowLabel}</div>
  ),
}))
vi.mock('@/features/realtime-data/components/realtime-hero-metrics', () => ({
  RealtimeHeroMetrics: () => <div />,
}))
vi.mock('@/features/realtime-data/components/realtime-top-links', () => ({
  RealtimeTopLinks: () => <div />,
}))

import RealtimeData, { TIME_WINDOWS, DEFAULT_WINDOW } from '@/features/realtime-data/components'

const lastHoursSentToFeed = () =>
  (useRealtimeInteractionsInfinite.mock.calls.at(-1)?.[0] as { p_last_hours: number }).p_last_hours

const lastHoursSentToTopLinks = () => useRealtimeTopLinks.mock.calls.at(-1)?.[1] as number

describe('RealtimeData — cửa sổ thời gian 24h / 3 ngày / 7 ngày', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useRealtimeTopLinks.mockReturnValue({ data: [], isLoading: false })
    useRealtimeInteractionsInfinite.mockReturnValue({
      data: { pages: [] },
      isLoading: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
    })
  })

  it('chỉ có ba cửa sổ 24/72/168 giờ, mặc định 24h', () => {
    expect(TIME_WINDOWS.map((tw) => tw.value)).toEqual([24, 72, 168])
    expect(DEFAULT_WINDOW.value).toBe(24)
  })

  it('mặc định gửi p_last_hours = 24 cho feed và top links', () => {
    render(<RealtimeData />)

    expect(lastHoursSentToFeed()).toBe(24)
    expect(lastHoursSentToTopLinks()).toBe(24)
    expect(screen.getByTestId('globe').textContent).toBe('24 giờ')
  })

  it.each([
    ['3 ngày', 72],
    ['7 ngày', 168],
  ])('chọn %s gửi p_last_hours = %i (trong mức cap 168 của route)', (label, hours) => {
    render(<RealtimeData />)

    fireEvent.click(screen.getByRole('button', { name: label }))

    expect(lastHoursSentToFeed()).toBe(hours)
    expect(lastHoursSentToTopLinks()).toBe(hours)
    expect(screen.getByTestId('globe').textContent).toBe(label)
  })
})
