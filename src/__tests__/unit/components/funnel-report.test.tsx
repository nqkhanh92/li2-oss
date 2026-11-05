import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FunnelReport } from '@/ee/features/funnels/components/funnel-report'
import { mockReport, mockEmptyReport } from '../../__mocks__/funnel-report.mock'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const funnelsEn = require('../../../../public/lang/en/funnels.json')
function getNestedVal(obj: Record<string, any>, path: string): string {
  const val = path.split('.').reduce((o: any, k) => o?.[k], obj)
  return typeof val === 'string' ? val : path
}
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, any>) => {
      const val = getNestedVal(funnelsEn, key)
      if (!params) return val
      return val.replace(/\{\{(\w+)\}\}/g, (_: string, k: string) => String(params[k] ?? ''))
    },
  }),
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useParams: () => ({ org_id: 'org-123', funnel_id: 'funnel-123' }),
}))

// Mock the query hooks
const mockUseGetFunnelReport = vi.fn()
const mockUseGetFunnel = vi.fn()
vi.mock('@/ee/features/funnels/hooks/queries', () => ({
  useGetFunnelReport: (...args: unknown[]) => mockUseGetFunnelReport(...args),
  useGetFunnel: (...args: unknown[]) => mockUseGetFunnel(...args),
  useGetStepVisitors: () => ({ data: null, isLoading: false }),
}))

vi.mock('@/ee/features/event-rules/hooks/queries', () => ({
  useGetEventNames: () => ({ data: null }),
  useGetEventRules: () => ({ data: null }),
}))

// Mock DateRangePicker to simplify testing
vi.mock('@/shared/components/customize/date-range-picker', () => ({
  DateRangePicker: ({ value, onValueChange, placeholder }: any) => (
    <button
      data-testid="date-range-picker"
      onClick={() =>
        onValueChange({
          from: new Date('2026-01-01'),
          to: new Date('2026-01-07'),
        })
      }
    >
      {placeholder}
    </button>
  ),
}))

// Mock ContentLayout to avoid Sidebar context requirement
vi.mock('@/shared/components/layout/content-layout', () => ({
  ContentLayout: ({ children, title }: any) => <div><h1>{title}</h1>{children}</div>,
}))

describe('FunnelReport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default mock for useGetFunnel
    mockUseGetFunnel.mockReturnValue({
      data: {
        data: {
          funnel_steps: [
            { position: 1, pattern_type: 'page' },
            { position: 2, pattern_type: 'page' },
            { position: 3, pattern_type: 'page' },
          ],
        },
      },
    })
  })

  it('shows loading skeleton while fetching', () => {
    mockUseGetFunnelReport.mockReturnValue({
      data: undefined,
      isLoading: true,
    })

    const { container } = render(<FunnelReport />)

    // Skeleton renders as div with animate-pulse class
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders funnel name after loading', () => {
    mockUseGetFunnelReport.mockReturnValue({
      data: { data: mockReport },
      isLoading: false,
    })

    render(<FunnelReport />)

    expect(screen.getByText('E-Commerce Funnel')).toBeDefined()
  })

  it('renders summary metrics', () => {
    mockUseGetFunnelReport.mockReturnValue({
      data: { data: mockReport },
      isLoading: false,
    })

    render(<FunnelReport />)

    // FunnelSummary renders these labels
    expect(screen.getByText('Total Entries')).toBeDefined()
    expect(screen.getByText('Conversions')).toBeDefined()
    expect(screen.getByText('Conversion Rate')).toBeDefined()
  })

  it('renders funnel chart with correct steps', () => {
    mockUseGetFunnelReport.mockReturnValue({
      data: { data: mockReport },
      isLoading: false,
    })

    render(<FunnelReport />)

    // Step names appear in step tabs and table — at least one instance each
    expect(screen.getAllByText('Homepage').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Products').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Checkout').length).toBeGreaterThanOrEqual(1)
  })

  it('renders drop-off insight card', () => {
    mockUseGetFunnelReport.mockReturnValue({
      data: { data: mockReport },
      isLoading: false,
    })

    render(<FunnelReport />)

    expect(screen.getByText('Biggest Drop-off')).toBeDefined()
  })

  it('shows empty state for zero entries', () => {
    mockUseGetFunnelReport.mockReturnValue({
      data: { data: mockEmptyReport },
      isLoading: false,
    })

    render(<FunnelReport />)

    // mockEmptyReport has has_pageviews_in_period: false → renders "No visitors" state
    expect(screen.getByText('Verify Installation')).toBeDefined()
  })

  it('shows empty state for no steps', () => {
    const noStepsReport = { ...mockReport, steps: [] }
    mockUseGetFunnelReport.mockReturnValue({
      data: { data: noStepsReport },
      isLoading: false,
    })

    render(<FunnelReport />)

    expect(screen.getByText('No steps configured')).toBeDefined()
  })

  it('renders step details toggle button', () => {
    mockUseGetFunnelReport.mockReturnValue({
      data: { data: mockReport },
      isLoading: false,
    })

    render(<FunnelReport />)

    // Step Details section is always visible — appears at least once
    expect(screen.getAllByText('Step Details').length).toBeGreaterThanOrEqual(1)
  })

  it('shows step details table when toggled', () => {
    mockUseGetFunnelReport.mockReturnValue({
      data: { data: mockReport },
      isLoading: false,
    })

    render(<FunnelReport />)

    // Step details table is always rendered with the report — check for unique column headers
    expect(screen.getAllByText('Proceeds').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Entries').length).toBeGreaterThanOrEqual(1)
  })

  it('calls useGetFunnelReport with correct params', () => {
    mockUseGetFunnelReport.mockReturnValue({
      data: undefined,
      isLoading: true,
    })

    render(<FunnelReport />)

    // Should be called with org_id, funnel_id, date strings, and options object
    expect(mockUseGetFunnelReport).toHaveBeenCalledWith(
      'org-123',
      'funnel-123',
      expect.any(String), // from date
      expect.any(String), // to date
      expect.any(Object)  // options (refetchInterval)
    )
  })

  it('changing date range updates query params', () => {
    mockUseGetFunnelReport.mockReturnValue({
      data: { data: mockReport },
      isLoading: false,
    })

    render(<FunnelReport />)

    // Click the mocked date range picker to change dates
    fireEvent.click(screen.getByTestId('date-range-picker'))

    // Should re-render and call hook with new date params
    expect(mockUseGetFunnelReport.mock.calls.length).toBeGreaterThanOrEqual(2)
    // Last call should have the new dates from our mock
    const lastCall = mockUseGetFunnelReport.mock.calls.at(-1)
    expect(lastCall).toBeDefined()
    expect(lastCall?.[2]).toBe('2026-01-01')
    expect(lastCall?.[3]).toBe('2026-01-07')
  })

  it('hides drop-off insight when only one step', () => {
    const singleStepReport = {
      ...mockReport,
      steps: [mockReport.steps[0]],
    }
    mockUseGetFunnelReport.mockReturnValue({
      data: { data: singleStepReport },
      isLoading: false,
    })

    render(<FunnelReport />)

    expect(screen.queryByText('Biggest Drop-off')).toBeNull()
  })
})
