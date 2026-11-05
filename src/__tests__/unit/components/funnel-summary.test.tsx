import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FunnelSummary } from '@/ee/features/funnels/components/funnel-summary'

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

describe('FunnelSummary', () => {
  it('shows total entries', () => {
    render(
      <FunnelSummary totalEntries={21800} totalConversions={4200} conversionRate={19.3} />
    )

    expect(screen.getByText('Total Entries')).toBeDefined()
    expect(screen.getByText('21.8k')).toBeDefined()
  })

  it('shows conversions', () => {
    render(
      <FunnelSummary totalEntries={21800} totalConversions={4200} conversionRate={19.3} />
    )

    expect(screen.getByText('Conversions')).toBeDefined()
    expect(screen.getByText('4.2k')).toBeDefined()
  })

  it('shows conversion rate', () => {
    render(
      <FunnelSummary totalEntries={21800} totalConversions={4200} conversionRate={19.3} />
    )

    expect(screen.getByText('Conversion Rate')).toBeDefined()
    expect(screen.getByText('19.3%')).toBeDefined()
  })

  it('renders three summary cards', () => {
    const { container } = render(
      <FunnelSummary totalEntries={1000} totalConversions={100} conversionRate={10.0} />
    )

    // Grid should contain 3 cards
    const cards = container.querySelectorAll('[class*="card"]')
    expect(cards.length).toBeGreaterThanOrEqual(3)
  })

  it('formats small numbers without abbreviation', () => {
    render(
      <FunnelSummary totalEntries={500} totalConversions={42} conversionRate={8.4} />
    )

    expect(screen.getByText('500')).toBeDefined()
    expect(screen.getByText('42')).toBeDefined()
    expect(screen.getByText('8.4%')).toBeDefined()
  })

  it('formats millions with M suffix', () => {
    render(
      <FunnelSummary totalEntries={2500000} totalConversions={500000} conversionRate={20.0} />
    )

    expect(screen.getByText('2.5M')).toBeDefined()
    expect(screen.getByText('500.0k')).toBeDefined()
  })

  it('handles zero values', () => {
    render(
      <FunnelSummary totalEntries={0} totalConversions={0} conversionRate={0} />
    )

    expect(screen.getByText('0.0%')).toBeDefined()
  })
})
