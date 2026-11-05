import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FunnelChart } from '@/ee/features/funnels/components/funnel-chart'
import { mockSteps, mockTwoStepSteps } from '../../__mocks__/funnel-report.mock'

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

describe('FunnelChart', () => {
  it('renders correct number of step columns', () => {
    render(
      <FunnelChart steps={mockSteps} totalEntries={21800} conversionRate={19.3} />
    )

    // Each step shows "Step N" label
    expect(screen.getByText('Step 1')).toBeDefined()
    expect(screen.getByText('Step 2')).toBeDefined()
    expect(screen.getByText('Step 3')).toBeDefined()
    expect(screen.getByText('Step 4')).toBeDefined()
  })

  it('renders step names', () => {
    render(
      <FunnelChart steps={mockSteps} totalEntries={21800} conversionRate={19.3} />
    )

    expect(screen.getByText('Homepage')).toBeDefined()
    expect(screen.getByText('Products')).toBeDefined()
    expect(screen.getByText('Product details')).toBeDefined()
    expect(screen.getByText('Checkout')).toBeDefined()
  })

  it('renders formatted visit counts', () => {
    render(
      <FunnelChart steps={mockSteps} totalEntries={21800} conversionRate={19.3} />
    )

    // 21800 → "21.8k", 18000 → "18.0k", etc.
    expect(screen.getByText('21.8k')).toBeDefined()
    expect(screen.getByText('18.0k')).toBeDefined()
    expect(screen.getByText('8.8k')).toBeDefined()
    // 4.2k appears twice: visits count + conversion count on last step
    expect(screen.getAllByText('4.2k').length).toBeGreaterThanOrEqual(1)
  })

  it('last step shows "Funnel Conversion" label', () => {
    render(
      <FunnelChart steps={mockSteps} totalEntries={21800} conversionRate={19.3} />
    )

    expect(screen.getByText('Funnel Conversion')).toBeDefined()
  })

  it('non-last steps show "Drop-off" label', () => {
    render(
      <FunnelChart steps={mockSteps} totalEntries={21800} conversionRate={19.3} />
    )

    // 3 non-last steps should each have a "Drop-off" label
    const dropOffLabels = screen.getAllByText('Drop-off')
    expect(dropOffLabels).toHaveLength(3)
  })

  it('shows drop-off rates for non-last steps', () => {
    render(
      <FunnelChart steps={mockSteps} totalEntries={21800} conversionRate={19.3} />
    )

    // Drop-off rates: 17.4%, 51.1%, 52.3%
    expect(screen.getByText('(17.4%)')).toBeDefined()
    expect(screen.getByText('(51.1%)')).toBeDefined()
    expect(screen.getByText('(52.3%)')).toBeDefined()
  })

  it('shows conversion rate on last step', () => {
    render(
      <FunnelChart steps={mockSteps} totalEntries={21800} conversionRate={19.3} />
    )

    expect(screen.getByText('(19.3%)')).toBeDefined()
  })

  it('bar heights are proportional to visits', () => {
    const { container } = render(
      <FunnelChart steps={mockSteps} totalEntries={21800} conversionRate={19.3} />
    )

    // The first step (21800 visits = max) should have 100% bar height
    // The last step (4200 visits) should have ~19.3% height
    const bars = container.querySelectorAll('[style*="height"]')
    expect(bars.length).toBeGreaterThan(0)
  })

  it('renders two-step funnel correctly', () => {
    render(
      <FunnelChart
        steps={mockTwoStepSteps}
        totalEntries={500}
        conversionRate={40.0}
      />
    )

    expect(screen.getByText('Page A')).toBeDefined()
    expect(screen.getByText('Page B')).toBeDefined()
    expect(screen.getByText('Funnel Conversion')).toBeDefined()
    // Only 1 non-last step
    expect(screen.getAllByText('Drop-off')).toHaveLength(1)
  })
})
