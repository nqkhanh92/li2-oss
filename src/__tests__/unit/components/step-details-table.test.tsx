import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StepDetailsTable } from '@/ee/features/funnels/components/step-details-table'
import { mockSteps, mockLowDropOffSteps } from '../../__mocks__/funnel-report.mock'

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

describe('StepDetailsTable', () => {
  it('renders table headers', () => {
    render(<StepDetailsTable steps={mockSteps} />)

    expect(screen.getByText('Step')).toBeDefined()
    expect(screen.getByText('Name')).toBeDefined()
    expect(screen.getByText('Visits')).toBeDefined()
    expect(screen.getByText('Entries')).toBeDefined()
    expect(screen.getByText('Proceeds')).toBeDefined()
    expect(screen.getByText('Drop-off')).toBeDefined()
    expect(screen.getByText('Rate')).toBeDefined()
  })

  it('renders a row for each step', () => {
    render(<StepDetailsTable steps={mockSteps} />)

    expect(screen.getByText('Homepage')).toBeDefined()
    expect(screen.getByText('Products')).toBeDefined()
    expect(screen.getByText('Product details')).toBeDefined()
    expect(screen.getByText('Checkout')).toBeDefined()
  })

  it('shows formatted visit counts', () => {
    render(<StepDetailsTable steps={mockSteps} />)

    // 21.8k appears in both visits and entries columns for step 1
    expect(screen.getAllByText('21.8k').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('18.0k').length).toBeGreaterThanOrEqual(1)
  })

  it('shows em-dash for last step proceeds, drop-off, and rate', () => {
    render(<StepDetailsTable steps={mockSteps} />)

    // Last step (Checkout) should have em-dashes for proceeds, drop-offs, and rate
    const dashes = screen.getAllByText('—')
    // Last step has 3 dashes (proceeds, drop-off, rate) + entries with 0 might show dash
    expect(dashes.length).toBeGreaterThanOrEqual(3)
  })

  it('shows drop-off rate percentages for non-last steps', () => {
    render(<StepDetailsTable steps={mockSteps} />)

    expect(screen.getByText('17.4%')).toBeDefined()
    expect(screen.getByText('51.1%')).toBeDefined()
    expect(screen.getByText('52.3%')).toBeDefined()
  })

  it('applies green color for low drop-off rates', () => {
    const { container } = render(<StepDetailsTable steps={mockLowDropOffSteps} />)

    // Low drop-off rates should have emerald color class
    const greenCells = container.querySelectorAll('.text-emerald-600')
    expect(greenCells.length).toBeGreaterThan(0)
  })

  it('applies red color for high drop-off rates', () => {
    const { container } = render(<StepDetailsTable steps={mockSteps} />)

    // 51.1% and 52.3% are > 40% → red
    const redCells = container.querySelectorAll('.text-red-600')
    expect(redCells.length).toBeGreaterThan(0)
  })

  it('shows step positions', () => {
    render(<StepDetailsTable steps={mockSteps} />)

    // Step position numbers in first column (CSS grid, not a table)
    expect(screen.getByText('1')).toBeDefined()
    expect(screen.getByText('2')).toBeDefined()
    expect(screen.getByText('3')).toBeDefined()
    expect(screen.getByText('4')).toBeDefined()
  })
})
